import { auth } from "@/lib/auth";
import { store, newId } from "@/lib/store";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/server-utils";

function enrichSchedule(s: (typeof store.schedules)[0]) {
  return {
    ...s,
    filiale: (() => {
      const f = store.filialen.find((f) => f.id === s.filialeId);
      return f ? { id: f.id, name: f.name } : null;
    })(),
    entries: store.scheduleEntries
      .filter((e) => e.scheduleId === s.id)
      .map((e) => {
        const user = store.users.find((u) => u.id === e.userId);
        return { ...e, user: { id: e.userId, name: user?.name ?? "" } };
      })
      .sort((a, b) => a.datum.getTime() - b.datum.getTime() || a.startZeit.localeCompare(b.startZeit)),
  };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const kw = searchParams.get("kw");
  const jahr = searchParams.get("jahr");
  const filialeIdParam = searchParams.get("filialeId");

  let myFilialeIds: string[] = [];
  if (session.user.role === "MITARBEITER" || session.user.role === "FILIALLEITER") {
    myFilialeIds = store.userFilialen
      .filter((uf) =>
        uf.userId === session.user.id &&
        (session.user.role === "MITARBEITER" ? true : uf.isLeiter)
      )
      .map((uf) => uf.filialeId);
  }

  const schedules = store.schedules
    .filter((s) => {
      if (kw && s.kalenderwoche !== parseInt(kw)) return false;
      if (jahr && s.jahr !== parseInt(jahr)) return false;
      if (session.user.role === "MITARBEITER") {
        if (s.status !== "FREIGEGEBEN") return false;
        if (!myFilialeIds.includes(s.filialeId)) return false;
      } else if (session.user.role === "FILIALLEITER") {
        if (!myFilialeIds.includes(s.filialeId)) return false;
        if (filialeIdParam && s.filialeId !== filialeIdParam) return false;
      } else {
        if (filialeIdParam && s.filialeId !== filialeIdParam) return false;
      }
      return true;
    })
    .sort((a, b) => b.jahr - a.jahr || b.kalenderwoche - a.kalenderwoche)
    .map(enrichSchedule);

  return NextResponse.json(schedules);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !["CHEF", "FILIALLEITER"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const existing = store.schedules.find(
    (s) =>
      s.filialeId === body.filialeId &&
      s.kalenderwoche === body.kalenderwoche &&
      s.jahr === body.jahr
  );
  if (existing) return NextResponse.json({ error: "Dienstplan existiert bereits" }, { status: 409 });

  const t = new Date();
  const schedule = {
    id: newId(),
    filialeId: body.filialeId,
    kalenderwoche: body.kalenderwoche,
    jahr: body.jahr,
    status: "ENTWURF" as const,
    freigegebenAt: null,
    freigegebenVon: null,
    erstelltVon: session.user.id,
    createdAt: t,
    updatedAt: t,
  };
  store.schedules.push(schedule);

  createAuditLog({
    userId: session.user.id,
    scheduleId: schedule.id,
    aktion: "ERSTELLT",
    tabelle: "Schedule",
    datensatzId: schedule.id,
    neuerWert: schedule,
  });

  const filiale = store.filialen.find((f) => f.id === schedule.filialeId);
  return NextResponse.json({ ...schedule, filiale, entries: [] }, { status: 201 });
}
