import { auth } from "@/lib/auth";
import { store } from "@/lib/store";
import { NextResponse } from "next/server";
import { berechneStunden } from "@/lib/utils";
import { canManageUser } from "@/lib/authorization";
import { startOfISOWeek, endOfISOWeek, eachDayOfInterval, isWithinInterval } from "date-fns";

function getWeekBounds(kw: number, jahr: number) {
  const jan4 = new Date(jahr, 0, 4);
  const weekStart = startOfISOWeek(jan4);
  weekStart.setDate(weekStart.getDate() + (kw - 1) * 7);
  return { start: weekStart, end: endOfISOWeek(weekStart) };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const requestedUserId = searchParams.get("userId");
  const userId = requestedUserId ?? session.user.id;
  if (!canManageUser(session.user.id, session.user.role, userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const kwValue = searchParams.get("kw");
  const monatValue = searchParams.get("monat");
  const jahr = Number(searchParams.get("jahr") ?? new Date().getFullYear());
  const kw = kwValue === null ? null : Number(kwValue);
  const monat = monatValue === null ? null : Number(monatValue);

  if (!Number.isInteger(jahr) || jahr < 2000 || jahr > 2100 ||
      (kw !== null && (!Number.isInteger(kw) || kw < 1 || kw > 53)) ||
      (monat !== null && (!Number.isInteger(monat) || monat < 1 || monat > 12)) ||
      (kw !== null && monat !== null)) {
    return NextResponse.json({ error: "Ungültiger Zeitraum" }, { status: 400 });
  }

  const validStatuses = ["FREIGEGEBEN", "NACHTRAEGLICH_GEAENDERT"];
  const visibleEntries = () => store.scheduleEntries.filter((entry) => {
    const schedule = store.schedules.find((item) => item.id === entry.scheduleId);
    return entry.userId === userId && schedule !== undefined && validStatuses.includes(schedule.status);
  });

  let entries = visibleEntries();
  if (kw !== null) {
    const { start, end } = getWeekBounds(kw, jahr);
    entries = entries.filter((entry) => entry.datum >= start && entry.datum <= end);
  } else if (monat !== null) {
    const start = new Date(jahr, monat - 1, 1);
    const end = new Date(jahr, monat, 0, 23, 59, 59, 999);
    entries = entries.filter((entry) => entry.datum >= start && entry.datum <= end);
  } else {
    entries = entries.sort((a, b) => b.datum.getTime() - a.datum.getTime()).slice(0, 100);
  }

  entries = entries
    .map((entry) => {
      const schedule = store.schedules.find((item) => item.id === entry.scheduleId)!;
      const filiale = store.filialen.find((item) => item.id === schedule.filialeId);
      return { ...entry, schedule: { ...schedule, filiale: { name: filiale?.name ?? "" } } };
    })
    .sort((a, b) => a.datum.getTime() - b.datum.getTime());

  const contract = store.contracts.find((item) => item.userId === userId);
  const sollStunden = contract?.sollStunden ?? 38.5;
  let sollStundenImZeitraum = sollStunden;
  const gesamtStunden = entries.reduce(
    (sum, entry) => sum + berechneStunden(entry.startZeit, entry.endZeit, entry.pausen), 0
  );

  let sickDays = 0;
  let vacationDays = 0;
  if (kw !== null) {
    const { start, end } = getWeekBounds(kw, jahr);
    const sick = store.sickLeaves.filter(
      (item) => item.userId === userId && item.typ === "MIT_KRANKSCHEIN" &&
        item.startDatum <= end && item.endDatum >= start
    );
    const vacation = store.vacationRequests.filter(
      (item) => item.userId === userId && item.status === "GENEHMIGT" &&
        item.startDatum <= end && item.endDatum >= start
    );
    const weekDays = eachDayOfInterval({ start, end }).filter(
      (day) => day.getDay() !== 0 && day.getDay() !== 6
    );
    sickDays = weekDays.filter((day) =>
      sick.some((item) => isWithinInterval(day, { start: item.startDatum, end: item.endDatum }))
    ).length;
    vacationDays = weekDays.filter((day) =>
      vacation.some((item) => isWithinInterval(day, { start: item.startDatum, end: item.endDatum }))
    ).length;
    const absentDays = weekDays.filter((day) =>
      sick.some((item) => isWithinInterval(day, { start: item.startDatum, end: item.endDatum })) ||
      vacation.some((item) => isWithinInterval(day, { start: item.startDatum, end: item.endDatum }))
    ).length;
    sollStundenImZeitraum = Math.max(0, sollStunden - absentDays * (sollStunden / 5));
  } else if (monat !== null) {
    const start = new Date(jahr, monat - 1, 1);
    const end = new Date(jahr, monat, 0);
    const monthDays = eachDayOfInterval({ start, end }).filter(
      (day) => day.getDay() !== 0 && day.getDay() !== 6
    );
    const sick = store.sickLeaves.filter(
      (item) => item.userId === userId && item.typ === "MIT_KRANKSCHEIN" &&
        item.startDatum <= end && item.endDatum >= start
    );
    const vacation = store.vacationRequests.filter(
      (item) => item.userId === userId && item.status === "GENEHMIGT" &&
        item.startDatum <= end && item.endDatum >= start
    );
    sickDays = monthDays.filter((day) =>
      sick.some((item) => isWithinInterval(day, { start: item.startDatum, end: item.endDatum }))
    ).length;
    vacationDays = monthDays.filter((day) =>
      vacation.some((item) => isWithinInterval(day, { start: item.startDatum, end: item.endDatum }))
    ).length;
    const absentDays = monthDays.filter((day) =>
      sick.some((item) => isWithinInterval(day, { start: item.startDatum, end: item.endDatum })) ||
      vacation.some((item) => isWithinInterval(day, { start: item.startDatum, end: item.endDatum }))
    ).length;
    sollStundenImZeitraum = Math.max(0, sollStunden * monthDays.length / 5 - absentDays * (sollStunden / 5));
  }

  const effektivSollStunden = sollStundenImZeitraum;
  const differenz = gesamtStunden - effektivSollStunden;

  return NextResponse.json({
    entries,
    gesamtStunden: Math.round(gesamtStunden * 100) / 100,
    sollStunden: effektivSollStunden,
    differenz: Math.round(differenz * 100) / 100,
    uberstunden: differenz > 0 ? Math.round(differenz * 100) / 100 : 0,
    minusstunden: differenz < 0 ? Math.round(Math.abs(differenz) * 100) / 100 : 0,
    sickDays,
    vacationDays,
  });
}
