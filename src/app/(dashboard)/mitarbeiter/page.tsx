"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Users } from "lucide-react";
import { MitarbeiterDialog } from "@/components/employees/mitarbeiter-dialog";
import Link from "next/link";

interface Mitarbeiter {
  id: string; name: string; email: string; role: string; aktiv: boolean;
  contract: { sollStunden: number; istVollzeit: boolean } | null;
  filialen: Array<{ filiale: { name: string }; isPrimary: boolean }>;
}

export default function MitarbeiterPage() {
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    fetch("/api/mitarbeiter").then((r) => r.json()).then(setMitarbeiter).finally(() => setLoading(false));
  }, []);

  const filtered = mitarbeiter.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mitarbeiter</h2>
          <p className="text-gray-500">{mitarbeiter.length} Einträge gesamt</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4" />
          Neuer Mitarbeiter
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input className="pl-9" placeholder="Suchen nach Name oder E-Mail..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        {loading ? (
          <CardContent className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </CardContent>
        ) : filtered.length === 0 ? (
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Users className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">Keine Mitarbeiter gefunden</p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>Filiale(n)</TableHead>
                <TableHead>Vertrag</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/dashboard/mitarbeiter/${m.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {m.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-gray-500">{m.email}</TableCell>
                  <TableCell>
                    <Badge variant={m.role === "CHEF" ? "default" : m.role === "FILIALLEITER" ? "info" : "secondary"}>
                      {m.role === "CHEF" ? "Chef" : m.role === "FILIALLEITER" ? "Filialleiter" : "Mitarbeiter"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">
                    {m.filialen.map((f) => f.filiale.name).join(", ") || "–"}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {m.contract ? `${m.contract.sollStunden}h/Woche` : "–"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.aktiv ? "success" : "secondary"}>
                      {m.aktiv ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {showDialog && (
        <MitarbeiterDialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          onSaved={(neu) => { setMitarbeiter((prev) => [neu as Mitarbeiter, ...prev]); setShowDialog(false); }}
        />
      )}
    </div>
  );
}
