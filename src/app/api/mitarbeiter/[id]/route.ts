import { auth } from "@/lib/auth";
import { store, newId } from "@/lib/store";
import type { Contract } from "@/lib/store";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const user = store.users.find((u) => u.id === id);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { password: _pw, ...result } = user;
  return NextResponse.json({
    ...result,
    contract: store.contracts.find((c) => c.userId === id) ?? null,
    filialen: store.userFilialen
      .filter((uf) => uf.userId === id)
      .map((uf) => ({ ...uf, filiale: store.filialen.find((f) => f.id === uf.filialeId) ?? null })),
    sickLeaves: store.sickLeaves
      .filter((s) => s.userId === id)
      .sort((a, b) => b.startDatum.getTime() - a.startDatum.getTime())
      .slice(0, 10),
    vacations: store.vacationRequests
      .filter((v) => v.userId === id)
      .sort((a, b) => b.startDatum.getTime() - a.startDatum.getTime())
      .slice(0, 10),
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["CHEF", "FILIALLEITER"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const user = store.users.find((u) => u.id === id);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  if (body.name) user.name = body.name;
  if (body.email) user.email = body.email;
  if (body.aktiv !== undefined) user.aktiv = body.aktiv;
  if (body.password) user.password = await bcrypt.hash(body.password, 12);
  user.updatedAt = new Date();

  if (body.contract) {
    let contract = store.contracts.find((c) => c.userId === id);
    if (contract) {
      if (body.contract.istVollzeit !== undefined) contract.istVollzeit = body.contract.istVollzeit;
      if (body.contract.sollStunden !== undefined) contract.sollStunden = body.contract.sollStunden;
      contract.austrittsDatum = body.contract.austrittsDatum ? new Date(body.contract.austrittsDatum) : null;
      if (body.contract.aktiv !== undefined) contract.aktiv = body.contract.aktiv;
      contract.updatedAt = new Date();
    } else {
      const t = new Date();
      const newContract: Contract = {
        id: newId(),
        userId: id,
        istVollzeit: body.contract.istVollzeit ?? true,
        sollStunden: body.contract.sollStunden ?? 38.5,
        eintrittsDatum: new Date(body.contract.eintrittsDatum),
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
  if (!session || session.user.role !== "CHEF")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const user = store.users.find((u) => u.id === id);
  if (user) {
    user.aktiv = false;
    user.updatedAt = new Date();
  }
  return NextResponse.json({ ok: true });
}
