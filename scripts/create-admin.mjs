import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function userModelHasField(fieldName) {
  try {
    const models = prisma?._dmmf?.datamodel?.models || [];
    const userModel = models.find((m) => m.name === "User");
    if (!userModel) return false;
    return userModel.fields.some((f) => f.name === fieldName);
  } catch {
    return false;
  }
}

async function main() {
  // Supports both:
  // 1) npm run create-admin -- <username> <password>
  // 2) npm run create-admin -- --username=... --password=... [--name=...] [--role=...]
  const username = getArg("username") ?? process.argv[2];
  const password = getArg("password") ?? process.argv[3];
  const name = getArg("name");
  const role = getArg("role");

  if (!username || !password) {
    console.log(
      "Usage:\n" +
        "  npm run create-admin -- <username> <password>\n" +
        '  npm run create-admin -- --username=USER --password=PASS --name="NAME"'
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const data = { username, passwordHash, isActive: true };
  // Add optional fields only if they exist in Prisma schema.
  if (name && userModelHasField("name")) data.name = name;
  if (role && userModelHasField("role")) data.role = role;

  await prisma.user.create({
    data,
  });

  console.log(`✅ Created admin user: ${username}`);
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
