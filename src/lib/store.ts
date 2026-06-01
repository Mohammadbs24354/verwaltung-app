import "server-only";
import bcrypt from "bcryptjs";

export type Role = "CHEF" | "FILIALLEITER" | "MITARBEITER";
export type ScheduleStatus = "ENTWURF" | "EINGEREICHT" | "FREIGEGEBEN" | "NACHTRAEGLICH_GEAENDERT";
export type SickLeaveType = "MIT_KRANKSCHEIN" | "OHNE_KRANKSCHEIN";
export type VacationStatus = "BEANTRAGT" | "GENEHMIGT" | "ABGELEHNT";
export type NotificationType =
  | "DIENSTPLAN_FREIGEGEBEN"
  | "DIENSTPLAN_GEAENDERT"
  | "DIENSTPLAN_EINGEREICHT"
  | "KRANKMELDUNG_EINGETRAGEN"
  | "URLAUB_BEANTRAGT"
  | "URLAUB_GENEHMIGT"
  | "URLAUB_ABGELEHNT";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  aktiv: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Filiale {
  id: string;
  name: string;
  adresse: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserFiliale {
  id: string;
  userId: string;
  filialeId: string;
  isPrimary: boolean;
  isLeiter: boolean;
  createdAt: Date;
}

export interface Contract {
  id: string;
  userId: string;
  istVollzeit: boolean;
  sollStunden: number;
  eintrittsDatum: Date;
  austrittsDatum: Date | null;
  aktiv: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Schedule {
  id: string;
  filialeId: string;
  kalenderwoche: number;
  jahr: number;
  status: ScheduleStatus;
  freigegebenAt: Date | null;
  freigegebenVon: string | null;
  erstelltVon: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleEntry {
  id: string;
  scheduleId: string;
  userId: string;
  datum: Date;
  startZeit: string;
  endZeit: string;
  pausen: number;
  notiz: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SickLeave {
  id: string;
  userId: string;
  startDatum: Date;
  endDatum: Date;
  typ: SickLeaveType;
  notiz: string | null;
  erstelltVon: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VacationRequest {
  id: string;
  userId: string;
  startDatum: Date;
  endDatum: Date;
  status: VacationStatus;
  genehmigtVon: string | null;
  notiz: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  scheduleId: string | null;
  userId: string;
  aktion: string;
  tabelle: string;
  datensatzId: string;
  alterWert: unknown;
  neuerWert: unknown;
  begruendung: string | null;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  typ: NotificationType;
  titel: string;
  nachricht: string;
  gelesen: boolean;
  createdAt: Date;
}

interface Store {
  users: User[];
  filialen: Filiale[];
  userFilialen: UserFiliale[];
  contracts: Contract[];
  schedules: Schedule[];
  scheduleEntries: ScheduleEntry[];
  sickLeaves: SickLeave[];
  vacationRequests: VacationRequest[];
  auditLogs: AuditLog[];
  notifications: Notification[];
}

export function newId(): string {
  return crypto.randomUUID();
}

function seedStore(): Store {
  const t = new Date();
  const chefPw = bcrypt.hashSync("chef1234", 8);
  const leiterPw = bcrypt.hashSync("leiter1234", 8);
  const mitarbeiterPw = bcrypt.hashSync("mitarbeiter1234", 8);

  const users: User[] = [
    { id: "user-chef", name: "Max Chef", email: "chef@verwaltung.de", password: chefPw, role: "CHEF", aktiv: true, createdAt: t, updatedAt: t },
    { id: "user-anna", name: "Anna Nord", email: "anna@verwaltung.de", password: leiterPw, role: "FILIALLEITER", aktiv: true, createdAt: t, updatedAt: t },
    { id: "user-ben", name: "Ben Sued", email: "ben@verwaltung.de", password: leiterPw, role: "FILIALLEITER", aktiv: true, createdAt: t, updatedAt: t },
    { id: "user-clara", name: "Clara Ost", email: "clara@verwaltung.de", password: leiterPw, role: "FILIALLEITER", aktiv: true, createdAt: t, updatedAt: t },
    { id: "user-david", name: "David West", email: "david@verwaltung.de", password: leiterPw, role: "FILIALLEITER", aktiv: true, createdAt: t, updatedAt: t },
    { id: "user-erika", name: "Erika Muster", email: "erika@verwaltung.de", password: mitarbeiterPw, role: "MITARBEITER", aktiv: true, createdAt: t, updatedAt: t },
    { id: "user-fritz", name: "Fritz Beispiel", email: "fritz@verwaltung.de", password: mitarbeiterPw, role: "MITARBEITER", aktiv: true, createdAt: t, updatedAt: t },
    { id: "user-gabi", name: "Gabi Test", email: "gabi@verwaltung.de", password: mitarbeiterPw, role: "MITARBEITER", aktiv: true, createdAt: t, updatedAt: t },
    { id: "user-hans", name: "Hans Demo", email: "hans@verwaltung.de", password: mitarbeiterPw, role: "MITARBEITER", aktiv: true, createdAt: t, updatedAt: t },
  ];

  const filialen: Filiale[] = [
    { id: "filiale-nord", name: "Filiale Nord", adresse: "Nordstrasse 1, 12345 Musterstadt", createdAt: t, updatedAt: t },
    { id: "filiale-sued", name: "Filiale Sued", adresse: "Suedstrasse 2, 12345 Musterstadt", createdAt: t, updatedAt: t },
    { id: "filiale-ost", name: "Filiale Ost", adresse: "Oststrasse 3, 12345 Musterstadt", createdAt: t, updatedAt: t },
    { id: "filiale-west", name: "Filiale West", adresse: "Weststrasse 4, 12345 Musterstadt", createdAt: t, updatedAt: t },
  ];

  const userFilialen: UserFiliale[] = [
    { id: "uf-anna-nord", userId: "user-anna", filialeId: "filiale-nord", isPrimary: true, isLeiter: true, createdAt: t },
    { id: "uf-ben-sued", userId: "user-ben", filialeId: "filiale-sued", isPrimary: true, isLeiter: true, createdAt: t },
    { id: "uf-clara-ost", userId: "user-clara", filialeId: "filiale-ost", isPrimary: true, isLeiter: true, createdAt: t },
    { id: "uf-david-west", userId: "user-david", filialeId: "filiale-west", isPrimary: true, isLeiter: true, createdAt: t },
    { id: "uf-erika-nord", userId: "user-erika", filialeId: "filiale-nord", isPrimary: true, isLeiter: false, createdAt: t },
    { id: "uf-fritz-nord", userId: "user-fritz", filialeId: "filiale-nord", isPrimary: true, isLeiter: false, createdAt: t },
    { id: "uf-gabi-sued", userId: "user-gabi", filialeId: "filiale-sued", isPrimary: true, isLeiter: false, createdAt: t },
    { id: "uf-hans-ost", userId: "user-hans", filialeId: "filiale-ost", isPrimary: true, isLeiter: false, createdAt: t },
  ];

  const contracts: Contract[] = [
    { id: "c-anna", userId: "user-anna", istVollzeit: true, sollStunden: 38.5, eintrittsDatum: new Date("2022-01-01"), austrittsDatum: null, aktiv: true, createdAt: t, updatedAt: t },
    { id: "c-ben", userId: "user-ben", istVollzeit: true, sollStunden: 38.5, eintrittsDatum: new Date("2022-01-01"), austrittsDatum: null, aktiv: true, createdAt: t, updatedAt: t },
    { id: "c-clara", userId: "user-clara", istVollzeit: true, sollStunden: 38.5, eintrittsDatum: new Date("2022-01-01"), austrittsDatum: null, aktiv: true, createdAt: t, updatedAt: t },
    { id: "c-david", userId: "user-david", istVollzeit: true, sollStunden: 38.5, eintrittsDatum: new Date("2022-01-01"), austrittsDatum: null, aktiv: true, createdAt: t, updatedAt: t },
    { id: "c-erika", userId: "user-erika", istVollzeit: true, sollStunden: 38.5, eintrittsDatum: new Date("2023-03-01"), austrittsDatum: null, aktiv: true, createdAt: t, updatedAt: t },
    { id: "c-fritz", userId: "user-fritz", istVollzeit: true, sollStunden: 38.5, eintrittsDatum: new Date("2023-03-01"), austrittsDatum: null, aktiv: true, createdAt: t, updatedAt: t },
    { id: "c-gabi", userId: "user-gabi", istVollzeit: true, sollStunden: 38.5, eintrittsDatum: new Date("2023-03-01"), austrittsDatum: null, aktiv: true, createdAt: t, updatedAt: t },
    { id: "c-hans", userId: "user-hans", istVollzeit: true, sollStunden: 38.5, eintrittsDatum: new Date("2023-03-01"), austrittsDatum: null, aktiv: true, createdAt: t, updatedAt: t },
  ];

  return {
    users,
    filialen,
    userFilialen,
    contracts,
    schedules: [],
    scheduleEntries: [],
    sickLeaves: [],
    vacationRequests: [],
    auditLogs: [],
    notifications: [],
  };
}

const g = globalThis as unknown as { __appStore: Store | undefined };
if (!g.__appStore) g.__appStore = seedStore();
export const store = g.__appStore!;
