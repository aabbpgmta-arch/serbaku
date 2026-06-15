import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, Trash2, ShoppingBag, Crown, Flame, Timer, AlertTriangle } from "lucide-react";
import { useCart, type CartItem } from "@/lib/cart";
import { useAuth } from "@/lib/auth-context";
import { tierMeta, nextTier } from "@/lib/membership";
import { bestUnitPrice, flashActive, formatCountdown } from "@/lib/promo";
import { formatRupiah, roundToSix } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/keranjang")({
  head: () => ({ meta: [{ title: "Keranjang — Toko Serba" }, { name: "robots", content: "noindex" }] }),
  component: CartPage,
});

function promoOf(i: CartItem) {
  return {
    price: i.price,
    discountType: i.discountType ?? null,
    discountValue: i.discountValue ?? null,
    flashPrice: i.flashPrice ?? null,
    flashStartAt: i.flashStartAt ?? null,
    flashEndAt: i.flashEndAt ?? null,
  };
}

function CartPage() {
  const { items, setQty, remove, totalQty } = useCart();
  const { user, membershipTier, lifetimeSpend } = useAuth();
  const tier = tierMeta(membershipTier);
  const memberPerPcs = user ? tier.discountPerPcs : 0;
  const next = nextTier(membershipTier);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const anyFlash = items.some((i) => flashActive(promoOf(i)));
    if (!anyFlash) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="container-page py-20 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary-soft/40 text-primary">
          <ShoppingBag className="h-10 w-10" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold">Keranjang Kosong</h1>
        <p className="mt-2 text-sm text-muted-foreground">Mulai belanja grosir di katalog kami.</p>
        <Link to="/katalog" className="btn-hero mt-6">Lihat Katalog</Link>
      </div>
    );
  }

  const allValid = items.every((i) => i.qty % 6 === 0 && i.qty >= 6);

  let subtotal = 0;
  let totalDiscount = 0;
  let promoSavings = 0;
  let memberSavings = 0;
  const enriched = items.map((i) => {
    const best = bestUnitPrice(promoOf(i), memberPerPcs, now);
    subtotal += i.price * i.qty;
    totalDiscount += best.saved * i.qty;
    if (best.basis === "promo") promoSavings += best.saved * i.qty;
    if (best.basis === "member") memberSavings += best.saved * i.qty;
    return { item: i, best, lineTotal: best.unit * i.qty };
  });
  const grandTotal = Math.max(0, subtotal - totalDiscount);

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-bold">Keranjang Belanja</h1>
      <p className="mt-1 text-sm text-muted-foreground">Quantity wajib kelipatan 6 pcs.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {enriched.map(({ item: i, best, lineTotal }) => {
            const isFlash = flashActive(promoOf(i), now);
            const countdown = isFlash ? formatCountdown(i.flashEndAt, now) : null;
            const showStrike = best.unit < i.price;
            return (
              <div key={i.productId} className="flex gap-4 rounded-2xl border border-border/60 bg-card p-4">
                <Link to="/produk/$slug" params={{ slug: i.slug }} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {i.image && <img src={i.image} alt={i.name} className="h-full w-full object-cover" />}
                </Link>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <Link to="/produk/$slug" params={{ slug: i.slug }} className="line-clamp-2 text-sm font-medium hover:text-primary">{i.name}</Link>
                    <div className="mt-0.5 flex flex-wrap items-baseline gap-2 text-sm">
                      <span className="font-semibold text-foreground">{formatRupiah(best.unit)} <span className="text-xs font-normal text-muted-foreground">/pcs</span></span>
                      {showStrike && <span className="text-xs text-muted-foreground line-through">{formatRupiah(i.price)}</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {isFlash && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white"><Flame className="h-2.5 w-2.5" /> Flash</span>
                      )}
                      {countdown && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700"><Timer className="h-2.5 w-2.5" /> {countdown}</span>
                      )}
                      {best.basis === "member" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"><Crown className="h-2.5 w-2.5" /> Diskon Member</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="inline-flex items-center rounded-full border border-border">
                      <button onClick={() => setQty(i.productId, Math.max(6, i.qty - 6))} className="grid h-9 w-9 place-items-center hover:bg-accent" aria-label="Kurang"><Minus className="h-4 w-4" /></button>
                      <input
                        type="number" min={6} step={6} value={i.qty}
                        onChange={(e) => setQty(i.productId, Number(e.target.value) || 6)}
                        onBlur={(e) => setQty(i.productId, roundToSix(Number(e.target.value) || 6))}
                        className="w-12 bg-transparent text-center text-sm font-semibold outline-none"
                      />
                      <button onClick={() => setQty(i.productId, i.qty + 6)} className="grid h-9 w-9 place-items-center hover:bg-accent" aria-label="Tambah"><Plus className="h-4 w-4" /></button>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-base font-bold">{formatRupiah(lineTotal)}</p>
                      <button onClick={() => remove(i.productId)} className="mt-1 inline-flex items-center gap-1 text-xs text-destructive hover:underline">
                        <Trash2 className="h-3 w-3" /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <aside className="h-fit space-y-4">
          {user && (
            <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary-soft/30 to-accent/40 p-4">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${tier.color}`}>
                  <Crown className="h-3 w-3" /> Member {tier.label}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">Total belanja: {formatRupiah(lifetimeSpend)}</span>
              </div>
              {tier.discountPerPcs > 0 ? (
                <p className="mt-2 text-xs">Diskon <b>{formatRupiah(tier.discountPerPcs)}/pcs</b> otomatis aktif (atau diskon promo, mana yang lebih besar).</p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Belum dapat diskon membership.</p>
              )}
              {next && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatRupiah(Math.max(0, next.minSpend - lifetimeSpend))} lagi untuk naik ke <b>{next.label}</b>.
                </p>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <h2 className="font-display text-lg font-semibold">Ringkasan</h2>
            <div className="mt-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal ({totalQty} pcs)</span>
                <span className="font-semibold">{formatRupiah(subtotal)}</span>
              </div>
              {promoSavings > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Diskon Promo</span>
                  <span className="font-semibold">-{formatRupiah(promoSavings)}</span>
                </div>
              )}
              {memberSavings > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Diskon Member {tier.label}</span>
                  <span className="font-semibold">-{formatRupiah(memberSavings)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ongkir</span>
                <span className="text-muted-foreground">Dihitung saat checkout</span>
              </div>
            </div>
            <div className="mt-4 flex justify-between border-t border-border pt-4 text-base font-bold">
              <span>Total</span>
              <span className="text-primary">{formatRupiah(grandTotal)}</span>
            </div>
            {!allValid && (
              <p className="mt-3 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                Quantity wajib kelipatan 6 pcs untuk lanjut checkout.
              </p>
            )}
            <Link to="/checkout" disabled={!allValid} className="btn-hero mt-5 w-full" aria-disabled={!allValid} onClick={(e) => { if (!allValid) e.preventDefault(); }}>
              Lanjut ke Checkout
            </Link>
            <Link to="/katalog" className="mt-2 block w-full rounded-full border border-border bg-background py-2.5 text-center text-sm font-semibold hover:bg-accent">
              Lanjut Belanja
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
