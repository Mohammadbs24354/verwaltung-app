"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, HeartPulse } from "lucide-react";
import { KrankmeldungDialog } from "@/components/employees/krankmeldung-dialog";
import { formatDatum } from "@/lib/utils";

interface Krankmeldung {
  id: string; typ: string; startDatum: string; endDatum: string; notiz: string | null;
  user: { id: string; name: string };
}

export default function KrankmeldungenPage() {
  const [meldungen, setMeldungen] = useState<Krankmeldung[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    fetch("/api/krankmeldungen").then((r) => r.json()).then(setMeldungen).finally(() => setLoading(false));
    fetch("/api/session-role").then((r) => r.json()).then((d) => setUserRole(d.role ?? ""));
  }, []);

  const canCreate = ["CHEF", "FILIALLEITER"].includes(userRole);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Krankmeldungen</h2>
          <p className="text-gray-500">{meldungen.length} Einträge</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4" />
            Krankmeldung erfassen
          </Button>
        )}
      </div>

      <Card>
        {loading ? (
          <CardContent className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </CardContent>
        ) : meldungen.length === 0 ? (
          <CardContent className="flex flex-col items-center py-16 text-center">
            <HeartPulse className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">Keine Krankmeldungen vorhanden</p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mitarbeiter</TableHead>
                <TableHead>Von</TableHead>
                <TableHead>Bis</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Notiz</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meldungen.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.user.name}</TableCell>
                  <TableCell>{formatDatum(new Date(m.startDatum))}</TableCell>
                  <TableCell>{formatDatum(new Date(m.endDatum))}</TableCell>
                  <TableCell>
                    <Badge variant={m.typ === "MIT_KRANKSCHEIN" ? "info" : "warning"}>
                      {m.typ === "MIT_KRANKSCHEIN" ? "Mit Krankschein" : "Ohne Krankschein"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500">{m.notiz ?? "–"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {showDialog && (
        <KrankmeldungDialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          onSaved={(neu) => { setMeldungen((prev) => [neu as Krankmeldung, ...prev]); setShowDialog(false); }}
        />
      )}
    </div>
  );
}
