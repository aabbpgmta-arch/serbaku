// Promo helpers — flash sale, diskon produk, dan kombinasi dengan diskon membership.
// Aturan: ambil diskon yang LEBIH menguntungkan pelanggan (per pcs).

export type ProductPromo = {
  price: number; // harga normal per pcs
  discountType?: "none" | "percent" | "nominal" | null;
  discountValue?: number | null;
  flashPrice?: number | null;
  flashStartAt?: string | null;
  flashEndAt?: string | null;
};

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
  if (d > 0) return `${d}h ${h}j ${m}m`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
