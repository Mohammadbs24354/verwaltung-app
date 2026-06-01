# Setup-Anleitung: Verwaltungs-App

## Voraussetzungen
- Node.js 18+
- PostgreSQL (lokal oder Remote)

## 1. Umgebungsvariablen einrichten

Datei `.env` bearbeiten:
```
DATABASE_URL="postgresql://postgres:DEIN_PASSWORT@localhost:5432/verwaltung_app"
NEXTAUTH_SECRET="ein-langer-zufaelliger-string-mindestens-32-zeichen"
NEXTAUTH_URL="http://localhost:3000"
```

Auch in `prisma.config.ts` wird `DATABASE_URL` aus `.env` geladen.

## 2. Datenbank erstellen (PostgreSQL)
```sql
CREATE DATABASE verwaltung_app;
```

## 3. Schema in Datenbank anlegen
```bash
npx prisma migrate dev --name init
```

## 4. Testdaten einspielen
```bash
npm run db:seed
```

**Test-Zugangsdaten:**
| Rolle | E-Mail | Passwort |
|---|---|---|
| Chef | chef@verwaltung.de | chef1234 |
| Filialleiter | anna@verwaltung.de | leiter1234 |
| Mitarbeiter | erika@verwaltung.de | mitarbeiter1234 |

## 5. Entwicklungsserver starten
```bash
npm run dev
```

Dann im Browser: http://localhost:3000

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
