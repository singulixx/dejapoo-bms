# Prisma migrations reset (MySQL -> PostgreSQL)

This project was migrated from MySQL to PostgreSQL (Supabase). Prisma migrations created for MySQL
are not compatible with PostgreSQL.

What changed:
- `prisma/migrations/` has been removed so `prisma migrate dev` starts a fresh PostgreSQL migration history.
- Old MySQL migrations are kept in `prisma/migrations_mysql_backup/` (if present).

Next steps:
1) Set `.env`:
   - `DATABASE_URL` = Supabase pooled/pgbouncer URL (Vercel env: `POSTGRES_PRISMA_URL`)
   - `DIRECT_URL`   = Supabase direct URL (Vercel env: `POSTGRES_URL_NON_POOLING`)
2) Run:
   - `npx prisma generate`
   - `npx prisma migrate dev --name init`

