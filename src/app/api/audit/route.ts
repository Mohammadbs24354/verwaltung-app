import { auth } from "@/lib/auth";
import { store } from "@/lib/store";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || !["CHEF", "FILIALLEITER"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const scheduleId = searchParams.get("scheduleId");
  const limit = parseInt(searchParams.get("limit") ?? "100");

  let scheduleIds: string[] | null = null;
  if (session.user.role === "FILIALLEITER") {
    const filialeIds = store.userFilialen
      .filter((uf) => uf.userId === session.user.id && uf.isLeiter)
      .map((uf) => uf.filialeId);
    scheduleIds = store.schedules
      .filter((s) => filialeIds.includes(s.filialeId))
      .map((s) => s.id);
  }

  const logs = store.auditLogs
    .filter((log) => {
      if (scheduleId && log.scheduleId !== scheduleId) return false;
      if (scheduleIds !== null && !scheduleIds.includes(log.scheduleId ?? "")) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit)
    .map((log) => {
      const user = store.users.find((u) => u.id === log.userId);
      const sched = log.scheduleId ? store.schedules.find((s) => s.id === log.scheduleId) : null;
      const filiale = sched ? store.filialen.find((f) => f.id === sched.filialeId) : null;
      return {
        ...log,
        user: { id: log.userId, name: user?.name ?? "" },
        schedule: sched ? { ...sched, filiale: { name: filiale?.name ?? "" } } : null,
      };
    });

  return NextResponse.json(logs);
}
