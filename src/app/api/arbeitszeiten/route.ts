import { auth } from "@/lib/auth";
import { store } from "@/lib/store";
import { NextResponse } from "next/server";
import { berechneStunden } from "@/lib/utils";
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
  const userId = searchParams.get("userId") ?? session.user.id;
  const kw = searchParams.get("kw");
  const jahr = searchParams.get("jahr") ?? new Date().getFullYear().toString();
  const monat = searchParams.get("monat");

  const validStatuses = ["FREIGEGEBEN", "NACHTRAEGLICH_GEAENDERT"];

  let entries;
  if (kw) {
    const { start, end } = getWeekBounds(parseInt(kw), parseInt(jahr));
    entries = store.scheduleEntries
      .filter((e) => {
        const sched = store.schedules.find((s) => s.id === e.scheduleId);
        return (
          e.userId === userId &&
          e.datum >= start &&
          e.datum <= end &&
          sched != null &&
          validStatuses.includes(sched.status)
        );
      })
      .map((e) => {
        const sched = store.schedules.find((s) => s.id === e.scheduleId)!;
        const filiale = store.filialen.find((f) => f.id === sched.filialeId);
        return { ...e, schedule: { ...sched, filiale: { name: filiale?.name ?? "" } } };
      })
      .sort((a, b) => a.datum.getTime() - b.datum.getTime());
  } else if (monat) {
    const m = parseInt(monat) - 1;
    const j = parseInt(jahr);
    const start = new Date(j, m, 1);
    const end = new Date(j, m + 1, 0);
    entries = store.scheduleEntries
      .filter((e) => {
        const sched = store.schedules.find((s) => s.id === e.scheduleId);
        return (
          e.userId === userId &&
          e.datum >= start &&
          e.datum <= end &&
          sched != null &&
          validStatuses.includes(sched.status)
        );
      })
      .map((e) => {
        const sched = store.schedules.find((s) => s.id === e.scheduleId)!;
        const filiale = store.filialen.find((f) => f.id === sched.filialeId);
        return { ...e, schedule: { ...sched, filiale: { name: filiale?.name ?? "" } } };
      })
      .sort((a, b) => a.datum.getTime() - b.datum.getTime());
  } else {
    entries = store.scheduleEntries
      .filter((e) => {
        const sched = store.schedules.find((s) => s.id === e.scheduleId);
        return e.userId === userId && sched != null && validStatuses.includes(sched.status);
      })
      .map((e) => {
        const sched = store.schedules.find((s) => s.id === e.scheduleId)!;
        const filiale = store.filialen.find((f) => f.id === sched.filialeId);
        return { ...e, schedule: { ...sched, filiale: { name: filiale?.name ?? "" } } };
      })
      .sort((a, b) => b.datum.getTime() - a.datum.getTime())
      .slice(0, 100);
  }

  const contract = store.contracts.find((c) => c.userId === userId);
  const sollStunden = contract?.sollStunden ?? 38.5;
  const gesamtStunden = entries.reduce((sum, e) => sum + berechneStunden(e.startZeit, e.endZeit, e.pausen), 0);

  let sickDays = 0;
  let vacationDays = 0;
  if (kw) {
    const { start, end } = getWeekBounds(parseInt(kw), parseInt(jahr));
    const sick = store.sickLeaves.filter(
      (s) => s.userId === userId && s.typ === "MIT_KRANKSCHEIN" && s.startDatum <= end && s.endDatum >= start
    );
    const vacation = store.vacationRequests.filter(
      (v) => v.userId === userId && v.status === "GENEHMIGT" && v.startDatum <= end && v.endDatum >= start
    );
    const weekDays = eachDayOfInterval({ start, end }).filter((d) => d.getDay() !== 0 && d.getDay() !== 6);
    sickDays = weekDays.filter((d) => sick.some((s) => isWithinInterval(d, { start: s.startDatum, end: s.endDatum }))).length;
    vacationDays = weekDays.filter((d) => vacation.some((v) => isWithinInterval(d, { start: v.startDatum, end: v.endDatum }))).length;
  }

  const ausfalltageKompensiert = sickDays + vacationDays;
  const effektivSollStunden = kw ? Math.max(0, sollStunden - ausfalltageKompensiert * (sollStunden / 5)) : sollStunden;
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
