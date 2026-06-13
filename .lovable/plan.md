
# SERBAKU – Master Improvement Batch 2

Permintaan ini berisi **18 fitur besar** (A–Q). Jika dikerjakan sekaligus dalam satu turn, risikonya sangat tinggi: migrasi DB banyak, perubahan UI di hampir semua halaman, dan kemungkinan merusak fitur existing (checkout, membership, voucher, flash sale) — yang justru Anda larang.

Saya usulkan **memecah pekerjaan ke dalam 5 fase**. Setiap fase berdiri sendiri, bisa dites, dan tidak mengganggu fitur lain. Setelah Anda setujui rencana ini, saya kerjakan **Fase 1 dulu**, lalu lanjut ke fase berikutnya satu per satu.

---

## Fase 1 — Foundation Data & Penjualan (A, B, L)
Tanpa ini, fitur lain (terlaris, badge, social proof) tidak punya angka.

- **A. Mode Manual/Otomatis** — kolom `display_mode` di `site_settings` + tabel `manual_featured_products` (produk unggulan/terlaris manual).
- **B. Terjual X pcs** — view `product_sales_stats` (SUM qty dari `order_items` JOIN `orders` status=`selesai`). Tampilkan di Katalog, Flash Sale, Detail Produk.
- **L. Flash Sale Improvement** — tampilkan harga normal dicoret, harga flash, badge "Hemat X%" di kartu Flash Sale.

## Fase 2 — Homepage Dinamis (C, D, F, I, J)
- **C. Terlaris Minggu Ini** (7 hari) + **D. Terlaris Bulan Ini** (30 hari) — section homepage, fallback ke manual jika kosong.
- **F. Statistik Toko** — total produk terjual, total pelanggan, total order selesai (manual/otomatis).
- **I. Badge Produk** — Terlaris/Trending/Baru otomatis dari stats; override manual via admin.
- **J. Social Proof Ticker** — notifikasi berjalan dari order selesai (anonim: "Reseller Jakarta membeli 12 pcs").

## Fase 3 — Customer Experience (E, H)
- **E. Customer Juga Membeli** — di Detail Produk, prioritas: kategori sama → terlaris → frequently-bought-together.
- **H. Wishlist** — tabel `wishlists`, tombol ❤ di kartu produk + detail produk, menu "Wishlist Saya" di akun.

## Fase 4 — Admin Operasional (G, M, N, Q)
- **G. Export XLSX Pesanan** — tombol export di /admin/pesanan dengan filter status.
- **M. Stok Menipis** — widget dashboard, stok ≤ 10, urut terendah.
- **N. Produk Tidak Bergerak** — widget dashboard, ≥60 hari tanpa terjual, aksi Arsipkan/Flash Sale/Hapus.
- **Q. Global Search** — search bar di header admin, hasil real-time (produk/pesanan/pelanggan/voucher/flash sale).

## Fase 5 — Audit & Backup (K, O, P)
- **K. Riwayat Perubahan Harga** — tabel `product_price_history` + trigger auto-log saat `products.price` berubah.
- **O. Activity Log** — tabel `activity_logs`, dicatat dari server fn (add/edit/delete produk, ubah harga, buat flash sale/voucher).
- **P. Backup Data** — di /admin/pengaturan, export Produk/Pelanggan/Pesanan ke XLSX/CSV.

---

## Aturan yang saya patuhi di semua fase

- Tidak menyentuh: checkout, membership tier logic, voucher logic, flash sale engine yang sudah berjalan.
- Semua tabel baru: RLS enabled + GRANT eksplisit + policy scoped ke `auth.uid()` atau admin role.
- Semua server fn baru: `requireSupabaseAuth` + cek `has_role('admin')` untuk operasi admin.
- Semua UI baru: loading state, empty state, error handling, responsive mobile & desktop.
- Tidak ada penghapusan komponen/route existing.

---

## Detail teknis singkat (untuk referensi)

```text
Tabel baru:
  manual_featured_products(slot, product_id, position)   -- Fase 1
  wishlists(user_id, product_id)                          -- Fase 3
  product_price_history(product_id, old, new, by, at)    -- Fase 5
  activity_logs(admin_id, action, entity, entity_id, meta, at) -- Fase 5

View/RPC baru:
  product_sales_stats             -- total qty terjual per produk
  top_products_window(days int)   -- terlaris N hari
  store_stats                     -- agregat homepage

Kolom baru:
  site_settings.display_mode jsonb  -- {featured:'auto'|'manual', stats:..., ...}
  products.manual_badge text         -- override badge admin

Server fn baru (semua di src/lib/*.functions.ts):
  exportOrdersXlsx, exportBackup, globalSearch, toggleWishlist,
  setManualFeatured, getCustomerAlsoBought, getTopProducts, getStoreStats
```

XLSX dibuat dengan `xlsx` (SheetJS) — Worker-compatible.

---

## Pertanyaan sebelum mulai

1. Setuju dengan urutan fase di atas? Atau ada fase yang ingin diprioritaskan duluan?
2. Untuk **Social Proof (J)**: nama kota diambil dari `orders.city` (asli) atau di-mask jadi pseudonim ("Reseller [Kota]")? Saya rekomendasikan menampilkan kota asli + nama disamarkan.
3. Untuk **Backup (P)**: cukup export on-demand (klik tombol → download), atau perlu jadwal otomatis (mingguan)?

Setelah Anda jawab, saya mulai **Fase 1**.
