"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface AuditLog {
  id: string; aktion: string; tabelle: string; begruendung: string | null; createdAt: string;
  user: { name: string };
  schedule: { kalenderwoche: number; jahr: number; filiale: { name: string } } | null;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit").then((r) => r.json()).then(setLogs).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Änderungsprotokoll</h2>
        <p className="text-gray-500">Revisionssichere Aufzeichnung aller Änderungen</p>
      </div>

      <Card>
        {loading ? (
          <CardContent className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </CardContent>
        ) : logs.length === 0 ? (
          <CardContent className="flex flex-col items-center py-16 text-center">
            <ClipboardList className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">Keine Einträge im Protokoll</p>
          </CardContent>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-gray-50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                  {log.user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">{log.user.name}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{log.aktion}</span>
                    {log.schedule && (
                      <span className="text-xs text-gray-500">KW{log.schedule.kalenderwoche}/{log.schedule.jahr} · {log.schedule.filiale.name}</span>
                    )}
                  </div>
                  {log.begruendung && <p className="text-sm text-gray-600 mt-0.5">Begründung: {log.begruendung}</p>}
                  <p className="text-xs text-gray-400 mt-1">{format(new Date(log.createdAt), "dd.MM.yyyy HH:mm 'Uhr'", { locale: de })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
