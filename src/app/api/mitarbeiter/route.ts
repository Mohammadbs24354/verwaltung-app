import { auth } from "@/lib/auth";
import { store, newId } from "@/lib/store";
import type { User, Contract, UserFiliale, Role } from "@/lib/store";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { canManageFiliale } from "@/lib/authorization";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function enrichUser(user: User) {
  const { password: _pw, ...rest } = user;
  return {
    ...rest,
    contract: store.contracts.find((contract) => contract.userId === user.id) ?? null,
    filialen: store.userFilialen
      .filter((assignment) => assignment.userId === user.id)
      .map((assignment) => ({
        ...assignment,
        filiale: store.filialen.find((branch) => branch.id === assignment.filialeId) ?? null,
      })),
  };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filialeId = searchParams.get("filialeId");
  if (session.user.role === "MITARBEITER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (session.user.role === "CHEF") {
    let users = [...store.users].sort((a, b) => a.name.localeCompare(b.name));
    if (filialeId) {
      const ids = store.userFilialen.filter((assignment) => assignment.filialeId === filialeId)
        .map((assignment) => assignment.userId);
      users = users.filter((user) => ids.includes(user.id));
    }
    return NextResponse.json(users.map(enrichUser));
  }

  const managedIds = store.userFilialen
    .filter((assignment) => assignment.userId === session.user.id && assignment.isLeiter)
    .map((assignment) => assignment.filialeId);
  if (filialeId && !managedIds.includes(filialeId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const users = store.users
    .filter((user) => (user.role === "MITARBEITER" || user.id === session.user.id) &&
      store.userFilialen.some(
        (assignment) => assignment.userId === user.id && managedIds.includes(assignment.filialeId)
      )
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json(users.map(enrichUser));
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !["CHEF", "FILIALLEITER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!isRecord(parsed)) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
    body = parsed;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const role = (body.role ?? "MITARBEITER") as Role;
  if (!["CHEF", "FILIALLEITER", "MITARBEITER"].includes(role) ||
      (session.user.role !== "CHEF" && role !== "MITARBEITER")) {
    return NextResponse.json({ error: "Diese Rolle darf nicht angelegt werden" }, { status: 403 });
  }
  if (typeof body.name !== "string" || body.name.trim().length < 2 ||
      typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ||
      typeof body.password !== "string" || body.password.length < 10) {
    return NextResponse.json({ error: "Name, gültige E-Mail und Passwort (mindestens 10 Zeichen) erforderlich" }, { status: 400 });
  }
  const email = body.email.trim().toLowerCase();
  if (store.users.some((user) => user.email.toLowerCase() === email)) {
    return NextResponse.json({ error: "E-Mail-Adresse existiert bereits" }, { status: 409 });
  }

  const filialeId = typeof body.filialeId === "string" ? body.filialeId : "";
  if (!filialeId || !store.filialen.some((branch) => branch.id === filialeId) ||
      !canManageFiliale(session.user.id, session.user.role, filialeId)) {
    return NextResponse.json({ error: "Ungültige oder nicht freigegebene Filiale" }, { status: 403 });
  }

  const hashed = await bcrypt.hash(body.password, 12);
  const t = new Date();
  const user: User = {
    id: newId(),
    name: body.name.trim(),
    email,
    password: hashed,
    role,
    aktiv: true,
    createdAt: t,
    updatedAt: t,
  };
  store.users.push(user);

  const uf: UserFiliale = {
    id: newId(),
    userId: user.id,
    filialeId,
    isPrimary: true,
    isLeiter: role === "FILIALLEITER",
    createdAt: t,
  };
  store.userFilialen.push(uf);

  let contract: Contract | null = null;
  if (isRecord(body.contract)) {
    const hours = Number(body.contract.sollStunden ?? 38.5);
    const entryDate = new Date(String(body.contract.eintrittsDatum));
    if (!Number.isFinite(hours) || hours <= 0 || hours > 60 || !Number.isFinite(entryDate.getTime())) {
      store.users.pop();
      store.userFilialen.pop();
      return NextResponse.json({ error: "Ungültige Vertragsdaten" }, { status: 400 });
    }
    contract = {
      id: newId(),
      userId: user.id,
      istVollzeit: body.contract.istVollzeit === undefined ? true : Boolean(body.contract.istVollzeit),
      sollStunden: hours,
      eintrittsDatum: entryDate,
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
    filialen: [{ ...uf, filiale: store.filialen.find((branch) => branch.id === filialeId) ?? null }],
  }, { status: 201 });
}
