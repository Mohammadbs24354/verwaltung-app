import { auth } from "@/lib/auth";
import { store } from "@/lib/store";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, CalendarDays, HeartPulse, Clock } from "lucide-react";
import { getKalenderwoche, getStatusColor, getStatusLabel } from "@/lib/utils";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { kw, jahr } = getKalenderwoche();

  if (session.user.role === "CHEF") {
    const filialen = store.filialen.length;
    const mitarbeiter = store.users.filter((u) => u.aktiv && u.role === "MITARBEITER").length;
    const offenePlaene = store.schedules
      .filter((s) => s.status === "EINGEREICHT")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)
      .map((s) => ({
        ...s,
        filiale: { name: store.filialen.find((f) => f.id === s.filialeId)?.name ?? "" },
      }));
    const aktiveKranke = store.sickLeaves
      .filter((k) => k.endDatum >= new Date())
      .sort((a, b) => b.startDatum.getTime() - a.startDatum.getTime())
      .slice(0, 10)
      .map((k) => ({
        ...k,
        user: { name: store.users.find((u) => u.id === k.userId)?.name ?? "" },
      }));

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600">Willkommen zurück, {session.user.name}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Building2} label="Filialen" value={filialen} color="blue" href="/dashboard/filialen" />
          <StatCard icon={Users} label="Mitarbeiter" value={mitarbeiter} color="green" href="/dashboard/mitarbeiter" />
          <StatCard icon={CalendarDays} label="Zur Freigabe" value={offenePlaene.length} color="yellow" href="/dashboard/dienstplaene" />
          <StatCard icon={HeartPulse} label="Aktuelle Krankmeldungen" value={aktiveKranke.length} color="red" href="/dashboard/krankmeldungen" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-yellow-500" />
                Dienstpläne zur Freigabe
              </CardTitle>
            </CardHeader>
            <CardContent>
              {offenePlaene.length === 0 ? (
                <p className="text-sm text-gray-500">Keine offenen Dienstpläne</p>
              ) : (
                <div className="space-y-2">
                  {offenePlaene.map((p) => (
                    <Link key={p.id} href={`/dashboard/dienstplaene/${p.id}`} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
                      <p className="text-sm font-medium">KW{p.kalenderwoche}/{p.jahr} – {p.filiale.name}</p>
                      <Badge variant="warning">Eingereicht</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HeartPulse className="h-4 w-4 text-red-500" />
                Aktuelle Krankmeldungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aktiveKranke.length === 0 ? (
                <p className="text-sm text-gray-500">Keine aktiven Krankmeldungen</p>
              ) : (
                <div className="space-y-2">
                  {aktiveKranke.map((k) => (
                    <div key={k.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                      <p className="text-sm font-medium">{k.user.name}</p>
                      <Badge variant={k.typ === "MIT_KRANKSCHEIN" ? "info" : "warning"}>
                        {k.typ === "MIT_KRANKSCHEIN" ? "Mit Krankschein" : "Ohne Krankschein"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (session.user.role === "FILIALLEITER") {
    const filialeIds = store.userFilialen
      .filter((uf) => uf.userId === session.user.id && uf.isLeiter)
      .map((uf) => uf.filialeId);

    const userIdsInFilialen = store.userFilialen
      .filter((uf) => filialeIds.includes(uf.filialeId))
      .map((uf) => uf.userId);

    const mitarbeiter = store.users.filter(
      (u) => u.aktiv && userIdsInFilialen.includes(u.id)
    ).length;

    const aktuelleWoche = store.schedules
      .filter((s) => filialeIds.includes(s.filialeId) && s.kalenderwoche === kw && s.jahr === jahr)
      .map((s) => ({
        ...s,
        filiale: { name: store.filialen.find((f) => f.id === s.filialeId)?.name ?? "" },
        entries: store.scheduleEntries
          .filter((e) => e.scheduleId === s.id)
          .map((e) => ({
            ...e,
            user: { name: store.users.find((u) => u.id === e.userId)?.name ?? "" },
          })),
      }));

    const offeneUrlaube = store.vacationRequests
      .filter((v) => v.status === "BEANTRAGT" && userIdsInFilialen.includes(v.userId))
      .sort((a, b) => b.startDatum.getTime() - a.startDatum.getTime())
      .slice(0, 10)
      .map((v) => ({
        ...v,
        user: { name: store.users.find((u) => u.id === v.userId)?.name ?? "" },
      }));

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600">Willkommen zurück, {session.user.name}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={Users} label="Meine Mitarbeiter" value={mitarbeiter} color="blue" href="/dashboard/mitarbeiter" />
          <StatCard icon={CalendarDays} label={`Pläne KW${kw}`} value={aktuelleWoche.length} color="green" href="/dashboard/dienstplaene" />
          <StatCard icon={Clock} label="Offene Urlaubsanträge" value={offeneUrlaube.length} color="yellow" href="/dashboard/urlaub" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dienstpläne KW{kw}/{jahr}</CardTitle>
          </CardHeader>
          <CardContent>
            {aktuelleWoche.length === 0 ? (
              <p className="text-sm text-gray-500">Noch kein Dienstplan für diese Woche erstellt.</p>
            ) : (
              <div className="space-y-2">
                {aktuelleWoche.map((p) => (
                  <Link key={p.id} href={`/dashboard/dienstplaene/${p.id}`} className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-sm">{p.filiale.name}</p>
                      <p className="text-xs text-gray-600">{p.entries.length} Einträge</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(p.status)}`}>
                      {getStatusLabel(p.status)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // MITARBEITER
  const filialeIds = store.userFilialen
    .filter((uf) => uf.userId === session.user.id)
    .map((uf) => uf.filialeId);

  const aktuellerPlanRaw = store.schedules.find(
    (s) =>
      filialeIds.includes(s.filialeId) &&
      s.kalenderwoche === kw &&
      s.jahr === jahr &&
      ["FREIGEGEBEN", "NACHTRAEGLICH_GEAENDERT"].includes(s.status)
  ) ?? null;

  const aktuellerPlan = aktuellerPlanRaw
    ? {
        ...aktuellerPlanRaw,
        filiale: { name: store.filialen.find((f) => f.id === aktuellerPlanRaw.filialeId)?.name ?? "" },
        entries: store.scheduleEntries
          .filter((e) => e.scheduleId === aktuellerPlanRaw.id && e.userId === session.user.id)
          .sort((a, b) => a.datum.getTime() - b.datum.getTime()),
      }
    : null;

  const contract = store.contracts.find((c) => c.userId === session.user.id) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mein Dashboard</h2>
        <p className="text-gray-500">KW{kw}/{jahr} – Willkommen, {session.user.name}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={Clock} label="Sollstunden/Woche" value={`${contract?.sollStunden ?? 38.5}h`} color="blue" href="/dashboard/arbeitszeiten" />
        <StatCard icon={CalendarDays} label="Schichten diese Woche" value={aktuellerPlan?.entries.length ?? 0} color="green" href="/dashboard/dienstplaene" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mein Dienstplan KW{kw}/{jahr}</CardTitle>
        </CardHeader>
        <CardContent>
          {!aktuellerPlan || aktuellerPlan.entries.length === 0 ? (
            <p className="text-sm text-gray-400">Kein freigegebener Dienstplan für diese Woche.</p>
          ) : (
            <div className="space-y-2">
              {aktuellerPlan.entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(e.datum).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit" })}
                    </p>
                    {e.notiz && <p className="text-xs text-gray-500">{e.notiz}</p>}
                  </div>
                  <span className="text-sm font-semibold text-blue-700">{e.startZeit} – {e.endZeit}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, href }: {
  icon: React.ElementType; label: string; value: string | number; color: string; href: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    yellow: "bg-yellow-50 text-yellow-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
            <div className={`rounded-xl p-3 ${colors[color]}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
