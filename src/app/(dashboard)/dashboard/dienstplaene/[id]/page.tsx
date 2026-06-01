"use client";

import { useEffect, useState, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, Send, FileDown, Plus, History, Pencil, Trash2 } from "lucide-react";
import { getStatusColor, getStatusLabel, berechneStunden } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import { EintragDialog } from "@/components/schedule/eintrag-dialog";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface Entry {
  id: string; userId: string; datum: string; startZeit: string; endZeit: string;
  pausen: number; notiz: string | null;
  user: { id: string; name: string };
}
interface Schedule {
  id: string; kalenderwoche: number; jahr: number; status: string;
  freigegebenAt: string | null;
  filiale: { id: string; name: string };
  entries: Entry[];
  auditLogs: Array<{ id: string; aktion: string; createdAt: string; user: { name: string }; begruendung: string | null }>;
}

export default function DienstplanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [userFilialeId, setUserFilialeId] = useState<string | null>(null);
  const [showEintragDialog, setShowEintragDialog] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  function reload() {
    fetch(`/api/dienstplaene/${id}`).then((r) => r.json()).then(setSchedule);
  }

  useEffect(() => {
    fetch(`/api/dienstplaene/${id}`).then((r) => r.json()).then(setSchedule).finally(() => setLoading(false));
    fetch("/api/session-role").then((r) => r.json()).then((d) => {
      setUserRole(d.role ?? "");
      setUserFilialeId(d.filialeId ?? null);
    });
  }, [id]);

  async function updateStatus(status: string, begruendung?: string) {
    setActionLoading(true);
    const res = await fetch(`/api/dienstplaene/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, begruendung }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSchedule((prev) => prev ? { ...prev, status: updated.status, freigegebenAt: updated.freigegebenAt } : null);
      toast({ title: `Status: ${getStatusLabel(status)}`, variant: "success" });
    }
    setActionLoading(false);
  }

  async function handleDeleteEntry(entryId: string) {
    if (!confirm("Eintrag wirklich löschen?")) return;
    const res = await fetch(`/api/dienstplaene/${id}/eintraege?entryId=${entryId}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Eintrag gelöscht", variant: "success" });
      reload();
    } else {
      toast({ title: "Fehler beim Löschen", variant: "destructive" });
    }
  }

  async function handlePDF() {
    const res = await fetch(`/api/pdf?scheduleId=${id}`);
    const html = await res.text();
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  if (!schedule) return <div className="text-center py-20 text-gray-500">Dienstplan nicht gefunden</div>;

  const grouped: Record<string, Entry[]> = {};
  for (const e of schedule.entries) {
    const day = e.datum.slice(0, 10);
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(e);
  }
  const sortedDays = Object.keys(grouped).sort();

  const canEdit =
    userRole === "CHEF" ||
    (userRole === "FILIALLEITER" && userFilialeId === schedule.filiale.id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-gray-900">KW{schedule.kalenderwoche}/{schedule.jahr}</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(schedule.status)}`}>
              {getStatusLabel(schedule.status)}
            </span>
          </div>
          <p className="text-gray-600">{schedule.filiale.name}</p>
          {schedule.freigegebenAt && (
            <p className="text-xs text-gray-500 mt-1">Freigegeben am {format(new Date(schedule.freigegebenAt), "dd.MM.yyyy HH:mm", { locale: de })}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {canEdit && schedule.status === "ENTWURF" && (
            <Button variant="outline" onClick={() => updateStatus("EINGEREICHT")} disabled={actionLoading}>
              <Send className="h-4 w-4" />Einreichen
            </Button>
          )}
          {userRole === "CHEF" && schedule.status === "EINGEREICHT" && (
            <>
              <Button variant="success" onClick={() => updateStatus("FREIGEGEBEN")} disabled={actionLoading}>
                <CheckCircle className="h-4 w-4" />Freigeben
              </Button>
              <Button variant="destructive" onClick={() => updateStatus("ENTWURF")} disabled={actionLoading}>
                <XCircle className="h-4 w-4" />Ablehnen
              </Button>
            </>
          )}
          {canEdit && (
            <Button variant="outline" onClick={() => { setEditEntry(null); setShowEintragDialog(true); }}>
              <Plus className="h-4 w-4" />Eintrag
            </Button>
          )}
          <Button variant="outline" onClick={handlePDF}>
            <FileDown className="h-4 w-4" />PDF
          </Button>
          <Button variant="ghost" onClick={() => setShowAudit(!showAudit)}>
            <History className="h-4 w-4" />Protokoll
          </Button>
        </div>
      </div>

      {sortedDays.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Noch keine Einträge. {canEdit && "Fügen Sie den ersten Eintrag hinzu."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedDays.map((day) => (
            <Card key={day}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-600">
                  {format(new Date(day + "T12:00:00"), "EEEE, dd. MMMM yyyy", { locale: de })}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mitarbeiter</TableHead>
                      <TableHead>Beginn</TableHead>
                      <TableHead>Ende</TableHead>
                      <TableHead>Pause</TableHead>
                      <TableHead>Stunden</TableHead>
                      <TableHead>Notiz</TableHead>
                      {canEdit && <TableHead className="w-20" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grouped[day].map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.user.name}</TableCell>
                        <TableCell>{e.startZeit}</TableCell>
                        <TableCell>{e.endZeit}</TableCell>
                        <TableCell>{e.pausen > 0 ? `${e.pausen}h` : "–"}</TableCell>
                        <TableCell className="font-semibold text-blue-700">
                          {berechneStunden(e.startZeit, e.endZeit, e.pausen).toFixed(2)}h
                        </TableCell>
                        <TableCell className="text-gray-600">{e.notiz ?? "–"}</TableCell>
                        {canEdit && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-gray-400 hover:text-blue-600"
                                onClick={() => { setEditEntry(e); setShowEintragDialog(true); }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-gray-400 hover:text-red-600"
                                onClick={() => handleDeleteEntry(e.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showAudit && schedule.auditLogs.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Änderungsprotokoll</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {schedule.auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 border-b border-gray-50 pb-3 last:border-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                    {log.user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{log.user.name} <span className="font-normal text-gray-600">· {log.aktion}</span></p>
                    <p className="text-xs text-gray-500">{format(new Date(log.createdAt), "dd.MM.yyyy HH:mm", { locale: de })}</p>
                    {log.begruendung && <p className="text-xs text-gray-600 mt-0.5">Begründung: {log.begruendung}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showEintragDialog && (
        <EintragDialog
          open={showEintragDialog}
          scheduleId={id}
          filialeId={schedule.filiale.id}
          editEntry={editEntry ?? undefined}
          onClose={() => { setShowEintragDialog(false); setEditEntry(null); }}
          onSaved={() => {
            reload();
            setShowEintragDialog(false);
            setEditEntry(null);
          }}
        />
      )}
    </div>
  );
}
