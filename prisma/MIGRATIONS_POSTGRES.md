# Prisma migrations note (PostgreSQL)

This project was migrated from **MySQL** to **PostgreSQL** (Prisma datasource provider).

The previous MySQL migrations have been moved to:
- `prisma/migrations_mysql_backup/`

Because Prisma migration SQL is **provider-specific**, those MySQL migration files should NOT be applied to PostgreSQL.

## What to do next

1) Point `DATABASE_URL` to your PostgreSQL database.
2) Recreate migrations for PostgreSQL:

- For local development (creates a new initial migration):
  - `npx prisma migrate dev --name init`

- If you prefer not to use migrations yet (quick start):
  - `npx prisma db push`

After generating new migrations, deploy using:
- `npx prisma migrate deploy`
