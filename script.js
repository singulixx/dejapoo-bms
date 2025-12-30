/**
 * Seed initial OWNER user.
 *
 * Usage:
 *   node script.js --username=owner --password='Owner#123'
 *
 * Env alternative:
 *   OWNER_USERNAME=owner OWNER_PASSWORD='Owner#123' node script.js
 */
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function getArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

async function main() {
  const username = (getArg("username") || process.env.OWNER_USERNAME || "").trim();
  const password = getArg("password") || process.env.OWNER_PASSWORD;

  if (!username || !password) {
    console.log("Missing username/password.");
    console.log("Example: node script.js --username=owner --password='Owner#123'");
    process.exit(1);
  }

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) {
    console.log(`User already exists: ${username} (role=${exists.role})`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      username,
      passwordHash,
      role: "OWNER",
      isActive: true,
      mustChangePassword: false,
    },
  });

  console.log(`✅ Created OWNER: ${username}`);
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
