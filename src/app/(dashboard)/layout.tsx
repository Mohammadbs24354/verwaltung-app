import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { store } from "@/lib/store";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const unreadCount = store.notifications.filter(
    (n) => n.userId === session.user.id && !n.gelesen
  ).length;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={session.user.role} userName={session.user.name} unreadCount={unreadCount} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-[#eef2f7] p-6">{children}</main>
      </div>
    </div>
  );
}
