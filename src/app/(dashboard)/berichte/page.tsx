"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileDown, FileText, Printer } from "lucide-react";
import { getKalenderwoche, getStatusLabel, getStatusColor } from "@/lib/utils";
import Link from "next/link";

interface Schedule {
  id: string; kalenderwoche: number; jahr: number; status: string;
  filiale: { name: string };
  entries: { id: string }[];
}

export default function BerichtePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const { kw, jahr } = getKalenderwoche();
  const [filterJahr, setFilterJahr] = useState(jahr.toString());
  const years = [jahr, jahr - 1, jahr - 2].map(String);

  useEffect(() => {
    fetch("/api/dienstplaene?jahr=" + filterJahr)
      .then((r) => r.json())
      .then(setSchedules)
      .finally(() => setLoading(false));
  }, [filterJahr]);

  function printSchedule(id: string) {
    const win = window.open(`/api/pdf?scheduleId=${id}`, "_blank");
    win?.addEventListener("load", () => win.print());
  }

  async function downloadHtml(id: string, kw: number, filiale: string) {
    const res = await fetch(`/api/pdf?scheduleId=${id}`);
    const html = await res.text();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Dienstplan_KW${kw}_${filiale.replace(/\s+/g, "_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Berichte & PDF-Export</h2>
          <p className="text-gray-500">Dienstpläne drucken oder herunterladen</p>
        </div>
        <div className="space-y-1">
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
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <FileText className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">Keine Dienstpläne für {filterJahr}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">KW{s.kalenderwoche}/{s.jahr} – {s.filiale.name}</p>
                    <p className="text-xs text-gray-500">{s.entries.length} Schichten</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(s.status)}`}>
                    {getStatusLabel(s.status)}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => printSchedule(s.id)}>
                    <Printer className="h-3.5 w-3.5" />
                    Drucken
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadHtml(s.id, s.kalenderwoche, s.filiale.name)}>
                    <FileDown className="h-3.5 w-3.5" />
                    Herunterladen
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
