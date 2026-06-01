"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Clock, TrendingUp, TrendingDown } from "lucide-react";
import { formatStunden, getKalenderwoche } from "@/lib/utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface ArbeitszeitData {
  gesamtStunden: number; sollStunden: number; differenz: number;
  uberstunden: number; minusstunden: number; sickDays: number; vacationDays: number;
  entries: Array<{ id: string; datum: string; startZeit: string; endZeit: string; pausen: number; schedule: { filiale: { name: string } } }>;
}

export default function ArbeitszeitenPage() {
  const { kw, jahr } = getKalenderwoche();
  const [data, setData] = useState<ArbeitszeitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterKw, setFilterKw] = useState(kw.toString());
  const [filterJahr, setFilterJahr] = useState(jahr.toString());
  const [userId, setUserId] = useState("");
  const [mitarbeiter, setMitarbeiter] = useState<Array<{ id: string; name: string }>>([]);
  const [userRole, setUserRole] = useState("");
  const [selectedUser, setSelectedUser] = useState("");

  useEffect(() => {
    fetch("/api/session-role").then((r) => r.json()).then((d) => {
      setUserRole(d.role ?? "");
      setUserId(d.id ?? "");
      setSelectedUser(d.id ?? "");
    });
  }, []);

  useEffect(() => {
    if (["CHEF", "FILIALLEITER"].includes(userRole)) {
      fetch("/api/mitarbeiter").then((r) => r.json()).then(setMitarbeiter);
    }
  }, [userRole]);

  useEffect(() => {
    if (!selectedUser && !userId) return;
    const uid = selectedUser || userId;
    setLoading(true);
    fetch(`/api/arbeitszeiten?userId=${uid}&kw=${filterKw}&jahr=${filterJahr}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [filterKw, filterJahr, selectedUser, userId]);

  const kws = Array.from({ length: 53 }, (_, i) => (i + 1).toString());
  const years = [jahr, jahr - 1].map(String);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Arbeitszeiten</h2>
        <p className="text-gray-600">Über- und Minusstunden auf einen Blick</p>
      </div>

      <div className="flex flex-wrap gap-4">
        {["CHEF", "FILIALLEITER"].includes(userRole) && (
          <div className="space-y-1.5">
            <Label>Mitarbeiter</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                {mitarbeiter.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Kalenderwoche</Label>
          <Select value={filterKw} onValueChange={setFilterKw}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{kws.map((k) => <SelectItem key={k} value={k}>KW{k}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Jahr</Label>
          <Select value={filterJahr} onValueChange={setFilterJahr}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Clock} label="Geleistete Stunden" value={formatStunden(data.gesamtStunden)} color="blue" />
            <StatCard icon={Clock} label="Sollstunden" value={formatStunden(data.sollStunden)} color="gray" />
            <StatCard icon={TrendingUp} label="Überstunden" value={formatStunden(data.uberstunden)} color="green" />
            <StatCard icon={TrendingDown} label="Minusstunden" value={formatStunden(data.minusstunden)} color="red" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schichten KW{filterKw}/{filterJahr}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.entries.length === 0 ? (
                <p className="text-gray-400 text-sm">Keine freigegebenen Schichten in diesem Zeitraum.</p>
              ) : (
                <div className="space-y-2">
                  {data.entries.map((e) => {
                    const h = (new Date(`1970-01-01T${e.endZeit}:00`).getTime() - new Date(`1970-01-01T${e.startZeit}:00`).getTime()) / 3600000 - e.pausen;
                    return (
                      <div key={e.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                        <div>
                          <p className="text-sm font-medium">{format(new Date(e.datum.slice(0, 10) + "T12:00:00"), "EEEE, dd.MM.yyyy", { locale: de })}</p>
                          <p className="text-xs text-gray-600">{e.schedule.filiale.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-blue-700">{e.startZeit} – {e.endZeit}</p>
                          <p className="text-xs text-gray-600">{h.toFixed(2)}h netto</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600", gray: "bg-gray-100 text-gray-600",
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
          <div className={`rounded-xl p-3 ${colors[color]}`}><Icon className="h-5 w-5" /></div>
        </div>
      </CardContent>
    </Card>
  );
}
