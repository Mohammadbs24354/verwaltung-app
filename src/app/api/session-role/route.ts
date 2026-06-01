import { auth } from "@/lib/auth";
import { store } from "@/lib/store";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ role: null });
  const primaryFiliale = store.userFilialen.find(
    (uf) => uf.userId === session.user.id && uf.isPrimary
  );
  return NextResponse.json({
    role: session.user.role,
    id: session.user.id,
    name: session.user.name,
    filialeId: primaryFiliale?.filialeId ?? null,
  });
}
