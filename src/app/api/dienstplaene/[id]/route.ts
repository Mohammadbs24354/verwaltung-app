import { auth } from "@/lib/auth";
import { store } from "@/lib/store";
import { NextResponse } from "next/server";
import { createAuditLog, createNotificationForAll } from "@/lib/server-utils";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const schedule = store.schedules.find((s) => s.id === id);
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filiale = store.filialen.find((f) => f.id === schedule.filialeId) ?? null;
  const entries = store.scheduleEntries
    .filter((e) => e.scheduleId === id)
    .map((e) => {
      const user = store.users.find((u) => u.id === e.userId);
      return { ...e, user: { id: e.userId, name: user?.name ?? "" } };
    })
    .sort((a, b) => a.datum.getTime() - b.datum.getTime() || a.startZeit.localeCompare(b.startZeit));

  const auditLogs = store.auditLogs
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

  const body = await req.json();
  const old = { ...schedule };
  const wasFreigegeben = schedule.status === "FREIGEGEBEN";
  const newStatus = body.status ?? schedule.status;

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
    begruendung: body.begruendung,
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
  if (idx !== -1) store.schedules.splice(idx, 1);
  store.scheduleEntries = store.scheduleEntries.filter((e) => e.scheduleId !== id);
  return NextResponse.json({ ok: true });
}
