# NextAdmin - Next.js Admin Dashboard Template and Components

**NextAdmin** is a Free, open-source Next.js admin dashboard toolkit featuring 200+ UI components and templates that come with pre-built elements, components, pages, high-quality design, integrations, and much more to help you create powerful admin dashboards with ease.


[![nextjs admin template](https://cdn.pimjo.com/nextadmin-2.png)](https://nextadmin.co/)


**NextAdmin** provides you with a diverse set of dashboard UI components, elements, examples and pages necessary for creating top-notch admin panels or dashboards with **powerful** features and integrations. Whether you are working on a complex web application or a basic website, **NextAdmin** has got you covered.

### [✨ Visit Website](https://nextadmin.co/)
### [🚀 Live Demo](https://demo.nextadmin.co/)
### [📖 Docs](https://docs.nextadmin.co/)

By leveraging the latest features of **Next.js 14** and key functionalities like **server-side rendering (SSR)**, **static site generation (SSG)**, and seamless **API route integration**, **NextAdmin** ensures optimal performance. With the added benefits of **React 18 advancements** and **TypeScript** reliability, **NextAdmin** is the ultimate choice to kickstart your **Next.js** project efficiently.

## Installation

1. Download/fork/clone the repo and Once you're in the correct directory, it's time to install all the necessary dependencies. You can do this by typing the following command:

```
npm install
```
If you're using **Yarn** as your package manager, the command will be:

```
yarn install
```

2. Okay, you're almost there. Now all you need to do is start the development server. If you're using **npm**, the command is:

```
npm run dev
```
And if you're using **Yarn**, it's:

```
yarn dev
```

And voila! You're now ready to start developing. **Happy coding**!

---

# Dejapoo Brand Management System (MVP)

## Environment Variables

- `DATABASE_URL` (PostgreSQL)
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` (bootstrap admin)
- `WEBHOOK_SECRET_SHOPEE` (header `x-webhook-secret`)
- `WEBHOOK_SECRET_TIKTOK` (header `x-webhook-secret`)

## Webhook Endpoints (for Vercel)

- Shopee: `POST /api/integrations/shopee/webhook`
- TikTok: `POST /api/integrations/tiktok/webhook`

Payload format is intentionally loose. Recommended normalized shape:

```json
{
  "externalOrderId": "ORDER-123",
  "status": "PAID",
  "items": [{"externalSkuId": "SKU-ABC", "qty": 2, "price": 99000}],
  "note": "optional"
}
```

To make webhook orders reduce stock correctly, map marketplace SKU to internal variant via the Marketplace Mapping endpoint/UI.

## Highlighted Features
**200+ Next.js Dashboard Ul Components and Templates** - includes a variety of prebuilt **Ul elements, components, pages, and examples** crafted with a high-quality design.
Additionally, features seamless **essential integrations and extensive functionalities**.

- A library of over **200** professional dashboard UI components and elements.
- Five distinctive dashboard variations, catering to diverse use-cases.
- A comprehensive set of essential dashboard and admin pages.
- More than **45** **Next.js** files, ready for use.
- Styling facilitated by **Tailwind CSS** files.
- A design that resonates premium quality and high aesthetics.
- A handy UI kit with assets.
- Over ten web apps complete with examples.
- Support for both **dark mode** and **light mode**.
- Essential integrations including - Authentication (**NextAuth**), Database (**Postgres** with **Prisma**), and Search (**Algolia**).
- Detailed and user-friendly documentation.
- Customizable plugins and add-ons.
- **TypeScript** compatibility.
- Plus, much more!

All these features and more make **NextAdmin** a robust, well-rounded solution for all your dashboard development needs.

## Update Logs

### Version 1.2.2 - [December 01, 2025]
- Updated to Next.js 16
- Updated dependencies.

### Version 1.2.1 - [Mar 20, 2025]
- Fix Peer dependency issues and NextConfig warning.
- Updated apexcharts and react-apexhcarts to the latest version.

### Version 1.2.0 - Major Upgrade and UI Improvements - [Jan 27, 2025]

- Upgraded to Next.js v15 and updated dependencies
- API integration with loading skeleton for tables and charts.
- Improved code structure for better readability.
- Rebuilt components like dropdown, sidebar, and all ui-elements using accessibility practices.
- Using search-params to store dropdown selection and refetch data.
- Semantic markups, better separation of concerns and more.

### Version 1.1.0
- Updated Dependencies
- Removed Unused Integrations
- Optimized App

### Version 1.0
- Initial Release - [May 13, 2024]


## Realtime Notifikasi (Pusher) + Deploy ke Vercel

Project ini sudah siap realtime notifikasi pakai **Pusher** (private channel per user & role), jadi aman dipakai di Vercel (serverless).

### 1) Buat app di Pusher
- Dashboard Pusher → Create app → pilih cluster (contoh: `ap1` / Singapore).
- Ambil credentials: **APP_ID**, **KEY**, **SECRET**, **CLUSTER**.

### 2) Set environment variables
Isi env berikut (Local: `.env`, Vercel: Project Settings → Environment Variables):

```bash
# Server-side
PUSHER_APP_ID="xxx"
PUSHER_KEY="xxx"
PUSHER_SECRET="xxx"
PUSHER_CLUSTER="ap1"

# Client-side (harus NEXT_PUBLIC_)
NEXT_PUBLIC_PUSHER_KEY="xxx"
NEXT_PUBLIC_PUSHER_CLUSTER="ap1"
```

> Catatan: kalau env Pusher belum di-set, aplikasi tetap jalan tapi realtime tidak aktif (fallback ke load awal).

### 3) Cara kerja channel/event
- Channel user: `private-user-<userId>`
- Channel role: `private-role-<ROLE>`
- Event: `notification:new`

Server akan melakukan trigger saat membuat notifikasi via `createAndEmitNotification()`.

### 4) Vercel
- Pastikan semua env di atas diset untuk **Production** (dan Preview kalau perlu).
- Deploy biasa (Next.js App Router). Tidak perlu websocket server backend; Pusher handle realtime-nya.

## Setup (Supabase Postgres)

1) Copy `.env.example` to `.env` and fill:
- `DATABASE_URL` = Supabase pooled/transaction (pgbouncer) URL (commonly `POSTGRES_PRISMA_URL`)
- `DIRECT_URL` = Supabase direct/session URL (commonly `POSTGRES_URL_NON_POOLING`)
- `JWT_SECRET` = random long secret

2) Create tables:
```bash
npx prisma generate
npx prisma migrate dev --name init
```

3) Create first user:
```bash
npm run create-user -- --username=owner --password="Owner#123" --role=OWNER
```

4) Run the app:
```bash
npm run dev
```
