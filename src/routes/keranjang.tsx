import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatRupiah, roundToSix } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/keranjang")({
  head: () => ({ meta: [{ title: "Keranjang — Toko Serba" }, { name: "robots", content: "noindex" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, subtotal } = useCart();

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

        <aside className="h-fit rounded-2xl border border-border/60 bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Ringkasan</h2>
          <div className="mt-4 flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">{formatRupiah(subtotal)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-muted-foreground">Ongkir</span>
            <span className="text-muted-foreground">Dihitung saat checkout</span>
          </div>
          <div className="mt-4 flex justify-between border-t border-border pt-4 text-base font-bold">
            <span>Total</span>
            <span className="text-primary">{formatRupiah(subtotal)}</span>
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
        </aside>
      </div>
    </div>
  );
}
