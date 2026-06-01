"use client";

import { useEffect, useState, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Pencil, User, Building2, Clock, HeartPulse, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDatum, getRoleLabel } from "@/lib/utils";
import { toast } from "@/lib/use-toast";

interface MitarbeiterDetail {
  id: string; name: string; email: string; role: string; aktiv: boolean;
  contract: { sollStunden: number; istVollzeit: boolean; eintrittsDatum: string; austrittsDatum: string | null; aktiv: boolean } | null;
  filialen: Array<{ id: string; filialeId: string; isPrimary: boolean; isLeiter: boolean; filiale: { id: string; name: string } }>;
  sickLeaves: Array<{ id: string; startDatum: string; endDatum: string; typ: string; notiz: string | null }>;
  vacations: Array<{ id: string; startDatum: string; endDatum: string; status: string; notiz: string | null }>;
}

export default function MitarbeiterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [m, setM] = useState<MitarbeiterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    fetch(`/api/mitarbeiter/${id}`).then((r) => r.json()).then(setM).finally(() => setLoading(false));
    fetch("/api/session-role").then((r) => r.json()).then((d) => setUserRole(d.role ?? ""));
  }, [id]);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
  if (!m) return <div className="text-center py-20 text-gray-500">Mitarbeiter nicht gefunden</div>;

  const canEdit = ["CHEF", "FILIALLEITER"].includes(userRole);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/mitarbeiter">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Zurück</Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{m.name}</h2>
          <p className="text-gray-500">{m.email}</p>
        </div>
        {canEdit && <Button onClick={() => setShowEdit(true)}><Pencil className="h-4 w-4" />Bearbeiten</Button>}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4 text-blue-500" />Stammdaten</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Row label="Name" value={m.name} />
            <Row label="E-Mail" value={m.email} />
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-sm text-gray-500">Rolle</span>
              <Badge variant={m.role === "CHEF" ? "default" : m.role === "FILIALLEITER" ? "info" : "secondary"}>{getRoleLabel(m.role)}</Badge>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-sm text-gray-500">Status</span>
              <Badge variant={m.aktiv ? "success" : "secondary"}>{m.aktiv ? "Aktiv" : "Inaktiv"}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4 text-green-500" />Vertrag</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {m.contract ? (
              <>
                <Row label="Sollstunden/Woche" value={`${m.contract.sollStunden}h`} />
                <Row label="Beschäftigung" value={m.contract.istVollzeit ? "Vollzeit" : "Teilzeit"} />
                <Row label="Eintrittsdatum" value={formatDatum(new Date(m.contract.eintrittsDatum))} />
                {m.contract.austrittsDatum && <Row label="Austrittsdatum" value={formatDatum(new Date(m.contract.austrittsDatum))} />}
              </>
            ) : <p className="text-sm text-gray-400">Kein Vertrag hinterlegt</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 text-purple-500" />Filialen</CardTitle></CardHeader>
          <CardContent>
            {m.filialen.length === 0 ? <p className="text-sm text-gray-400">Keiner Filiale zugeordnet</p> : (
              <div className="space-y-2">
                {m.filialen.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                    <span className="text-sm font-medium">{f.filiale.name}</span>
                    <div className="flex gap-1.5">
                      {f.isPrimary && <Badge variant="info" className="text-xs">Hauptfiliale</Badge>}
                      {f.isLeiter && <Badge variant="default" className="text-xs">Leiter</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><HeartPulse className="h-4 w-4 text-red-500" />Letzte Krankmeldungen</CardTitle></CardHeader>
          <CardContent>
            {m.sickLeaves.length === 0 ? <p className="text-sm text-gray-400">Keine Krankmeldungen</p> : (
              <div className="space-y-2">
                {m.sickLeaves.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                    <span className="text-sm">{formatDatum(new Date(s.startDatum))} – {formatDatum(new Date(s.endDatum))}</span>
                    <Badge variant={s.typ === "MIT_KRANKSCHEIN" ? "info" : "warning"} className="text-xs">
                      {s.typ === "MIT_KRANKSCHEIN" ? "Mit Schein" : "Ohne Schein"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showEdit && <EditDialog mitarbeiter={m} onClose={() => setShowEdit(false)} onSaved={(updated) => { setM((prev) => prev ? { ...prev, ...updated } : null); setShowEdit(false); }} />}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 border-b border-gray-50">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

function EditDialog({ mitarbeiter: m, onClose, onSaved }: { mitarbeiter: MitarbeiterDetail; onClose: () => void; onSaved: (u: Partial<MitarbeiterDetail>) => void }) {
  const [form, setForm] = useState({ name: m.name, email: m.email, aktiv: m.aktiv ? "true" : "false", sollStunden: m.contract?.sollStunden?.toString() ?? "38.5", istVollzeit: m.contract?.istVollzeit ? "true" : "false" });
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const body: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      aktiv: form.aktiv === "true",
      contract: { istVollzeit: form.istVollzeit === "true", sollStunden: parseFloat(form.sollStunden) },
    };
    const res = await fetch(`/api/mitarbeiter/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      toast({ title: "Gespeichert", variant: "success" });
      onSaved({ name: form.name, email: form.email, aktiv: form.aktiv === "true" });
    } else {
      toast({ title: "Fehler beim Speichern", variant: "destructive" });
    }
    setLoading(false);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Mitarbeiter bearbeiten</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4 py-2">
          <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} required /></div>
          <div className="space-y-1.5"><Label>E-Mail</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.aktiv} onValueChange={(v) => set("aktiv", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="true">Aktiv</SelectItem><SelectItem value="false">Inaktiv</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Vertragstyp</Label>
              <Select value={form.istVollzeit} onValueChange={(v) => set("istVollzeit", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="true">Vollzeit</SelectItem><SelectItem value="false">Teilzeit</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Sollstunden/Woche</Label><Input type="number" step="0.5" value={form.sollStunden} onChange={(e) => set("sollStunden", e.target.value)} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin" />}Speichern</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
