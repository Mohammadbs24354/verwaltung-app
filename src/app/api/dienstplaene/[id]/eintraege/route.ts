import { auth } from "@/lib/auth";
import { store, newId } from "@/lib/store";
import type { ScheduleEntry, Schedule } from "@/lib/store";
import { NextResponse } from "next/server";
import { createAuditLog, createNotificationForAll } from "@/lib/server-utils";

function canEdit(userId: string, role: string, schedule: Schedule): boolean {
  if (role === "CHEF") return true;
  if (role === "FILIALLEITER") {
    return store.userFilialen.some(
      (uf) => uf.userId === userId && uf.filialeId === schedule.filialeId && uf.isLeiter
    );
  }
  return false;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["CHEF", "FILIALLEITER"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: scheduleId } = await params;

  const schedule = store.schedules.find((s) => s.id === scheduleId);
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canEdit(session.user.id, session.user.role, schedule))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const t = new Date();
  const entry: ScheduleEntry = {
    id: newId(),
    scheduleId,
    userId: body.userId,
    datum: new Date(body.datum),
    startZeit: body.startZeit,
    endZeit: body.endZeit,
    pausen: body.pausen ?? 0,
    notiz: body.notiz ?? null,
    createdAt: t,
    updatedAt: t,
  };
  store.scheduleEntries.push(entry);

  const wasFreigegeben = schedule.status === "FREIGEGEBEN";
  if (wasFreigegeben) {
    schedule.status = "NACHTRAEGLICH_GEAENDERT";
    schedule.updatedAt = new Date();
    createAuditLog({
      userId: session.user.id,
      scheduleId,
      aktion: "EINTRAG_HINZUGEFUEGT",
      tabelle: "ScheduleEntry",
      datensatzId: entry.id,
      neuerWert: entry,
    });
    createNotificationForAll([body.userId], {
      typ: "DIENSTPLAN_GEAENDERT",
      titel: "Dienstplan geändert",
      nachricht: `Ihr Dienstplan KW${schedule.kalenderwoche}/${schedule.jahr} wurde geändert.`,
    });
  }

  const user = store.users.find((u) => u.id === entry.userId);
  return NextResponse.json({ ...entry, user: { id: entry.userId, name: user?.name ?? "" } }, { status: 201 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["CHEF", "FILIALLEITER"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: scheduleId } = await params;

  const schedule = store.schedules.find((s) => s.id === scheduleId);
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canEdit(session.user.id, session.user.role, schedule))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const entryId = searchParams.get("entryId");
  const entry = store.scheduleEntries.find((e) => e.id === entryId && e.scheduleId === scheduleId);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const wasFreigegeben = schedule.status === "FREIGEGEBEN";

  entry.userId = body.userId ?? entry.userId;
  entry.datum = body.datum ? new Date(body.datum) : entry.datum;
  entry.startZeit = body.startZeit ?? entry.startZeit;
  entry.endZeit = body.endZeit ?? entry.endZeit;
  entry.pausen = body.pausen ?? entry.pausen;
  entry.notiz = body.notiz ?? entry.notiz;
  entry.updatedAt = new Date();

  if (wasFreigegeben) {
    schedule.status = "NACHTRAEGLICH_GEAENDERT";
    schedule.updatedAt = new Date();
  }

  createAuditLog({
    userId: session.user.id,
    scheduleId,
    aktion: wasFreigegeben ? "NACHTRAEGLICHE_AENDERUNG" : "EINTRAG_GEAENDERT",
    tabelle: "ScheduleEntry",
    datensatzId: entry.id,
    neuerWert: entry,
  });

  const user = store.users.find((u) => u.id === entry.userId);
  return NextResponse.json({ ...entry, user: { id: entry.userId, name: user?.name ?? "" } });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["CHEF", "FILIALLEITER"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: scheduleId } = await params;

  const schedule = store.schedules.find((s) => s.id === scheduleId);
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canEdit(session.user.id, session.user.role, schedule))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const entryId = searchParams.get("entryId");
  const idx = store.scheduleEntries.findIndex((e) => e.id === entryId && e.scheduleId === scheduleId);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [deleted] = store.scheduleEntries.splice(idx, 1);
  const wasFreigegeben = schedule.status === "FREIGEGEBEN";

  if (wasFreigegeben) {
    schedule.status = "NACHTRAEGLICH_GEAENDERT";
    schedule.updatedAt = new Date();
  }

  createAuditLog({
    userId: session.user.id,
    scheduleId,
    aktion: wasFreigegeben ? "NACHTRAEGLICHE_AENDERUNG" : "EINTRAG_GELOESCHT",
    tabelle: "ScheduleEntry",
    datensatzId: deleted.id,
    alterWert: deleted,
  });

  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["CHEF", "FILIALLEITER"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: scheduleId } = await params;

  const schedule = store.schedules.find((s) => s.id === scheduleId);
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canEdit(session.user.id, session.user.role, schedule))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json() as Array<{
    id?: string; userId: string; datum: string; startZeit: string; endZeit: string; pausen?: number; notiz?: string;
  }>;

  const oldEntries = store.scheduleEntries.filter((e) => e.scheduleId === scheduleId);
  store.scheduleEntries = store.scheduleEntries.filter((e) => e.scheduleId !== scheduleId);

  const t = new Date();
  const newEntries: ScheduleEntry[] = body.map((e) => ({
    id: newId(),
    scheduleId,
    userId: e.userId,
    datum: new Date(e.datum),
    startZeit: e.startZeit,
    endZeit: e.endZeit,
    pausen: e.pausen ?? 0,
    notiz: e.notiz ?? null,
    createdAt: t,
    updatedAt: t,
  }));
  store.scheduleEntries.push(...newEntries);

  const wasFreigegeben = schedule.status === "FREIGEGEBEN";
  if (wasFreigegeben) {
    schedule.status = "NACHTRAEGLICH_GEAENDERT";
    schedule.updatedAt = new Date();
  }

  createAuditLog({
    userId: session.user.id,
    scheduleId,
    aktion: wasFreigegeben ? "NACHTRAEGLICHE_AENDERUNG" : "EINTRAEGE_AKTUALISIERT",
    tabelle: "ScheduleEntry",
    datensatzId: scheduleId,
    alterWert: oldEntries,
    neuerWert: body,
  });

  return NextResponse.json({ count: newEntries.length });
}
