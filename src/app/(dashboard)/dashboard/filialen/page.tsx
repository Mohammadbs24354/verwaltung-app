"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Building2, Users, Loader2 } from "lucide-react";
import { toast } from "@/lib/use-toast";

interface Filiale {
  id: string; name: string; adresse: string | null;
  mitarbeiter: Array<{ user: { id: string; name: string; aktiv: boolean } }>;
}

export default function FilialenPage() {
  const [filialen, setFilialen] = useState<Filiale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ name: "", adresse: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/filialen").then((r) => r.json()).then(setFilialen).finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/filialen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const neu = await res.json();
      setFilialen((prev) => [...prev, { ...neu, mitarbeiter: [] }]);
      setShowDialog(false);
      setForm({ name: "", adresse: "" });
      toast({ title: "Filiale erstellt", variant: "success" });
    } else {
      toast({ title: "Fehler beim Erstellen", variant: "destructive" });
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Filialen</h2>
          <p className="text-gray-500">{filialen.length} Filialen</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4" />
          Neue Filiale
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filialen.map((f) => {
            const aktive = f.mitarbeiter.filter((m) => m.user?.aktiv).length;
            return (
              <Card key={f.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{f.name}</h3>
                      {f.adresse && <p className="text-sm text-gray-500">{f.adresse}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span>{aktive} aktive Mitarbeiter</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filialen.length === 0 && (
            <div className="col-span-2 flex flex-col items-center py-16 text-center">
              <Building2 className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500">Noch keine Filialen angelegt</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neue Filiale erstellen</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="z.B. Filiale Nord" required />
            </div>
            <div className="space-y-1.5">
              <Label>Adresse (optional)</Label>
              <Input value={form.adresse} onChange={(e) => setForm((p) => ({ ...p, adresse: e.target.value }))} placeholder="Musterstraße 1, 12345 Musterstadt" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Abbrechen</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Erstellen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
