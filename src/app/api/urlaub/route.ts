import { auth } from "@/lib/auth";
import { store, newId } from "@/lib/store";
import type { VacationRequest } from "@/lib/store";
import { NextResponse } from "next/server";
import { createNotification } from "@/lib/server-utils";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let urlaube = store.vacationRequests;

  if (session.user.role === "MITARBEITER") {
    urlaube = urlaube.filter((v) => v.userId === session.user.id);
  } else if (session.user.role === "FILIALLEITER") {
    const filialeIds = store.userFilialen
      .filter((uf) => uf.userId === session.user.id && uf.isLeiter)
      .map((uf) => uf.filialeId);
    const mitarbeiterIds = store.userFilialen
      .filter((uf) => filialeIds.includes(uf.filialeId))
      .map((uf) => uf.userId);
    urlaube = urlaube.filter((v) => mitarbeiterIds.includes(v.userId));
  }

  const result = urlaube
    .sort((a, b) => b.startDatum.getTime() - a.startDatum.getTime())
    .map((v) => ({
      ...v,
      user: { id: v.userId, name: store.users.find((u) => u.id === v.userId)?.name ?? "" },
    }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const t = new Date();
  const urlaub: VacationRequest = {
    id: newId(),
    userId: body.userId ?? session.user.id,
    startDatum: new Date(body.startDatum),
    endDatum: new Date(body.endDatum),
    status: "BEANTRAGT",
    genehmigtVon: null,
    notiz: body.notiz ?? null,
    createdAt: t,
    updatedAt: t,
  };
  store.vacationRequests.push(urlaub);

  const userName = store.users.find((u) => u.id === urlaub.userId)?.name ?? "";
  for (const chef of store.users.filter((u) => u.role === "CHEF")) {
    createNotification(chef.id, {
      typ: "URLAUB_BEANTRAGT",
      titel: "Urlaubsantrag",
      nachricht: `${userName} hat Urlaub beantragt.`,
    });
  }

  return NextResponse.json(
    { ...urlaub, user: { id: urlaub.userId, name: userName } },
    { status: 201 }
  );
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || !["CHEF", "FILIALLEITER"].includes(session.user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, status } = body;

  const urlaub = store.vacationRequests.find((v) => v.id === id);
  if (!urlaub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  urlaub.status = status;
  urlaub.genehmigtVon = session.user.id;
  urlaub.updatedAt = new Date();

  createNotification(urlaub.userId, {
    typ: status === "GENEHMIGT" ? "URLAUB_GENEHMIGT" : "URLAUB_ABGELEHNT",
    titel: status === "GENEHMIGT" ? "Urlaub genehmigt" : "Urlaub abgelehnt",
    nachricht: `Ihr Urlaubsantrag wurde ${status === "GENEHMIGT" ? "genehmigt" : "abgelehnt"}.`,
  });

  const userName = store.users.find((u) => u.id === urlaub.userId)?.name ?? "";
  return NextResponse.json({ ...urlaub, user: { id: urlaub.userId, name: userName } });
}
