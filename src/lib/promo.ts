// Promo helpers — flash sale (dari tabel flash_sale_items), diskon produk, dan kombinasi dengan membership.
// Aturan: ambil diskon yang LEBIH menguntungkan pelanggan (per pcs).

export type ProductPromo = {
  price: number;
  discountType?: "none" | "percent" | "nominal" | null;
  discountValue?: number | null;
  flashPrice?: number | null;
  flashStartAt?: string | null;
  flashEndAt?: string | null;
};

export type FlashSaleItemJoin = {
  discount_type: "percent" | "nominal";
  discount_value: number;
  flash_sales: { starts_at: string; ends_at: string; is_active: boolean } | null;
};

// Pilih flash sale aktif terbaik (paling murah) untuk produk.
export function resolveFlashFromItems(
  price: number,
  items: FlashSaleItemJoin[] | null | undefined,
  now: Date = new Date(),
): { flashPrice: number | null; flashStartAt: string | null; flashEndAt: string | null } {
  if (!items?.length) return { flashPrice: null, flashStartAt: null, flashEndAt: null };
  const t = now.getTime();
  let best: { unit: number; start: string; end: string } | null = null;
  for (const it of items) {
    const fs = it.flash_sales;
    if (!fs || !fs.is_active) continue;
    const s = new Date(fs.starts_at).getTime();
    const e = new Date(fs.ends_at).getTime();
    if (t < s || t > e) continue;
    const unit =
      it.discount_type === "percent"
        ? Math.max(0, Math.round(price * (1 - Number(it.discount_value) / 100)))
        : Math.max(0, price - Number(it.discount_value));
    if (!best || unit < best.unit) best = { unit, start: fs.starts_at, end: fs.ends_at };
  }
  if (!best) return { flashPrice: null, flashStartAt: null, flashEndAt: null };
  return { flashPrice: best.unit, flashStartAt: best.start, flashEndAt: best.end };
}

export function flashActive(p: ProductPromo, now: Date = new Date()): boolean {
  if (!p.flashPrice || p.flashPrice <= 0) return false;
  const start = p.flashStartAt ? new Date(p.flashStartAt).getTime() : -Infinity;
  const end = p.flashEndAt ? new Date(p.flashEndAt).getTime() : Infinity;
  const t = now.getTime();
  return t >= start && t <= end;
}

// Harga "promo produk" per pcs (TANPA membership). Mengembalikan harga normal jika tidak ada promo.
export function productPromoUnit(p: ProductPromo, now: Date = new Date()): number {
  const base = Number(p.price) || 0;
  if (flashActive(p, now)) {
    return Math.max(0, Math.min(base, Number(p.flashPrice) || base));
  }
  if (p.discountType === "percent" && Number(p.discountValue) > 0) {
    return Math.max(0, Math.round(base * (1 - Number(p.discountValue) / 100)));
  }
  if (p.discountType === "nominal" && Number(p.discountValue) > 0) {
    return Math.max(0, base - Number(p.discountValue));
  }
  return base;
}

// Pilih diskon per pcs terbesar antara promo produk dan membership.
export function bestUnitPrice(
  p: ProductPromo,
  membershipPerPcs: number,
  now: Date = new Date(),
): { unit: number; basis: "promo" | "member" | "none"; saved: number } {
  const base = Number(p.price) || 0;
  const promoUnit = productPromoUnit(p, now);
  const promoSave = base - promoUnit;
  const memberSave = Math.max(0, membershipPerPcs);
  if (promoSave <= 0 && memberSave <= 0) return { unit: base, basis: "none", saved: 0 };
  if (promoSave >= memberSave) return { unit: promoUnit, basis: "promo", saved: promoSave };
  return { unit: Math.max(0, base - memberSave), basis: "member", saved: memberSave };
}

export function formatCountdown(end: string | null | undefined, now: Date = new Date()): string | null {
  if (!end) return null;
  const ms = new Date(end).getTime() - now.getTime();
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}h ${pad(h)}:${pad(m)}:${pad(ss)}`;
  return `${pad(h)}:${pad(m)}:${pad(ss)}`;
}

export type CountdownParts = { days: number; hours: number; minutes: number; seconds: number } | null;
export function countdownParts(end: string | null | undefined, now: Date = new Date()): CountdownParts {
  if (!end) return null;
  const ms = new Date(end).getTime() - now.getTime();
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}
