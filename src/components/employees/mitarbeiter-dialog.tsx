"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/use-toast";
import { Loader2 } from "lucide-react";

interface Filiale { id: string; name: string }
interface Props { open: boolean; onClose: () => void; onSaved: (m: unknown) => void }

export function MitarbeiterDialog({ open, onClose, onSaved }: Props) {
  const [filialen, setFilialen] = useState<Filiale[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "MITARBEITER", filialeId: "",
    sollStunden: "38.5", istVollzeit: "true", eintrittsDatum: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    fetch("/api/filialen").then((r) => r.json()).then(setFilialen);
  }, []);

  function update(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/mitarbeiter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        filialeId: form.filialeId || undefined,
        contract: {
          istVollzeit: form.istVollzeit === "true",
          sollStunden: parseFloat(form.sollStunden),
          eintrittsDatum: form.eintrittsDatum,
        },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      toast({ title: "Mitarbeiter angelegt", variant: "success" });
      onSaved(data);
    } else {
      const err = await res.json();
      toast({ title: err.error ?? "Fehler", variant: "destructive" });
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Neuer Mitarbeiter</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>E-Mail</Label>
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Passwort</Label>
              <Input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={6} />
            </div>
            <div className="space-y-1.5">
              <Label>Rolle</Label>
              <Select value={form.role} onValueChange={(v) => update("role", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MITARBEITER">Mitarbeiter</SelectItem>
                  <SelectItem value="FILIALLEITER">Filialleiter</SelectItem>
                  <SelectItem value="CHEF">Chef</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Filiale (optional)</Label>
            <Select value={form.filialeId} onValueChange={(v) => update("filialeId", v)}>
              <SelectTrigger><SelectValue placeholder="Keine Filiale zugewiesen" /></SelectTrigger>
              <SelectContent>
                {filialen.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Vertragstyp</Label>
              <Select value={form.istVollzeit} onValueChange={(v) => { update("istVollzeit", v); update("sollStunden", v === "true" ? "38.5" : "20"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Vollzeit</SelectItem>
                  <SelectItem value="false">Teilzeit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Soll-Stunden/Wo.</Label>
              <Input type="number" step="0.5" value={form.sollStunden} onChange={(e) => update("sollStunden", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Eintrittsdatum</Label>
              <Input type="date" value={form.eintrittsDatum} onChange={(e) => update("eintrittsDatum", e.target.value)} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
