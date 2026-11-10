import { auth } from "@/lib/auth";
import { store, type ScheduleStatus } from "@/lib/store";
import { NextResponse } from "next/server";
import { createAuditLog, createNotificationForAll } from "@/lib/server-utils";
import { canManageFiliale, isUserInFiliale } from "@/lib/authorization";

function isScheduleStatus(value: unknown): value is ScheduleStatus {
  return value === "ENTWURF" || value === "EINGEREICHT" || value === "FREIGEGEBEN" || value === "NACHTRAEGLICH_GEAENDERT";
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const schedule = store.schedules.find((s) => s.id === id);
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isChef = session.user.role === "CHEF";
  const isManager = canManageFiliale(session.user.id, session.user.role, schedule.filialeId);
  const isEmployee = session.user.role === "MITARBEITER" &&
    isUserInFiliale(session.user.id, schedule.filialeId) && schedule.status === "FREIGEGEBEN";
  if (!isChef && !isManager && !isEmployee) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const filiale = store.filialen.find((f) => f.id === schedule.filialeId) ?? null;
  const entries = store.scheduleEntries
    .filter((e) => e.scheduleId === id && (isChef || isManager || e.userId === session.user.id))
    .map((e) => {
      const user = store.users.find((u) => u.id === e.userId);
      return { ...e, user: { id: e.userId, name: user?.name ?? "" } };
    })
    .sort((a, b) => a.datum.getTime() - b.datum.getTime() || a.startZeit.localeCompare(b.startZeit));

  const auditLogs = (isChef || isManager ? store.auditLogs : [])
    .filter((l) => l.scheduleId === id)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 50)
    .map((l) => {
      const user = store.users.find((u) => u.id === l.userId);
      return { ...l, user: { id: l.userId, name: user?.name ?? "" } };
    });

  return NextResponse.json({ ...schedule, filiale, entries, auditLogs });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["CHEF", "FILIALLEITER"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const schedule = store.schedules.find((s) => s.id === id);
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canManageFiliale(session.user.id, session.user.role, schedule.filialeId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  if (body.status !== undefined && !isScheduleStatus(body.status)) {
    return NextResponse.json({ error: "Ungültiger Dienstplanstatus" }, { status: 400 });
  }
  if (body.begruendung !== undefined && (typeof body.begruendung !== "string" || body.begruendung.length > 1000)) {
    return NextResponse.json({ error: "Ungültige Begründung" }, { status: 400 });
  }
  const old = { ...schedule };
  const wasFreigegeben = schedule.status === "FREIGEGEBEN";
  const newStatus: ScheduleStatus = body.status === undefined ? schedule.status : body.status;

  schedule.status = newStatus;
  if (newStatus === "FREIGEGEBEN") {
    schedule.freigegebenAt = new Date();
    schedule.freigegebenVon = session.user.id;
  }
  schedule.updatedAt = new Date();

  const aktion = wasFreigegeben
    ? "NACHTRAEGLICHE_AENDERUNG"
    : newStatus === "FREIGEGEBEN"
    ? "FREIGEGEBEN"
    : newStatus === "EINGEREICHT"
    ? "EINGEREICHT"
    : "AKTUALISIERT";

  createAuditLog({
    userId: session.user.id,
    scheduleId: id,
    aktion,
    tabelle: "Schedule",
    datensatzId: id,
    alterWert: old,
    neuerWert: { ...schedule },
    begruendung: body.begruendung as string | undefined,
  });

  if (newStatus === "FREIGEGEBEN") {
    const userIds = [
      ...new Set(
        store.scheduleEntries.filter((e) => e.scheduleId === id).map((e) => e.userId)
      ),
    ];
    const filiale = store.filialen.find((f) => f.id === schedule.filialeId);
    createNotificationForAll(userIds, {
      typ: "DIENSTPLAN_FREIGEGEBEN",
      titel: "Dienstplan freigegeben",
      nachricht: `Dienstplan KW${schedule.kalenderwoche}/${schedule.jahr} (${filiale?.name ?? ""}) wurde freigegeben.`,
    });
  }

  const filiale = store.filialen.find((f) => f.id === schedule.filialeId) ?? null;
  return NextResponse.json({ ...schedule, filiale });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "CHEF")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const idx = store.schedules.findIndex((s) => s.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  store.schedules.splice(idx, 1);
  store.scheduleEntries = store.scheduleEntries.filter((e) => e.scheduleId !== id);
  return NextResponse.json({ ok: true });
}
