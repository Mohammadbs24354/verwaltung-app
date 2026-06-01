import { auth } from "@/lib/auth";
import { store, newId } from "@/lib/store";
import type { SickLeave } from "@/lib/store";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/server-utils";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  let meldungen = store.sickLeaves;

  if (session.user.role === "MITARBEITER") {
    meldungen = meldungen.filter((m) => m.userId === session.user.id);
  } else if (session.user.role === "FILIALLEITER") {
    const filialeIds = store.userFilialen
      .filter((uf) => uf.userId === session.user.id && uf.isLeiter)
      .map((uf) => uf.filialeId);
    const mitarbeiterIds = store.userFilialen
      .filter((uf) => filialeIds.includes(uf.filialeId))
      .map((uf) => uf.userId);
    meldungen = meldungen.filter((m) => mitarbeiterIds.includes(m.userId));
  } else if (userId) {
    meldungen = meldungen.filter((m) => m.userId === userId);
  }

  const result = meldungen
    .sort((a, b) => b.startDatum.getTime() - a.startDatum.getTime())
    .map((m) => ({
      ...m,
      user: { id: m.userId, name: store.users.find((u) => u.id === m.userId)?.name ?? "" },
    }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !["CHEF", "FILIALLEITER"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const t = new Date();
  const meldung: SickLeave = {
    id: newId(),
    userId: body.userId,
    startDatum: new Date(body.startDatum),
    endDatum: new Date(body.endDatum),
    typ: body.typ,
    notiz: body.notiz ?? null,
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

  const user = store.users.find((u) => u.id === meldung.userId);
  return NextResponse.json(
    { ...meldung, user: { id: meldung.userId, name: user?.name ?? "" } },
    { status: 201 }
  );
}
