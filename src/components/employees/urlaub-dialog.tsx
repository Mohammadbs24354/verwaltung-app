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
interface Props { open: boolean; onClose: () => void; onSaved: (u: unknown) => void }

export function UrlaubDialog({ open, onClose, onSaved }: Props) {
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState("");
  const [form, setForm] = useState({
    startDatum: new Date().toISOString().slice(0, 10),
    endDatum: new Date().toISOString().slice(0, 10),
    notiz: "",
  });

  useEffect(() => {
    fetch("/api/session-role").then((r) => r.json()).then((d) => {
      setUserRole(d.role ?? "");
      if (d.role === "MITARBEITER") setUserId(d.id ?? "");
    });
    fetch("/api/mitarbeiter").then((r) => r.json()).then(setMitarbeiter);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/urlaub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, userId: userId || undefined }),
    });
    if (res.ok) {
      toast({ title: "Urlaubsantrag gestellt", variant: "success" });
      onSaved(await res.json());
    } else {
      toast({ title: "Fehler", variant: "destructive" });
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Urlaub beantragen</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {["CHEF", "FILIALLEITER"].includes(userRole) && (
            <div className="space-y-1.5">
              <Label>Mitarbeiter</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger>
                <SelectContent>
                  {mitarbeiter.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Von</Label>
              <Input type="date" value={form.startDatum} onChange={(e) => setForm((p) => ({ ...p, startDatum: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Bis</Label>
              <Input type="date" value={form.endDatum} onChange={(e) => setForm((p) => ({ ...p, endDatum: e.target.value }))} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notiz (optional)</Label>
            <Input value={form.notiz} onChange={(e) => setForm((p) => ({ ...p, notiz: e.target.value }))} placeholder="Begründung..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Beantragen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
