import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { getISOWeek, getYear, startOfISOWeek, endOfISOWeek, eachDayOfInterval, format } from "date-fns";
import { de } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getKalenderwoche(date: Date = new Date()) {
  return {
    kw: getISOWeek(date),
    jahr: getYear(date),
  };
}

export function getWochentage(kw: number, jahr: number): Date[] {
  const jan4 = new Date(jahr, 0, 4);
  const startOfWeek1 = startOfISOWeek(jan4);
  const weekStart = new Date(startOfWeek1);
  weekStart.setDate(startOfWeek1.getDate() + (kw - 1) * 7);
  const weekEnd = endOfISOWeek(weekStart);
  return eachDayOfInterval({ start: weekStart, end: weekEnd });
}

export function formatDatum(date: Date): string {
  return format(date, "dd.MM.yyyy", { locale: de });
}

export function formatZeit(time: string): string {
  return time.slice(0, 5);
}

export function berechneStunden(startZeit: string, endZeit: string, pausen: number = 0): number {
  const [startH, startM] = startZeit.split(":").map(Number);
  const [endH, endM] = endZeit.split(":").map(Number);
  const startMinuten = startH * 60 + startM;
  const endMinuten = endH * 60 + endM;
  const differenz = endMinuten - startMinuten - pausen * 60;
  return Math.max(0, differenz / 60);
}

export function formatStunden(stunden: number): string {
  const h = Math.floor(Math.abs(stunden));
  const m = Math.round((Math.abs(stunden) - h) * 60);
  const sign = stunden < 0 ? "-" : "";
  return `${sign}${h}:${m.toString().padStart(2, "0")} h`;
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    CHEF: "Chef",
    FILIALLEITER: "Filialleiter",
    MITARBEITER: "Mitarbeiter",
  };
  return labels[role] || role;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ENTWURF: "Entwurf",
    EINGEREICHT: "Eingereicht",
    FREIGEGEBEN: "Freigegeben",
    NACHTRAEGLICH_GEAENDERT: "Nachträglich geändert",
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ENTWURF: "bg-gray-100 text-gray-700",
    EINGEREICHT: "bg-yellow-100 text-yellow-700",
    FREIGEGEBEN: "bg-green-100 text-green-700",
    NACHTRAEGLICH_GEAENDERT: "bg-orange-100 text-orange-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}
