"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getKalenderwoche } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import { Loader2 } from "lucide-react";

interface Filiale { id: string; name: string }
interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (schedule: unknown) => void;
}

export function NeuerDienstplanDialog({ open, onClose, onCreated }: Props) {
  const [filialen, setFilialen] = useState<Filiale[]>([]);
  const [filialeId, setFilialeId] = useState("");
  const { kw, jahr } = getKalenderwoche();
  const [kwVal, setKwVal] = useState(kw.toString());
  const [jahrVal, setJahrVal] = useState(jahr.toString());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/filialen").then((r) => r.json()).then(setFilialen);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!filialeId) return;
    setLoading(true);
    const res = await fetch("/api/dienstplaene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filialeId, kalenderwoche: parseInt(kwVal), jahr: parseInt(jahrVal) }),
    });
    if (res.ok) {
      const data = await res.json();
      toast({ title: "Dienstplan erstellt", variant: "success" });
      onCreated(data);
    } else {
      const err = await res.json();
      toast({ title: err.error ?? "Fehler", variant: "destructive" });
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neuen Dienstplan erstellen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Filiale</Label>
            <Select value={filialeId} onValueChange={setFilialeId} required>
              <SelectTrigger>
                <SelectValue placeholder="Filiale wählen..." />
              </SelectTrigger>
              <SelectContent>
                {filialen.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kalenderwoche</Label>
              <Input type="number" min={1} max={53} value={kwVal} onChange={(e) => setKwVal(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Jahr</Label>
              <Input type="number" min={2020} max={2099} value={jahrVal} onChange={(e) => setJahrVal(e.target.value)} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={loading || !filialeId}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Erstellen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
