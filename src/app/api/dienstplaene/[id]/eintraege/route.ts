import { auth } from "@/lib/auth";
import { store, newId } from "@/lib/store";
import type { ScheduleEntry, Schedule } from "@/lib/store";
import { NextResponse } from "next/server";
import { createAuditLog, createNotificationForAll } from "@/lib/server-utils";
import { isValidDate, isValidShift, isUserInFiliale } from "@/lib/authorization";
import { getISOWeek, getISOWeekYear } from "date-fns";

function validEntryForSchedule(
  schedule: Schedule,
  entry: { userId: unknown; datum: unknown; startZeit: unknown; endZeit: unknown; pausen: unknown }
): boolean {
  if (typeof entry.userId !== "string" || !isUserInFiliale(entry.userId, schedule.filialeId) ||
      !isValidDate(entry.datum) || !isValidShift(entry.startZeit, entry.endZeit, entry.pausen)) {
    return false;
  }
  const date = new Date(entry.datum);
  return getISOWeek(date) === schedule.kalenderwoche && getISOWeekYear(date) === schedule.jahr;
}

function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && startB < endA;
}

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

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  const pause = body.pausen ?? 0;
  if (!validEntryForSchedule(schedule, {
    userId: body.userId,
    datum: body.datum,
    startZeit: body.startZeit,
    endZeit: body.endZeit,
    pausen: pause,
  })) {
    return NextResponse.json({ error: "Ungültiger Dienstplaneintrag oder Mitarbeiter gehört nicht zu dieser Filiale" }, { status: 400 });
  }
  const startZeit = body.startZeit as string;
  const endZeit = body.endZeit as string;
  const datum = new Date(body.datum as string);
  const conflict = store.scheduleEntries.some((existing) =>
    existing.scheduleId === scheduleId && existing.userId === (body.userId as string) &&
    existing.datum.toDateString() === datum.toDateString() &&
    overlaps(startZeit, endZeit, existing.startZeit, existing.endZeit)
  );
  if (conflict) return NextResponse.json({ error: "Dienstzeiten überschneiden sich" }, { status: 409 });
  const t = new Date();
  const entry: ScheduleEntry = {
    id: newId(),
    scheduleId,
    userId: body.userId as string,
    datum,
    startZeit,
    endZeit,
    pausen: pause as number,
    notiz: typeof body.notiz === "string" ? body.notiz.slice(0, 500) : null,
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
    createNotificationForAll([entry.userId], {
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

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  const candidate = {
    userId: body.userId ?? entry.userId,
    datum: body.datum ?? entry.datum.toISOString(),
    startZeit: body.startZeit ?? entry.startZeit,
    endZeit: body.endZeit ?? entry.endZeit,
    pausen: body.pausen ?? entry.pausen,
  };
  if (!validEntryForSchedule(schedule, candidate)) {
    return NextResponse.json({ error: "Ungültiger Dienstplaneintrag oder Mitarbeiter gehört nicht zu dieser Filiale" }, { status: 400 });
  }
  const nextDate = new Date(candidate.datum as string);
  const nextStart = candidate.startZeit as string;
  const nextEnd = candidate.endZeit as string;
  const nextUserId = candidate.userId as string;
  const conflict = store.scheduleEntries.some((existing) =>
    existing.id !== entry.id && existing.scheduleId === scheduleId && existing.userId === nextUserId &&
    existing.datum.toDateString() === nextDate.toDateString() &&
    overlaps(nextStart, nextEnd, existing.startZeit, existing.endZeit)
  );
  if (conflict) return NextResponse.json({ error: "Dienstzeiten überschneiden sich" }, { status: 409 });
  const wasFreigegeben = schedule.status === "FREIGEGEBEN";

  entry.userId = nextUserId;
  entry.datum = nextDate;
  entry.startZeit = nextStart;
  entry.endZeit = nextEnd;
  entry.pausen = candidate.pausen as number;
  entry.notiz = typeof body.notiz === "string" ? body.notiz.slice(0, 500) : entry.notiz;
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

  let body: Array<{
    id?: string; userId: string; datum: string; startZeit: string; endZeit: string; pausen?: number; notiz?: string;
  }>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  if (!Array.isArray(body) || body.length > 500 || !body.every((entry) =>
    validEntryForSchedule(schedule, { ...entry, pausen: entry.pausen ?? 0 })
  )) {
    return NextResponse.json({ error: "Mindestens ein Dienstplaneintrag ist ungültig" }, { status: 400 });
  }
  const oldEntries = store.scheduleEntries.filter((e) => e.scheduleId === scheduleId);
  const normalized = body.map((entry) => ({
    userId: entry.userId, datum: new Date(entry.datum), startZeit: entry.startZeit, endZeit: entry.endZeit,
  }));
  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      if (normalized[i].userId === normalized[j].userId &&
          normalized[i].datum.toDateString() === normalized[j].datum.toDateString() &&
          overlaps(normalized[i].startZeit, normalized[i].endZeit, normalized[j].startZeit, normalized[j].endZeit)) {
        return NextResponse.json({ error: "Dienstzeiten überschneiden sich" }, { status: 409 });
      }
    }
  }
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
