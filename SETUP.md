# Setup-Anleitung: Verwaltungs-App

## Voraussetzungen
- Node.js 18+

> Die App verwendet einen In-Memory-Speicher — keine Datenbank erforderlich.

## 1. Abhängigkeiten installieren
```bash
npm install
```

## 2. Umgebungsvariablen einrichten

Datei `.env` bearbeiten:
```
AUTH_SECRET="ein-langer-zufaelliger-string-mindestens-32-zeichen"
AUTH_URL="http://localhost:3000"
```

## 3. Entwicklungsserver starten
```bash
npm run dev
```

Dann im Browser: http://localhost:3000

## Test-Zugangsdaten
| Rolle | E-Mail | Passwort |
|---|---|---|
| Chef | chef@verwaltung.de | chef1234 |
| Filialleiter | anna@verwaltung.de | leiter1234 |
| Mitarbeiter | erika@verwaltung.de | mitarbeiter1234 |

## Seitenstruktur
| Route | Zugriff |
|---|---|
| /login | Alle |
| /dashboard | Alle (rollenabhaengig) |
| /dashboard/filialen | Chef |
| /dashboard/mitarbeiter | Chef, Filialleiter |
| /dashboard/dienstplaene | Alle |
| /dashboard/arbeitszeiten | Alle |
| /dashboard/krankmeldungen | Alle |
| /dashboard/urlaub | Alle |
| /dashboard/audit | Chef, Filialleiter |
| /dashboard/benachrichtigungen | Alle |
| /dashboard/berichte | Chef, Filialleiter |

## Vercel-Deployment
Füge diese Umgebungsvariablen in den Vercel-Einstellungen hinzu:
- `AUTH_SECRET` = langer zufälliger String
- `AUTH_URL` = `https://deine-app.vercel.app`
