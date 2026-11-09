import { store } from "@/lib/store";

export function getManagedFilialeIds(userId: string): string[] {
  return store.userFilialen
    .filter((assignment) => assignment.userId === userId && assignment.isLeiter)
    .map((assignment) => assignment.filialeId);
}

export function isUserInFiliale(userId: string, filialeId: string): boolean {
  return store.userFilialen.some(
    (assignment) => assignment.userId === userId && assignment.filialeId === filialeId
  );
}

export function canManageUser(actorId: string, actorRole: string, targetUserId: string): boolean {
  if (actorRole === "CHEF") return true;
  if (actorRole !== "FILIALLEITER") return actorId === targetUserId;

  const managedFilialeIds = getManagedFilialeIds(actorId);
  return store.userFilialen.some(
    (assignment) =>
      assignment.userId === targetUserId && managedFilialeIds.includes(assignment.filialeId)
  );
}

export function canManageFiliale(actorId: string, actorRole: string, filialeId: string): boolean {
  if (actorRole === "CHEF") return true;
  return actorRole === "FILIALLEITER" &&
    store.userFilialen.some(
      (assignment) =>
        assignment.userId === actorId &&
        assignment.filialeId === filialeId &&
        assignment.isLeiter
    );
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() === "") return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime());
}

export function isValidDateRange(start: unknown, end: unknown): boolean {
  return isValidDate(start) && isValidDate(end) &&
    new Date(start).getTime() <= new Date(end).getTime();
}

export function isValidTime(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isValidShift(start: unknown, end: unknown, pause: unknown): boolean {
  if (!isValidTime(start) || !isValidTime(end) ||
      typeof pause !== "number" || !Number.isFinite(pause) || pause < 0 || pause > 480) {
    return false;
  }
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const duration = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  return duration > 0 && pause <= duration;
}
