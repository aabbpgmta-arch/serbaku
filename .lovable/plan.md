
# Rencana Pembangunan Website Toko Serba

Saya akan membangun website grosir Toko Serba secara lengkap. Karena scope-nya sangat besar, saya akan kerjakan secara bertahap dalam beberapa fase. Berikut rencananya:

## Fase 1 — Fondasi (saya kerjakan dulu di pesan ini setelah Anda setujui)

1. **Aktifkan Lovable Cloud (Supabase)** sebagai backend.
2. **Design system** — tema soft pink, dusty pink, cream, premium feminine di `src/styles.css`.
3. **Database schema** (migration):
   - `profiles` (id, full_name, whatsapp, email, address, city, province, postal_code)
   - `user_roles` + enum `app_role` (admin/customer) + fungsi `has_role`
   - `products` (nama, harga, kategori, stok, deskripsi, is_bestseller, is_new, is_active)
   - `product_images` (product_id, url, sort_order, is_cover)
   - `orders` (user_id, total, status, shipping info, payment_proof_url, tracking_no, shipping_payer)
   - `order_items` (order_id, product_id, qty, price)
   - `site_settings` (key/value JSONB — logo, kontak, banner, warna, footer)
   - `homepage_banners`, `homepage_sections` (keunggulan), `website_categories`, `testimonials`
   - RLS lengkap untuk tiap tabel + GRANT untuk authenticated/anon/service_role
4. **Storage buckets**: `product-images` (public), `payment-proofs` (private), `shipping-receipts` (private), `website-assets` (public) + policies.
5. **Auth**: Email/password + Google sign-in. Trigger auto-create profile saat signup. Akun `xavirafashion@gmail.com` diberi role admin (otomatis lewat trigger saat akun tersebut signup, atau langsung di-seed).
6. **Layout publik** — header (logo, nav, cart, akun), footer, tombol WA floating.
7. **Homepage** — hero banner, kategori, keunggulan, produk terlaris/baru, testimoni (data dari Supabase).

## Fase 2 — Katalog & Checkout

- Halaman `/katalog` dengan filter (Serba 35, Serba 75, Terlaris, Baru) + search.
- Halaman detail produk `/produk/$slug` dengan galeri, qty kelipatan 6, related products.
- Keranjang (state lokal + sync ke Supabase saat login) dengan validasi kelipatan 6.
- Checkout → buat `orders` + `order_items`, status awal "Menunggu Pembayaran".
- Halaman `/akun/pesanan` (riwayat customer) + `/akun/pesanan/$id` (detail + upload bukti transfer).

## Fase 3 — Dashboard Admin

- Guard route `/admin/*` (cek role admin via `has_role`).
- `/admin` — stats (total produk, pesanan, pelanggan, omzet) + recent items.
- `/admin/produk` — CRUD produk + upload max 8 foto + reorder + aktif/nonaktif.
- `/admin/pesanan` — list + ubah status + upload resi.
- `/admin/pelanggan` — list pelanggan + statistik.
- `/admin/pengaturan` — CMS: logo, banner, kontak, keunggulan, kategori homepage, testimoni, footer, warna tema (disimpan ke `site_settings`, dibaca oleh layout publik).

## Fase 4 — SEO & Polish

- Meta tags per route (title, description, og:*) dengan kata kunci grosir.
- `sitemap.xml`, `robots.txt`.
- QA mobile responsive.

## Teknis

- **Stack**: TanStack Start + React 19 + Tailwind v4 + shadcn (sudah ada).
- **Backend**: Lovable Cloud (Supabase) — server functions via `createServerFn` untuk operasi sensitif, browser client untuk auth/realtime.
- **Auth**: route `_authenticated/` untuk customer, `_authenticated/_admin/` untuk admin (gate via `has_role`).
- **Google sign-in** lewat `lovable.auth.signInWithOAuth("google")`.
- **State keranjang**: Zustand atau React Context + localStorage, sync ke Supabase saat login.

## Catatan

- Fase 1 dimulai dalam pesan ini setelah Anda setujui plan. Fase 2–4 saya kerjakan di pesan-pesan berikutnya supaya tidak terlalu panjang dan mudah Anda review.
- Fitur "Prioritas Nanti" (upload bukti transfer, upload resi, notifikasi WhatsApp, opsi ongkir) saya masukkan ke Fase 2 & 3 karena sudah ada di schema.
- Notifikasi WhatsApp otomatis butuh integrasi pihak ketiga berbayar — untuk versi ini saya hanya akan menyediakan tombol "Kirim update via WhatsApp" yang membuka chat WA dengan template pesan siap kirim.

Setujui plan ini supaya saya mulai eksekusi Fase 1?
