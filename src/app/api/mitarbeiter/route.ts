import { auth } from "@/lib/auth";
import { store, newId } from "@/lib/store";
import type { User, Contract, UserFiliale } from "@/lib/store";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

function enrichUser(user: User) {
  const { password: _pw, ...rest } = user;
  return {
    ...rest,
    contract: store.contracts.find((c) => c.userId === user.id) ?? null,
    filialen: store.userFilialen
      .filter((uf) => uf.userId === user.id)
      .map((uf) => ({
        ...uf,
        filiale: store.filialen.find((f) => f.id === uf.filialeId) ?? null,
      })),
  };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filialeId = searchParams.get("filialeId");

  if (session.user.role === "CHEF") {
    let users = store.users.sort((a, b) => a.name.localeCompare(b.name));
    if (filialeId) {
      const ids = store.userFilialen.filter((uf) => uf.filialeId === filialeId).map((uf) => uf.userId);
      users = users.filter((u) => ids.includes(u.id));
    }
    return NextResponse.json(users.map(enrichUser));
  }

  if (session.user.role === "FILIALLEITER") {
    const myIds = store.userFilialen
      .filter((uf) => uf.userId === session.user.id && uf.isLeiter)
      .map((uf) => uf.filialeId);
    const userIds = store.userFilialen
      .filter((uf) => myIds.includes(uf.filialeId))
      .map((uf) => uf.userId);
    const users = store.users
      .filter((u) => userIds.includes(u.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json(users.map(enrichUser));
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !["CHEF", "FILIALLEITER"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const hashed = await bcrypt.hash(body.password, 12);
  const t = new Date();

  const user: User = {
    id: newId(),
    name: body.name,
    email: body.email,
    password: hashed,
    role: body.role || "MITARBEITER",
    aktiv: true,
    createdAt: t,
    updatedAt: t,
  };
  store.users.push(user);

  let uf: UserFiliale | null = null;
  if (body.filialeId) {
    uf = {
      id: newId(),
      userId: user.id,
      filialeId: body.filialeId,
      isPrimary: true,
      isLeiter: body.role === "FILIALLEITER",
      createdAt: t,
    };
    store.userFilialen.push(uf);
  }

  let contract: Contract | null = null;
  if (body.contract) {
    contract = {
      id: newId(),
      userId: user.id,
      istVollzeit: body.contract.istVollzeit ?? true,
      sollStunden: body.contract.sollStunden ?? 38.5,
      eintrittsDatum: new Date(body.contract.eintrittsDatum),
      austrittsDatum: null,
      aktiv: true,
      createdAt: t,
      updatedAt: t,
    };
    store.contracts.push(contract);
  }

  const { password: _pw, ...result } = user;
  return NextResponse.json({
    ...result,
    contract,
    filialen: uf ? [{ ...uf, filiale: store.filialen.find((f) => f.id === uf!.filialeId) ?? null }] : [],
  }, { status: 201 });
}
