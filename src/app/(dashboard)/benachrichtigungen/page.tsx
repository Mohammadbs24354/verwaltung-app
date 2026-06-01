"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";

interface Notification {
  id: string; typ: string; titel: string; nachricht: string; gelesen: boolean; createdAt: string;
}

export default function BenachrichtigungenPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications").then((r) => r.json()).then(setNotifications).finally(() => setLoading(false));
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alleGelesen: true }) });
    setNotifications((prev) => prev.map((n) => ({ ...n, gelesen: true })));
    toast({ title: "Alle als gelesen markiert", variant: "success" });
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, gelesen: true } : n));
  }

  const unread = notifications.filter((n) => !n.gelesen).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Benachrichtigungen</h2>
          <p className="text-gray-500">{unread} ungelesen</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" />
            Alle gelesen
          </Button>
        )}
      </div>

      <Card>
        {loading ? (
          <CardContent className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </CardContent>
        ) : notifications.length === 0 ? (
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Bell className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">Keine Benachrichtigungen</p>
          </CardContent>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((n) => (
              <div key={n.id} className={cn("flex items-start gap-4 p-4 transition-colors hover:bg-gray-50 cursor-pointer", !n.gelesen && "bg-blue-50/50")} onClick={() => !n.gelesen && markRead(n.id)}>
                <div className={cn("mt-0.5 flex h-2 w-2 shrink-0 rounded-full", n.gelesen ? "bg-gray-300" : "bg-blue-500")} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm", n.gelesen ? "font-normal text-gray-700" : "font-semibold text-gray-900")}>{n.titel}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{n.nachricht}</p>
                  <p className="text-xs text-gray-400 mt-1">{format(new Date(n.createdAt), "dd.MM.yyyy HH:mm", { locale: de })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
