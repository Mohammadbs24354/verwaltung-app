"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Umbrella, CheckCircle, XCircle } from "lucide-react";
import { UrlaubDialog } from "@/components/employees/urlaub-dialog";
import { formatDatum } from "@/lib/utils";
import { toast } from "@/lib/use-toast";

interface Urlaub {
  id: string; status: string; startDatum: string; endDatum: string; notiz: string | null;
  user: { id: string; name: string };
}

export default function UrlaubPage() {
  const [urlaube, setUrlaube] = useState<Urlaub[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    fetch("/api/urlaub").then((r) => r.json()).then(setUrlaube).finally(() => setLoading(false));
    fetch("/api/session-role").then((r) => r.json()).then((d) => setUserRole(d.role ?? ""));
  }, []);

  async function handleStatus(id: string, status: "GENEHMIGT" | "ABGELEHNT") {
    const res = await fetch("/api/urlaub", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setUrlaube((prev) => prev.map((u) => u.id === id ? { ...u, status } : u));
      toast({ title: status === "GENEHMIGT" ? "Urlaub genehmigt" : "Urlaub abgelehnt", variant: "success" });
    }
  }

  const canApprove = ["CHEF", "FILIALLEITER"].includes(userRole);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Urlaub</h2>
          <p className="text-gray-500">{urlaube.length} Einträge</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4" />
          Urlaub beantragen
        </Button>
      </div>

      <Card>
        {loading ? (
          <CardContent className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </CardContent>
        ) : urlaube.length === 0 ? (
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Umbrella className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">Keine Urlaubsanträge vorhanden</p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mitarbeiter</TableHead>
                <TableHead>Von</TableHead>
                <TableHead>Bis</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notiz</TableHead>
                {canApprove && <TableHead>Aktionen</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {urlaube.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.user.name}</TableCell>
                  <TableCell>{formatDatum(new Date(u.startDatum))}</TableCell>
                  <TableCell>{formatDatum(new Date(u.endDatum))}</TableCell>
                  <TableCell>
                    <Badge variant={u.status === "GENEHMIGT" ? "success" : u.status === "ABGELEHNT" ? "destructive" : "warning"}>
                      {u.status === "GENEHMIGT" ? "Genehmigt" : u.status === "ABGELEHNT" ? "Abgelehnt" : "Beantragt"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500">{u.notiz ?? "–"}</TableCell>
                  {canApprove && (
                    <TableCell>
                      {u.status === "BEANTRAGT" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="success" onClick={() => handleStatus(u.id, "GENEHMIGT")}>
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleStatus(u.id, "ABGELEHNT")}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {showDialog && (
        <UrlaubDialog
          open={showDialog}
          onClose={() => setShowDialog(false)}
          onSaved={(neu) => { setUrlaube((prev) => [neu as Urlaub, ...prev]); setShowDialog(false); }}
        />
      )}
    </div>
  );
}
