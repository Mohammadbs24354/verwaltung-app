import { store, newId } from "@/lib/store";
import type { NotificationType } from "@/lib/store";

interface AuditLogParams {
  userId: string;
  scheduleId?: string;
  aktion: string;
  tabelle: string;
  datensatzId: string;
  alterWert?: unknown;
  neuerWert?: unknown;
  begruendung?: string;
}

export function createAuditLog(params: AuditLogParams) {
  const log = {
    id: newId(),
    userId: params.userId,
    scheduleId: params.scheduleId ?? null,
    aktion: params.aktion,
    tabelle: params.tabelle,
    datensatzId: params.datensatzId,
    alterWert: params.alterWert ? JSON.parse(JSON.stringify(params.alterWert)) : null,
    neuerWert: params.neuerWert ? JSON.parse(JSON.stringify(params.neuerWert)) : null,
    begruendung: params.begruendung ?? null,
    createdAt: new Date(),
  };
  store.auditLogs.push(log);
  return log;
}

export function createNotificationForAll(
  userIds: string[],
  data: { typ: NotificationType; titel: string; nachricht: string }
) {
  for (const userId of userIds) {
    store.notifications.push({
      id: newId(),
      userId,
      ...data,
      gelesen: false,
      createdAt: new Date(),
    });
  }
}

export function createNotification(
  userId: string,
  data: { typ: NotificationType; titel: string; nachricht: string }
) {
  const n = { id: newId(), userId, ...data, gelesen: false, createdAt: new Date() };
  store.notifications.push(n);
  return n;
}
