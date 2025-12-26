import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.log("Usage: npm run create-admin -- <username> <password>");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: { username, passwordHash, isActive: true },
  });

  console.log(`✅ Created admin user: ${username}`);
}

main()
  .catch((e) => {
    if (e?.code === "P2002") console.error("❌ Username already exists.");
    else console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
