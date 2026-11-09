import { auth } from "@/lib/auth";
import { store, newId } from "@/lib/store";
import type { VacationRequest } from "@/lib/store";
import { NextResponse } from "next/server";
import { createNotification } from "@/lib/server-utils";
import { canManageUser, isValidDateRange } from "@/lib/authorization";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let urlaube = store.vacationRequests;
  if (session.user.role === "MITARBEITER") {
    urlaube = urlaube.filter((request) => request.userId === session.user.id);
  } else if (session.user.role === "FILIALLEITER") {
    urlaube = urlaube.filter((request) =>
      canManageUser(session.user.id, session.user.role, request.userId)
    );
  }

  const result = [...urlaube]
    .sort((a, b) => b.startDatum.getTime() - a.startDatum.getTime())
    .map((request) => ({
      ...request,
      user: {
        id: request.userId,
        name: store.users.find((user) => user.id === request.userId)?.name ?? "",
      },
    }));
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const targetUserId = session.user.role === "CHEF" || session.user.role === "FILIALLEITER"
    ? (typeof body.userId === "string" ? body.userId : session.user.id)
    : session.user.id;

  if (!canManageUser(session.user.id, session.user.role, targetUserId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isValidDateRange(body.startDatum, body.endDatum)) {
    return NextResponse.json({ error: "Ungültiger Urlaubszeitraum" }, { status: 400 });
  }
  if (!store.users.some((user) => user.id === targetUserId && user.aktiv)) {
    return NextResponse.json({ error: "Mitarbeiter nicht gefunden" }, { status: 404 });
  }

  const start = new Date(body.startDatum);
  const end = new Date(body.endDatum);
  const overlaps = store.vacationRequests.some((request) =>
    request.userId === targetUserId &&
    request.status !== "ABGELEHNT" &&
    request.startDatum <= end && request.endDatum >= start
  );
  if (overlaps) {
    return NextResponse.json({ error: "Für diesen Zeitraum existiert bereits ein Urlaubsantrag" }, { status: 409 });
  }

  const t = new Date();
  const urlaub: VacationRequest = {
    id: newId(),
    userId: targetUserId,
    startDatum: start,
    endDatum: end,
    status: "BEANTRAGT",
    genehmigtVon: null,
    notiz: typeof body.notiz === "string" ? body.notiz.slice(0, 1000) : null,
    createdAt: t,
    updatedAt: t,
  };
  store.vacationRequests.push(urlaub);

  const userName = store.users.find((user) => user.id === targetUserId)?.name ?? "";
  for (const chef of store.users.filter((user) => user.role === "CHEF" && user.aktiv)) {
    createNotification(chef.id, {
      typ: "URLAUB_BEANTRAGT",
      titel: "Urlaubsantrag",
      nachricht: `${userName} hat Urlaub beantragt.`,
    });
  }

  return NextResponse.json(
    { ...urlaub, user: { id: targetUserId, name: userName } },
    { status: 201 }
  );
}

export async function PATCH(req: Request) {
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

  const id = typeof body.id === "string" ? body.id : "";
  const status = body.status;
  if (status !== "GENEHMIGT" && status !== "ABGELEHNT") {
    return NextResponse.json({ error: "Ungültiger Status" }, { status: 400 });
  }

  const urlaub = store.vacationRequests.find((request) => request.id === id);
  if (!urlaub) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageUser(session.user.id, session.user.role, urlaub.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (urlaub.status !== "BEANTRAGT") {
    return NextResponse.json({ error: "Dieser Antrag wurde bereits bearbeitet" }, { status: 409 });
  }

  urlaub.status = status;
  urlaub.genehmigtVon = session.user.id;
  urlaub.updatedAt = new Date();

  createNotification(urlaub.userId, {
    typ: status === "GENEHMIGT" ? "URLAUB_GENEHMIGT" : "URLAUB_ABGELEHNT",
    titel: status === "GENEHMIGT" ? "Urlaub genehmigt" : "Urlaub abgelehnt",
    nachricht: `Ihr Urlaubsantrag wurde ${status === "GENEHMIGT" ? "genehmigt" : "abgelehnt"}.`,
  });

  const userName = store.users.find((user) => user.id === urlaub.userId)?.name ?? "";
  return NextResponse.json({ ...urlaub, user: { id: urlaub.userId, name: userName } });
}
