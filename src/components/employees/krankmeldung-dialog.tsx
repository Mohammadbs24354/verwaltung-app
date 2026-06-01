"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/use-toast";
import { Loader2 } from "lucide-react";

interface Mitarbeiter { id: string; name: string }
interface Props { open: boolean; onClose: () => void; onSaved: (m: unknown) => void }

export function KrankmeldungDialog({ open, onClose, onSaved }: Props) {
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    userId: "", startDatum: new Date().toISOString().slice(0, 10),
    endDatum: new Date().toISOString().slice(0, 10), typ: "MIT_KRANKSCHEIN", notiz: "",
  });

  useEffect(() => {
    fetch("/api/mitarbeiter").then((r) => r.json()).then(setMitarbeiter);
  }, []);

  function update(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/krankmeldungen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast({ title: "Krankmeldung erfasst", variant: "success" });
      onSaved(await res.json());
    } else {
      toast({ title: "Fehler", variant: "destructive" });
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Krankmeldung erfassen</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Mitarbeiter</Label>
            <Select value={form.userId} onValueChange={(v) => update("userId", v)} required>
              <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
              <SelectContent>
                {mitarbeiter.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Von</Label>
              <Input type="date" value={form.startDatum} onChange={(e) => update("startDatum", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Bis</Label>
              <Input type="date" value={form.endDatum} onChange={(e) => update("endDatum", e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Typ</Label>
            <Select value={form.typ} onValueChange={(v) => update("typ", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MIT_KRANKSCHEIN">Mit Krankschein</SelectItem>
                <SelectItem value="OHNE_KRANKSCHEIN">Ohne Krankschein</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notiz (optional)</Label>
            <Input value={form.notiz} onChange={(e) => update("notiz", e.target.value)} placeholder="Bemerkung..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={loading || !form.userId}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
