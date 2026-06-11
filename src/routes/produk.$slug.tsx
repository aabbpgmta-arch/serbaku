import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Minus, Plus, Package, ShoppingBag, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah, roundToSix } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/produk/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("products")
      .select("*, product_images(id,url,is_cover,sort_order)")
      .eq("slug", params.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !data) throw notFound();
    return { product: data };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.product.name} — Toko Serba` },
      { name: "description", content: (loaderData?.product.description ?? "").slice(0, 155) || `Beli grosir ${loaderData?.product.name} di Toko Serba.` },
      { property: "og:title", content: `${loaderData?.product.name} — Toko Serba` },
      { property: "og:type", content: "product" },
    ],
  }),
  component: ProductPage,
  notFoundComponent: () => <div className="container-page py-20 text-center text-muted-foreground">Produk tidak ditemukan.</div>,
});

type Img = { id: string; url: string; is_cover: boolean; sort_order: number };

function ProductPage() {
  const { product } = Route.useLoaderData();
  const images = ((product.product_images ?? []) as Img[]).sort((a, b) =>
    a.is_cover && !b.is_cover ? -1 : !a.is_cover && b.is_cover ? 1 : a.sort_order - b.sort_order,
  );
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(6);
  const { add } = useCart();

  const { data: related } = useQuery({
    queryKey: ["related", product.id, product.category],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, product_images(url, is_cover)")
        .eq("is_active", true)
        .eq("category", product.category)
        .neq("id", product.id)
        .limit(4);
      return data ?? [];
    },
  });

  const cover = images[active]?.url ?? null;

  return (
    <div className="container-page py-10">
      <Link to="/katalog" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Kembali ke katalog
      </Link>

      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-3xl bg-muted">
            {cover ? (
              <img src={cover} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center bg-gradient-to-br from-primary-soft/40 to-accent text-primary">
                <Package className="h-16 w-16" />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActive(i)}
                  className={`aspect-square overflow-hidden rounded-xl border-2 transition ${
                    i === active ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap gap-1.5">
            {product.category === "serba_35" && <Badge variant="secondary" className="bg-primary-soft/60 text-foreground">Serba 35</Badge>}
            {product.category === "serba_75" && <Badge variant="secondary" className="bg-accent text-foreground">Serba 75</Badge>}
            {product.is_bestseller && <Badge className="bg-primary text-primary-foreground">Terlaris</Badge>}
            {product.is_new && <Badge variant="outline">Produk Baru</Badge>}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">{product.name}</h1>
          <p className="mt-3 font-display text-3xl font-bold text-primary">{formatRupiah(product.price)}<span className="ml-1 text-sm font-normal text-muted-foreground">/pcs</span></p>
          <p className="mt-1 text-sm text-muted-foreground">Stok tersedia: <span className="font-semibold text-foreground">{product.stock}</span></p>

          <div className="mt-6 rounded-2xl border border-primary/30 bg-primary-soft/20 p-4">
            <p className="text-sm font-semibold text-foreground">Minimal pembelian 6 pcs</p>
            <p className="text-xs text-muted-foreground">Grosir kelipatan 6 pcs (6, 12, 18, 24, ...)</p>
          </div>

          {product.description && (
            <div className="mt-6">
              <h2 className="font-display text-lg font-semibold">Deskripsi</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-foreground/80">{product.description}</p>
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <div className="inline-flex items-center rounded-full border border-border bg-card">
              <button type="button" onClick={() => setQty((q) => Math.max(6, q - 6))} className="grid h-11 w-11 place-items-center rounded-l-full hover:bg-accent" aria-label="Kurang">
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                step={6}
                min={6}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value) || 6)}
                onBlur={() => setQty(roundToSix(qty))}
                className="w-16 bg-transparent text-center text-base font-semibold outline-none"
              />
              <button type="button" onClick={() => setQty((q) => q + 6)} className="grid h-11 w-11 place-items-center rounded-r-full hover:bg-accent" aria-label="Tambah">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <span className="text-xs text-muted-foreground">pcs</span>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="gap-2"
              disabled={product.stock < 6}
              onClick={() => {
                const cover0 = images[0]?.url ?? null;
                add({ productId: product.id, name: product.name, slug: product.slug, price: Number(product.price), image: cover0, stock: product.stock }, qty);
                toast.success(`${product.name} ditambahkan ke keranjang`);
              }}
            >
              <ShoppingBag className="h-4 w-4" /> Tambah ke Keranjang
            </Button>
          </div>
        </div>
      </div>

      {related && related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold">Produk Terkait</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((r) => {
              const c = r.product_images?.find((i) => i.is_cover)?.url ?? r.product_images?.[0]?.url ?? null;
              return (
                <Link key={r.id} to="/produk/$slug" params={{ slug: r.slug }} className="group">
                  <div className="aspect-square overflow-hidden rounded-2xl bg-muted">
                    {c ? <img src={c} alt={r.name} className="h-full w-full object-cover transition group-hover:scale-105" /> :
                      <div className="grid h-full place-items-center text-primary"><Package className="h-8 w-8" /></div>}
                  </div>
                  <h3 className="mt-2 line-clamp-2 text-sm font-medium">{r.name}</h3>
                  <p className="font-display text-base font-bold text-primary">{formatRupiah(r.price)}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
