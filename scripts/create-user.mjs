import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

/**
 * Create an app user (username + password) directly in the database.
 *
 * Examples:
 *   npm run create-user -- --username=owner --password='Owner#123' --role=OWNER
 *   npm run create-user -- owner Owner#123 OWNER
 */

const prisma = new PrismaClient();

function getArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function sanitizeRole(role) {
  if (!role) return "STAFF";
  return String(role).trim().toUpperCase();
}

async function main() {
  // Supports both:
  // 1) npm run create-user -- <username> <password> [ROLE]
  // 2) npm run create-user -- --username=... --password=... [--role=...]
  const username = (getArg("username") ?? process.argv[2])?.trim();
  const password = getArg("password") ?? process.argv[3];
  const role = sanitizeRole(getArg("role") ?? process.argv[4]);

  if (!username || !password) {
    console.log(
      "Usage:\n" +
        "  npm run create-user -- <username> <password> [ROLE]\n" +
        "  npm run create-user -- --username=USER --password=PASS --role=ROLE\n\n" +
        "Roles are free-form strings in DB (recommended: OWNER, ADMIN, WAREHOUSE, STAFF)."
    );
    process.exit(1);
  }

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) {
    console.error("❌ Username already exists.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      username,
      passwordHash,
      isActive: true,
      // Keep role flexible (stored as VARCHAR)
      role,
    },
  });

  console.log(`✅ Created user: ${username} (role=${role})`);
}

main()
  .catch((e) => {
    if (e?.code === "P2002") {
      console.error("❌ Username already exists.");
    } else {
      console.error("❌ Failed:", e);
    }
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
