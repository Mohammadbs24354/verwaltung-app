"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Eye, ChevronRight } from "lucide-react";
import { getKalenderwoche, getStatusColor, getStatusLabel } from "@/lib/utils";
import Link from "next/link";
import { NeuerDienstplanDialog } from "@/components/schedule/neuer-dienstplan-dialog";

interface Schedule {
  id: string;
  kalenderwoche: number;
  jahr: number;
  status: string;
  filiale: { id: string; name: string };
  entries: { id: string }[];
}

export default function DienstplaenePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterJahr, setFilterJahr] = useState(new Date().getFullYear().toString());
  const [showDialog, setShowDialog] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  const { kw } = getKalenderwoche();
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2].map(String);

  useEffect(() => {
    fetch("/api/dienstplaene?jahr=" + filterJahr)
      .then((r) => r.json())
      .then(setSchedules)
      .finally(() => setLoading(false));

    fetch("/api/session-role").then((r) => r.json()).then((d) => setUserRole(d.role ?? "")).catch(() => {});
  }, [filterJahr]);

  const grouped = schedules.reduce((acc: Record<number, Schedule[]>, s) => {
    if (!acc[s.kalenderwoche]) acc[s.kalenderwoche] = [];
    acc[s.kalenderwoche].push(s);
    return acc;
  }, {});

  const sortedKws = Object.keys(grouped).map(Number).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dienstpläne</h2>
          <p className="text-gray-500">Aktuelle Woche: KW{kw}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterJahr} onValueChange={setFilterJahr}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          {["CHEF", "FILIALLEITER"].includes(userRole) && (
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4" />
              Neuer Plan
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : sortedKws.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Keine Dienstpläne gefunden</p>
            <p className="text-gray-400 text-sm mt-1">Erstellen Sie den ersten Dienstplan für {filterJahr}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedKws.map((kwNr) => (
            <Card key={kwNr}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-700">
                  KW{kwNr}/{filterJahr}
                  {kwNr === kw && <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 font-normal">Aktuelle Woche</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {grouped[kwNr].map((s) => (
                    <Link key={s.id} href={`/dashboard/dienstplaene/${s.id}`} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{s.filiale.name}</p>
                          <p className="text-xs text-gray-500">{s.entries.length} Einträge</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(s.status)}`}>
                          {getStatusLabel(s.status)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showDialog && (
        <NeuerDienstplanDialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          onCreated={(s) => {
            setSchedules((prev) => [s as Schedule, ...prev]);
            setShowDialog(false);
          }}
        />
      )}
    </div>
  );
}
