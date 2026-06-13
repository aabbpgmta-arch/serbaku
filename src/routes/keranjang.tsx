import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag, Crown } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth-context";
import { tierMeta, discountForTier, nextTier } from "@/lib/membership";
import { formatRupiah, roundToSix } from "@/lib/format";

export const Route = createFileRoute("/keranjang")({
  head: () => ({ meta: [{ title: "Keranjang — Toko Serba" }, { name: "robots", content: "noindex" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, subtotal, totalQty } = useCart();
  const { user, membershipTier, lifetimeSpend } = useAuth();
  const tier = tierMeta(membershipTier);
  const discount = user ? discountForTier(membershipTier, totalQty) : 0;
  const grandTotal = Math.max(0, subtotal - discount);
  const next = nextTier(membershipTier);

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

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-bold">Keranjang Belanja</h1>
      <p className="mt-1 text-sm text-muted-foreground">Quantity wajib kelipatan 6 pcs.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {items.map((i) => (
            <div key={i.productId} className="flex gap-4 rounded-2xl border border-border/60 bg-card p-4">
              <Link to="/produk/$slug" params={{ slug: i.slug }} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                {i.image && <img src={i.image} alt={i.name} className="h-full w-full object-cover" />}
              </Link>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link to="/produk/$slug" params={{ slug: i.slug }} className="line-clamp-2 text-sm font-medium hover:text-primary">{i.name}</Link>
                  <p className="mt-0.5 text-sm text-muted-foreground">{formatRupiah(i.price)} / pcs</p>
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
                    <p className="font-display text-base font-bold">{formatRupiah(i.price * i.qty)}</p>
                    <button onClick={() => remove(i.productId)} className="mt-1 inline-flex items-center gap-1 text-xs text-destructive hover:underline">
                      <Trash2 className="h-3 w-3" /> Hapus
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
                <p className="mt-2 text-xs">Diskon <b>{formatRupiah(tier.discountPerPcs)}/pcs</b> otomatis aktif.</p>
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
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Diskon Member {tier.label} ({formatRupiah(tier.discountPerPcs)}×{totalQty} pcs)</span>
                  <span className="font-semibold">-{formatRupiah(discount)}</span>
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
