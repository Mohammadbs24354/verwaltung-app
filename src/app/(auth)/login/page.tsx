"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Loader2, Users } from "lucide-react";

const demoAccounts = [
  { label: "Administrator", role: "CHEF", email: "chef@verwaltung.de", password: "chef1234" },
  { label: "Filialleiter", role: "FILIALLEITER", email: "anna@verwaltung.de", password: "leiter1234" },
  { label: "Mitarbeiter", role: "MITARBEITER", email: "erika@verwaltung.de", password: "mitarbeiter1234" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("E-Mail oder Passwort falsch.");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  function chooseDemoAccount(account: (typeof demoAccounts)[number]) {
    setEmail(account.email);
    setPassword(account.password);
    setError("");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <Building2 className="h-9 w-9 text-white" />
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Verwaltungs-App</h1>
          <p className="mt-1 text-gray-700">Dienstplan- und Mitarbeiterverwaltung</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Anmelden</CardTitle>
            <CardDescription>Melden Sie sich mit Ihren Zugangsdaten an</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@beispiel.de"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Anmelden...
                  </>
                ) : (
                  "Anmelden"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-blue-100 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-blue-600" />
              Demo-Zugänge
            </CardTitle>
            <CardDescription>
              Wählen Sie eine Rolle aus. Die Zugangsdaten werden automatisch eingetragen.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {demoAccounts.map((account) => (
              <Button
                key={account.role}
                type="button"
                variant="outline"
                className="justify-between"
                onClick={() => chooseDemoAccount(account)}
              >
                <span>{account.label}</span>
                <span className="text-xs text-muted-foreground">Zugangsdaten eintragen</span>
              </Button>
            ))}
            <p className="text-xs leading-relaxed text-muted-foreground">
              Öffentliche Testkonten mit ausschließlich erfundenen Beispieldaten. Änderungen können für andere Demo-Nutzer sichtbar sein und bei einem Neustart verloren gehen.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
