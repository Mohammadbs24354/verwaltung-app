import { auth } from "@/lib/auth";
import { store, newId } from "@/lib/store";
import type { Contract } from "@/lib/store";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { canManageUser } from "@/lib/authorization";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!canManageUser(session.user.id, session.user.role, id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = store.users.find((item) => item.id === id);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { password: _pw, ...result } = user;
  return NextResponse.json({
    ...result,
    contract: store.contracts.find((contract) => contract.userId === id) ?? null,
    filialen: store.userFilialen
      .filter((assignment) => assignment.userId === id)
      .map((assignment) => ({
        ...assignment,
        filiale: store.filialen.find((branch) => branch.id === assignment.filialeId) ?? null,
      })),
    sickLeaves: store.sickLeaves
      .filter((item) => item.userId === id)
      .sort((a, b) => b.startDatum.getTime() - a.startDatum.getTime())
      .slice(0, 10),
    vacations: store.vacationRequests
      .filter((item) => item.userId === id)
      .sort((a, b) => b.startDatum.getTime() - a.startDatum.getTime())
      .slice(0, 10),
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["CHEF", "FILIALLEITER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  if (!canManageUser(session.user.id, session.user.role, id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = store.users.find((item) => item.id === id);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!isRecord(parsed)) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
    body = parsed;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  if (body.password !== undefined && session.user.role !== "CHEF") {
    return NextResponse.json({ error: "Nur die Geschäftsleitung darf Passwörter zurücksetzen" }, { status: 403 });
  }
  if (body.aktiv !== undefined && typeof body.aktiv !== "boolean") {
    return NextResponse.json({ error: "Ungültiger Aktiv-Status" }, { status: 400 });
  }
  if (body.email !== undefined &&
      (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))) {
    return NextResponse.json({ error: "Ungültige E-Mail-Adresse" }, { status: 400 });
  }
  if (body.name !== undefined && (typeof body.name !== "string" || body.name.trim().length < 2)) {
    return NextResponse.json({ error: "Ungültiger Name" }, { status: 400 });
  }
  if (body.contract !== undefined && !isRecord(body.contract)) {
    return NextResponse.json({ error: "Ungültige Vertragsdaten" }, { status: 400 });
  }
  if (isRecord(body.contract)) {
    if (body.contract.istVollzeit !== undefined && typeof body.contract.istVollzeit !== "boolean") {
      return NextResponse.json({ error: "Ungültiger Vollzeit-Status" }, { status: 400 });
    }
    if (body.contract.aktiv !== undefined && typeof body.contract.aktiv !== "boolean") {
      return NextResponse.json({ error: "Ungültiger Vertragsstatus" }, { status: 400 });
    }
  }
  if (body.name) user.name = body.name.trim();
  if (body.email) {
    const email = body.email.trim().toLowerCase();
    if (store.users.some((item) => item.id !== id && item.email.toLowerCase() === email)) {
      return NextResponse.json({ error: "E-Mail-Adresse existiert bereits" }, { status: 409 });
    }
    user.email = email;
  }
  if (body.aktiv !== undefined) user.aktiv = body.aktiv;
  if (body.password) {
    if (typeof body.password !== "string" || body.password.length < 10) {
      return NextResponse.json({ error: "Passwort muss mindestens 10 Zeichen lang sein" }, { status: 400 });
    }
    user.password = await bcrypt.hash(body.password, 12);
  }
  user.updatedAt = new Date();

  if (isRecord(body.contract)) {
    const hours = Number(body.contract.sollStunden);
    if (body.contract.sollStunden !== undefined && (!Number.isFinite(hours) || hours <= 0 || hours > 60)) {
      return NextResponse.json({ error: "Ungültige Sollstunden" }, { status: 400 });
    }
    const contract = store.contracts.find((item) => item.userId === id);
    if (contract) {
      if (body.contract.istVollzeit !== undefined) contract.istVollzeit = Boolean(body.contract.istVollzeit);
      if (body.contract.sollStunden !== undefined) contract.sollStunden = hours;
      if (body.contract.austrittsDatum !== undefined) {
        const exitDate = body.contract.austrittsDatum ? new Date(String(body.contract.austrittsDatum)) : null;
        if (exitDate && !Number.isFinite(exitDate.getTime())) {
          return NextResponse.json({ error: "Ungültiges Austrittsdatum" }, { status: 400 });
        }
        contract.austrittsDatum = exitDate;
      }
      if (body.contract.aktiv !== undefined) contract.aktiv = Boolean(body.contract.aktiv);
      contract.updatedAt = new Date();
    } else {
      const entryDate = new Date(String(body.contract.eintrittsDatum));
      if (!Number.isFinite(entryDate.getTime())) {
        return NextResponse.json({ error: "Eintrittsdatum erforderlich" }, { status: 400 });
      }
      const t = new Date();
      const newContract: Contract = {
        id: newId(),
        userId: id,
        istVollzeit: typeof body.contract.istVollzeit === "boolean" ? body.contract.istVollzeit : true,
        sollStunden: body.contract.sollStunden ?? 38.5,
        eintrittsDatum: entryDate,
        austrittsDatum: null,
        aktiv: true,
        createdAt: t,
        updatedAt: t,
      };
      store.contracts.push(newContract);
    }
  }

  const { password: _pw, ...result } = user;
  return NextResponse.json(result);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "CHEF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const user = store.users.find((item) => item.id === id);
  if (user) {
    user.aktiv = false;
    user.updatedAt = new Date();
  }
  return NextResponse.json({ ok: true });
}
