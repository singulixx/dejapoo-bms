# Prisma migrations for Supabase Postgres

The project previously used MySQL. Those migrations were moved to:

- `prisma/migrations_mysql_backup/`

MySQL migration SQL is not compatible with Postgres, so you should generate fresh migrations for Supabase.

## 1) Set env vars

Make sure you have **both**:

- `DATABASE_URL` (pooled/transaction mode)
- `DIRECT_URL` (direct/session mode)

You can copy them from Supabase: **Project Settings → Database → Connection string**.

## 2) Generate a fresh Postgres migration (local)

```bash
npx prisma generate
npx prisma migrate dev --name init
```

## 3) Deploy migrations on Vercel

After pushing your new `prisma/migrations/*`, use:

```bash
npx prisma migrate deploy
```

## Quick alternative (not recommended long term)

If you just want to create tables without migrations:

```bash
npx prisma db push
```

For the MVP roadmap (auditability), prefer migrations.
