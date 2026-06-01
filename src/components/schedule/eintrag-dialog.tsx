"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface Mitarbeiter { id: string; name: string }
interface EditEntry {
  id: string; userId: string; datum: string; startZeit: string; endZeit: string; pausen: number; notiz: string | null;
}
interface Props {
  open: boolean;
  scheduleId: string;
  filialeId: string;
  kw?: number;
  jahr?: number;
  editEntry?: EditEntry;
  onClose: () => void;
  onSaved: () => void;
}

interface Row {
  userId: string; datum: string; startZeit: string; endZeit: string; pausen: number; notiz: string;
}

export function EintragDialog({ open, scheduleId, filialeId, kw, jahr, editEntry, onClose, onSaved }: Props) {
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([
    { userId: "", datum: new Date().toISOString().slice(0, 10), startZeit: "08:00", endZeit: "16:00", pausen: 0, notiz: "" },
  ]);

  useEffect(() => {
    fetch(`/api/mitarbeiter?filialeId=${filialeId}`)
      .then((r) => r.json())
      .then(setMitarbeiter)
      .catch(() => {});
  }, [filialeId]);

  useEffect(() => {
    if (editEntry) {
      setRows([{
        userId: editEntry.userId,
        datum: editEntry.datum.slice(0, 10),
        startZeit: editEntry.startZeit,
        endZeit: editEntry.endZeit,
        pausen: editEntry.pausen,
        notiz: editEntry.notiz ?? "",
      }]);
    }
  }, [editEntry]);

  function addRow() {
    setRows((prev) => [...prev, { ...prev[prev.length - 1], userId: "" }]);
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, field: keyof Row, value: string | number) {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  async function handleSave() {
    if (rows.some((r) => !r.userId || !r.datum)) {
      toast({ title: "Bitte alle Felder ausfüllen", variant: "destructive" });
      return;
    }
    setLoading(true);

    if (editEntry) {
      const res = await fetch(
        `/api/dienstplaene/${scheduleId}/eintraege?entryId=${editEntry.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rows[0]),
        }
      );
      if (res.ok) {
        toast({ title: "Eintrag aktualisiert", variant: "success" });
        onSaved();
      } else {
        toast({ title: "Fehler beim Speichern", variant: "destructive" });
      }
    } else {
      const res = await fetch(`/api/dienstplaene/${scheduleId}/eintraege`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rows[0]),
      });
      if (res.ok) {
        toast({ title: "Eintrag gespeichert", variant: "success" });
        onSaved();
      } else {
        toast({ title: "Fehler beim Speichern", variant: "destructive" });
      }
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editEntry ? "Schicht bearbeiten" : "Schicht eintragen"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end rounded-lg border border-gray-100 p-3">
              <div className="col-span-3 space-y-1">
                <Label className="text-xs">Mitarbeiter</Label>
                <Select value={row.userId} onValueChange={(v) => updateRow(i, "userId", v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mitarbeiter.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Datum</Label>
                <Input type="date" className="h-8 text-xs" value={row.datum} onChange={(e) => updateRow(i, "datum", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Beginn</Label>
                <Input type="time" className="h-8 text-xs" value={row.startZeit} onChange={(e) => updateRow(i, "startZeit", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Ende</Label>
                <Input type="time" className="h-8 text-xs" value={row.endZeit} onChange={(e) => updateRow(i, "endZeit", e.target.value)} />
              </div>
              <div className="col-span-1 space-y-1">
                <Label className="text-xs">Pause</Label>
                <Input type="number" step="0.5" min="0" className="h-8 text-xs" value={row.pausen} onChange={(e) => updateRow(i, "pausen", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="col-span-1 space-y-1">
                <Label className="text-xs">Notiz</Label>
                <Input className="h-8 text-xs" value={row.notiz} onChange={(e) => updateRow(i, "notiz", e.target.value)} />
              </div>
              <div className="col-span-1 flex justify-end">
                {rows.length > 1 && !editEntry && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)} className="h-8 w-8 text-red-400 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter className="flex justify-between items-center">
          {!editEntry ? (
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4" />
              Weitere Zeile
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
