import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const chefPw = await bcrypt.hash("chef1234", 12);
  await prisma.user.upsert({
    where: { email: "chef@verwaltung.de" },
    update: {},
    create: { name: "Max Chef", email: "chef@verwaltung.de", password: chefPw, role: "CHEF" },
  });

  await Promise.all([
    prisma.filiale.upsert({ where: { id: "filiale-nord" }, update: {}, create: { id: "filiale-nord", name: "Filiale Nord", adresse: "Nordstrasse 1, 12345 Musterstadt" } }),
    prisma.filiale.upsert({ where: { id: "filiale-sued" }, update: {}, create: { id: "filiale-sued", name: "Filiale Sued", adresse: "Suedstrasse 2, 12345 Musterstadt" } }),
    prisma.filiale.upsert({ where: { id: "filiale-ost" }, update: {}, create: { id: "filiale-ost", name: "Filiale Ost", adresse: "Oststrasse 3, 12345 Musterstadt" } }),
    prisma.filiale.upsert({ where: { id: "filiale-west" }, update: {}, create: { id: "filiale-west", name: "Filiale West", adresse: "Weststrasse 4, 12345 Musterstadt" } }),
  ]);

  const leiterPw = await bcrypt.hash("leiter1234", 12);
  const leiterDaten = [
    { name: "Anna Nord", email: "anna@verwaltung.de", filialeId: "filiale-nord" },
    { name: "Ben Sued", email: "ben@verwaltung.de", filialeId: "filiale-sued" },
    { name: "Clara Ost", email: "clara@verwaltung.de", filialeId: "filiale-ost" },
    { name: "David West", email: "david@verwaltung.de", filialeId: "filiale-west" },
  ];

  for (const l of leiterDaten) {
    const leiter = await prisma.user.upsert({
      where: { email: l.email },
      update: {},
      create: { name: l.name, email: l.email, password: leiterPw, role: "FILIALLEITER" },
    });
    await prisma.userFiliale.upsert({
      where: { userId_filialeId: { userId: leiter.id, filialeId: l.filialeId } },
      update: {},
      create: { userId: leiter.id, filialeId: l.filialeId, isPrimary: true, isLeiter: true },
    });
    await prisma.contract.upsert({
      where: { userId: leiter.id },
      update: {},
      create: { userId: leiter.id, istVollzeit: true, sollStunden: 38.5, eintrittsDatum: new Date("2022-01-01") },
    });
  }

  const mitarbeiterPw = await bcrypt.hash("mitarbeiter1234", 12);
  const mitarbeiterDaten = [
    { name: "Erika Muster", email: "erika@verwaltung.de", filialeId: "filiale-nord" },
    { name: "Fritz Beispiel", email: "fritz@verwaltung.de", filialeId: "filiale-nord" },
    { name: "Gabi Test", email: "gabi@verwaltung.de", filialeId: "filiale-sued" },
    { name: "Hans Demo", email: "hans@verwaltung.de", filialeId: "filiale-ost" },
  ];

  for (const m of mitarbeiterDaten) {
    const user = await prisma.user.upsert({
      where: { email: m.email },
      update: {},
      create: { name: m.name, email: m.email, password: mitarbeiterPw, role: "MITARBEITER" },
    });
    await prisma.userFiliale.upsert({
      where: { userId_filialeId: { userId: user.id, filialeId: m.filialeId } },
      update: {},
      create: { userId: user.id, filialeId: m.filialeId, isPrimary: true, isLeiter: false },
    });
    await prisma.contract.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, istVollzeit: true, sollStunden: 38.5, eintrittsDatum: new Date("2023-03-01") },
    });
  }

  console.log("Seed abgeschlossen!");
  console.log("Chef:         chef@verwaltung.de / chef1234");
  console.log("Filialleiter: anna@verwaltung.de / leiter1234");
  console.log("Mitarbeiter:  erika@verwaltung.de / mitarbeiter1234");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
