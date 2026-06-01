import { auth } from "@/lib/auth";
import { store } from "@/lib/store";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notifications = store.notifications
    .filter((n) => n.userId === session.user.id)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 50);

  return NextResponse.json(notifications);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.alleGelesen) {
    store.notifications
      .filter((n) => n.userId === session.user.id && !n.gelesen)
      .forEach((n) => { n.gelesen = true; });
    return NextResponse.json({ ok: true });
  }

  if (body.id) {
    const n = store.notifications.find((n) => n.id === body.id && n.userId === session.user.id);
    if (!n) return NextResponse.json({ error: "Not found" }, { status: 404 });
    n.gelesen = true;
    return NextResponse.json(n);
  }

  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}
