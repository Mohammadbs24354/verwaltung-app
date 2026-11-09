import { auth } from "@/lib/auth";
import { store, newId } from "@/lib/store";
import type { SickLeave } from "@/lib/store";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/server-utils";
import { canManageUser, isValidDateRange } from "@/lib/authorization";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const requestedUserId = searchParams.get("userId");
  let meldungen = store.sickLeaves;

  if (session.user.role === "MITARBEITER") {
    meldungen = meldungen.filter((item) => item.userId === session.user.id);
  } else if (session.user.role === "FILIALLEITER") {
    meldungen = meldungen.filter((item) =>
      canManageUser(session.user.id, session.user.role, item.userId)
    );
  }
  if (requestedUserId) {
    if (!canManageUser(session.user.id, session.user.role, requestedUserId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    meldungen = meldungen.filter((item) => item.userId === requestedUserId);
  }

  const result = [...meldungen]
    .sort((a, b) => b.startDatum.getTime() - a.startDatum.getTime())
    .map((item) => ({
      ...item,
      user: { id: item.userId, name: store.users.find((user) => user.id === item.userId)?.name ?? "" },
    }));
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !["CHEF", "FILIALLEITER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!userId || !canManageUser(session.user.id, session.user.role, userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isValidDateRange(body.startDatum, body.endDatum) ||
      (body.typ !== "MIT_KRANKSCHEIN" && body.typ !== "OHNE_KRANKSCHEIN")) {
    return NextResponse.json({ error: "Ungültige Krankmeldung" }, { status: 400 });
  }
  if (!store.users.some((user) => user.id === userId && user.aktiv)) {
    return NextResponse.json({ error: "Mitarbeiter nicht gefunden" }, { status: 404 });
  }

  const t = new Date();
  const meldung: SickLeave = {
    id: newId(),
    userId,
    startDatum: new Date(body.startDatum),
    endDatum: new Date(body.endDatum),
    typ: body.typ,
    notiz: typeof body.notiz === "string" ? body.notiz.slice(0, 1000) : null,
    erstelltVon: session.user.id,
    createdAt: t,
    updatedAt: t,
  };
  store.sickLeaves.push(meldung);

  createAuditLog({
    userId: session.user.id,
    aktion: "KRANKMELDUNG_ERSTELLT",
    tabelle: "SickLeave",
    datensatzId: meldung.id,
    neuerWert: meldung,
  });

  const user = store.users.find((item) => item.id === userId);
  return NextResponse.json(
    { ...meldung, user: { id: userId, name: user?.name ?? "" } },
    { status: 201 }
  );
}
