# Toko Serba

Supplier grosir produk **Serba 35** dan **Serba 75** untuk reseller, toko serba harga, pedagang online, dan pembeli grosir di Indonesia.

Built with **TanStack Start** (React 19 + Vite 7) and **Supabase** (database, auth, storage).

---

## Tech Stack

- **Framework:** TanStack Start v1 (SSR + file-based routing in `src/routes/`)
- **UI:** React 19, Tailwind CSS v4, shadcn/ui (Radix primitives)
- **State / Data:** TanStack Query, TanStack Router loaders, `createServerFn`
- **Backend:** Supabase — Postgres + RLS, Auth, Storage
- **Typography:** Montserrat (headings) + Poppins (body)
- **Build target:** Edge runtime (Cloudflare Workers compatible)

---

## Project Structure

```
src/
├── routes/                    # File-based routes
│   ├── __root.tsx             # Root layout (head, providers, shell)
│   ├── index.tsx              # Homepage
│   ├── katalog.tsx            # Product catalog
│   ├── produk.$slug.tsx       # Product detail
│   ├── keranjang.tsx          # Cart
│   ├── checkout.tsx           # (auth-gated via parent layout pattern)
│   ├── auth.tsx               # Sign in / register
│   ├── _authenticated/        # Auth-required routes
│   │   ├── route.tsx          # Auth gate (ssr: false)
│   │   ├── akun/pesanan/      # Customer order history
│   │   └── _admin/admin/      # Admin dashboard
│   └── sitemap[.]xml.ts       # Dynamic sitemap
├── components/
│   ├── site/                  # Header, Footer, Logo, WhatsApp button
│   └── ui/                    # shadcn/ui components
├── lib/
│   ├── auth-context.tsx       # Auth provider (session + isAdmin)
│   ├── cart.tsx               # Cart provider (localStorage)
│   ├── site-settings.ts       # Editable site settings
│   ├── format.ts              # IDR formatting, qty helpers
│   └── order-status.ts        # Order status labels
├── integrations/supabase/     # Auto-generated clients — do NOT edit
└── styles.css                 # Tailwind v4 theme tokens
supabase/
├── migrations/                # SQL migrations (schema, RLS, grants, storage)
└── config.toml                # Supabase project config
```

---

## Prerequisites

- **Node.js** 20+ and **Bun** (recommended) or npm
- A **Supabase** project (free tier works)

---

## Local Development

```bash
# 1. Install dependencies
bun install
# or: npm install

# 2. Configure environment
cp .env.example .env
# Fill in your Supabase URL + keys

# 3. Run the dev server
bun run dev
# → http://localhost:5173
```

The dev server runs Vite with HMR. Routes auto-register from `src/routes/`; do **not** edit `src/routeTree.gen.ts` (auto-generated).

---

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Copy your project URL, publishable (anon) key, and service-role key into `.env`.
3. Apply the migrations in `supabase/migrations/` in chronological order — either via the Supabase SQL editor or the Supabase CLI:
   ```bash
   supabase link --project-ref YOUR-PROJECT-REF
   supabase db push
   ```
4. Create two storage buckets in the Supabase dashboard:
   - `product-images` — public read, admin write
   - `website-assets` — public read, admin write
   - `shipping-receipts` — private, admin read/write (customers see signed URLs)
5. (Optional) Enable Google OAuth in **Authentication → Providers** if you want social login.
6. Create your first admin: sign up via `/auth`, then in SQL editor:
   ```sql
   insert into public.user_roles (user_id, role)
   values ('<your-auth-user-id>', 'admin');
   ```

---

## Build

```bash
bun run build       # production build
bun run preview     # preview the production build locally
```

Output goes to `.output/` (server) and `.output/public/` (static assets).

---

## Deployment

This project targets **edge runtimes** (Cloudflare Workers via Nitro). It also runs on Node-based platforms.

### Cloudflare Pages / Workers
1. Push the repo to GitHub.
2. In Cloudflare Pages, connect the repo.
3. Build command: `bun run build`
4. Output directory: `.output/public`
5. Add the env variables from `.env.example` in the Pages dashboard.

### Vercel / Netlify
Both auto-detect TanStack Start. Add the same env variables in the project settings.

### Self-hosted (Node)
```bash
bun run build
node .output/server/index.mjs
```

---

## Environment Variables

See [`.env.example`](./.env.example). The rules:

- `VITE_*` — bundled into the browser. Safe for public keys only.
- Non-prefixed (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, …) — server-only, read inside `createServerFn` handlers.
- **Never** prefix the service-role key with `VITE_`.

---

## Features

- 🛒 Cart with 6-pack minimum quantity (kelipatan 6)
- 🔐 Email/password auth + optional Google OAuth
- 👤 Customer order history
- 🧑‍💼 Admin dashboard: products, orders, customers, site settings
- 🖼️ Image upload to Supabase Storage
- 📱 Fully responsive, mobile-first
- 🔎 SEO: per-route metadata, OG tags, sitemap.xml, robots.txt
- 💬 Floating WhatsApp contact button

---

## License

Proprietary — © Toko Serba. All rights reserved.
