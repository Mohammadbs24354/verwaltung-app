"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, Building2, CalendarDays, Clock,
  HeartPulse, Umbrella, FileText, Bell, LogOut, ChevronRight,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/next-auth";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: Role[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["CHEF", "FILIALLEITER", "MITARBEITER"] },
  { href: "/dashboard/filialen", label: "Filialen", icon: Building2, roles: ["CHEF"] },
  { href: "/dashboard/mitarbeiter", label: "Mitarbeiter", icon: Users, roles: ["CHEF", "FILIALLEITER"] },
  { href: "/dashboard/dienstplaene", label: "Dienstplaene", icon: CalendarDays, roles: ["CHEF", "FILIALLEITER", "MITARBEITER"] },
  { href: "/dashboard/arbeitszeiten", label: "Arbeitszeiten", icon: Clock, roles: ["CHEF", "FILIALLEITER", "MITARBEITER"] },
  { href: "/dashboard/krankmeldungen", label: "Krankmeldungen", icon: HeartPulse, roles: ["CHEF", "FILIALLEITER", "MITARBEITER"] },
  { href: "/dashboard/urlaub", label: "Urlaub", icon: Umbrella, roles: ["CHEF", "FILIALLEITER", "MITARBEITER"] },
  { href: "/dashboard/audit", label: "Aenderungsprotokoll", icon: ClipboardList, roles: ["CHEF", "FILIALLEITER"] },
  { href: "/dashboard/benachrichtigungen", label: "Benachrichtigungen", icon: Bell, roles: ["CHEF", "FILIALLEITER", "MITARBEITER"] },
  { href: "/dashboard/berichte", label: "Berichte & PDF", icon: FileText, roles: ["CHEF", "FILIALLEITER"] },
];

const labelMap: Record<string, string> = {
  "Dienstplaene": "Dienstpläne",
  "Aenderungsprotokoll": "Änderungsprotokoll",
};

interface SidebarProps {
  role: Role;
  userName: string;
  unreadCount?: number;
}

export function Sidebar({ role, userName, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const filtered = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="flex h-full w-64 flex-col bg-white border-r border-gray-300">
      <div className="flex h-16 items-center gap-3 border-b border-gray-100 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Verwaltung</p>
          <p className="text-xs text-gray-500">App</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {filtered.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          const displayLabel = labelMap[item.label] ?? item.label;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-blue-600" : "text-gray-500")} />
              <span className="flex-1">{displayLabel}</span>
              {item.href === "/dashboard/benachrichtigungen" && unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
              {isActive && <ChevronRight className="h-3 w-3 text-blue-400" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{userName}</p>
            <p className="text-xs text-gray-500">
              {role === "CHEF" ? "Chef" : role === "FILIALLEITER" ? "Filialleiter" : "Mitarbeiter"}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4 text-gray-500" />
          Abmelden
        </button>
      </div>
    </aside>
  );
}
