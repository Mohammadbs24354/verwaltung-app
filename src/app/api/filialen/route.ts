import { auth } from "@/lib/auth";
import { store, newId } from "@/lib/store";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role === "CHEF") {
    const filialen = store.filialen
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((f) => ({
        ...f,
        mitarbeiter: store.userFilialen
          .filter((uf) => uf.filialeId === f.id)
          .map((uf) => {
            const user = store.users.find((u) => u.id === uf.userId);
            return {
              ...uf,
              user: user
                ? { id: user.id, name: user.name, role: user.role, aktiv: user.aktiv }
                : null,
            };
          }),
      }));
    return NextResponse.json(filialen);
  }

  const filialeIds = store.userFilialen
    .filter((uf) => uf.userId === session.user.id)
    .map((uf) => uf.filialeId);
  const filialen = store.filialen.filter((f) => filialeIds.includes(f.id));
  return NextResponse.json(filialen);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "CHEF")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const t = new Date();
  const filiale = {
    id: newId(),
    name: body.name,
    adresse: body.adresse ?? null,
    createdAt: t,
    updatedAt: t,
  };
  store.filialen.push(filiale);
  return NextResponse.json(filiale, { status: 201 });
}
