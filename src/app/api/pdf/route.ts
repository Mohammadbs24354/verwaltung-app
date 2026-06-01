import { auth } from "@/lib/auth";
import { store } from "@/lib/store";
import type { ScheduleEntry, User } from "@/lib/store";
import { NextResponse } from "next/server";
import { berechneStunden, formatDatum } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";

type EntryWithUser = ScheduleEntry & { user: Pick<User, "id" | "name"> };

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const scheduleId = searchParams.get("scheduleId");
  if (!scheduleId) return NextResponse.json({ error: "scheduleId required" }, { status: 400 });

  const schedule = store.schedules.find((s) => s.id === scheduleId);
  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filiale = store.filialen.find((f) => f.id === schedule.filialeId) ?? { name: "" };
  const entries: EntryWithUser[] = store.scheduleEntries
    .filter((e) => e.scheduleId === scheduleId)
    .map((e) => {
      const user = store.users.find((u) => u.id === e.userId);
      return { ...e, user: { id: e.userId, name: user?.name ?? "" } };
    })
    .sort((a, b) => a.datum.getTime() - b.datum.getTime() || a.startZeit.localeCompare(b.startZeit));

  const grouped: Record<string, EntryWithUser[]> = {};
  for (const entry of entries) {
    if (!grouped[entry.userId]) grouped[entry.userId] = [];
    grouped[entry.userId].push(entry);
  }

  const rows = Object.values(grouped).map((entries) => {
    const user = entries[0].user;
    const totalH = entries.reduce((s, e) => s + berechneStunden(e.startZeit, e.endZeit, e.pausen), 0);
    return { name: user.name, entries, totalH };
  });

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #1a1a1a; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .meta { color: #555; margin-bottom: 20px; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #1d4ed8; color: white; padding: 8px 10px; text-align: left; font-size: 11px; }
  td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
  tr:nth-child(even) td { background: #f9fafb; }
  .total { font-weight: bold; }
  .section-title { font-size: 14px; font-weight: bold; margin: 16px 0 6px; color: #1d4ed8; }
  .footer { margin-top: 30px; font-size: 10px; color: #888; border-top: 1px solid #e5e7eb; padding-top: 8px; }
</style>
</head>
<body>
<h1>Dienstplan KW${schedule.kalenderwoche}/${schedule.jahr}</h1>
<div class="meta">
  Filiale: <strong>${filiale.name}</strong> &nbsp;|&nbsp;
  Status: <strong>${schedule.status}</strong> &nbsp;|&nbsp;
  Erstellt: ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: de })}
</div>

${rows.map((row) => `
<div class="section-title">${row.name}</div>
<table>
  <thead>
    <tr>
      <th>Tag</th><th>Datum</th><th>Beginn</th><th>Ende</th><th>Pause (h)</th><th>Stunden</th><th>Notiz</th>
    </tr>
  </thead>
  <tbody>
    ${row.entries.map((e) => {
      const h = berechneStunden(e.startZeit, e.endZeit, e.pausen);
      const d = new Date(e.datum);
      return `<tr>
        <td>${format(d, "EEEE", { locale: de })}</td>
        <td>${formatDatum(d)}</td>
        <td>${e.startZeit}</td>
        <td>${e.endZeit}</td>
        <td>${e.pausen}</td>
        <td>${h.toFixed(2)}</td>
        <td>${e.notiz ?? ""}</td>
      </tr>`;
    }).join("")}
    <tr class="total">
      <td colspan="5">Gesamt</td>
      <td>${row.totalH.toFixed(2)} h</td>
      <td></td>
    </tr>
  </tbody>
</table>
`).join("")}

<div class="footer">Erstellt am ${format(new Date(), "dd.MM.yyyy 'um' HH:mm 'Uhr'", { locale: de })} &nbsp;|&nbsp; Verwaltungs-App</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
