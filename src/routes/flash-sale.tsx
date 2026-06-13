import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Flame, Timer, Package, LayoutGrid, Grid3x3, Grid2x2, List as ListIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/format";
import { resolveFlashFromItems, productPromoUnit, countdownParts, type FlashSaleItemJoin } from "@/lib/promo";
import { useSalesStats, formatSold } from "@/lib/sales-stats";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/flash-sale")({
  head: () => ({
    meta: [
      { title: "Flash Sale — Toko Serba" },
      { name: "description", content: "Promo Flash Sale terbatas waktu. Diskon spesial untuk produk grosir terpilih." },
      { property: "og:title", content: "Flash Sale — Toko Serba" },
      { property: "og:description", content: "Diskon Flash Sale grosir, hanya untuk waktu terbatas." },
    ],
  }),
  component: FlashSalePage,
});

type ViewMode = "large" | "medium" | "small" | "list";
const VIEW_GRID: Record<Exclude<ViewMode, "list">, string> = {
  large: "grid-cols-1 sm:grid-cols-2",
  medium: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  small: "grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
};

function FlashSalePage() {
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "medium";
    return (localStorage.getItem("flash_view") as ViewMode) || "medium";
  });
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("flash_view", view); }, [view]);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const { data: products, isLoading } = useQuery({
    queryKey: ["flash_sale_public"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      // Ambil item flash sale yang aktif & dalam window waktu, lalu join ke produk
      const { data, error } = await supabase
        .from("flash_sale_items")
        .select("discount_type, discount_value, flash_sales!inner(starts_at, ends_at, is_active), products!inner(id, name, slug, price, stock, is_active, category, is_bestseller, is_new, product_images(url, is_cover))")
        .eq("flash_sales.is_active", true)
        .lte("flash_sales.starts_at", nowIso)
        .gte("flash_sales.ends_at", nowIso);
      if (error) throw error;
      // Reduce: pilih flash terbaik per produk
      const byProduct: Record<string, { product: { id: string; name: string; slug: string; price: number; stock: number; category: string; is_bestseller: boolean; is_new: boolean; product_images: Array<{ url: string; is_cover: boolean }> }; items: FlashSaleItemJoin[] }> = {};
      for (const row of (data ?? [])) {
        const p = row.products as unknown as { id: string; name: string; slug: string; price: number; stock: number; is_active: boolean; category: string; is_bestseller: boolean; is_new: boolean; product_images: Array<{ url: string; is_cover: boolean }> };
        if (!p?.is_active || p.stock <= 0) continue;
        const slot = (byProduct[p.id] ||= { product: p, items: [] });
        slot.items.push({ discount_type: row.discount_type as "percent"|"nominal", discount_value: Number(row.discount_value), flash_sales: row.flash_sales as unknown as { starts_at: string; ends_at: string; is_active: boolean } });
      }
      return Object.values(byProduct);
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="container-page py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="badge-pink"><Flame className="mr-1 inline h-3 w-3" /> Flash Sale</span>
          <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">Promo Terbatas Waktu</h1>
          <p className="mt-1 text-sm text-muted-foreground">Harga otomatis kembali normal saat countdown habis.</p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          {([["large", LayoutGrid, "Large"], ["medium", Grid3x3, "Medium"], ["small", Grid2x2, "Small"], ["list", ListIcon, "List"]] as const).map(([id, Icon, label]) => (
            <button key={id} type="button" onClick={() => setView(id)} title={label} className={`grid h-8 w-8 place-items-center rounded-full transition ${view === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Memuat...</p>
        : !products?.length ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Flame className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Belum ada Flash Sale yang sedang berlangsung.</p>
            <Link to="/katalog" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">Lihat katalog lengkap</Link>
          </div>
        ) : view === "list" ? (
          <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
            {products.map(({ product: p, items }) => {
              const flash = resolveFlashFromItems(p.price, items, now);
              const promo = { price: p.price, ...flash };
              const unit = productPromoUnit(promo, now);
              const cd = countdownParts(flash.flashEndAt, now);
              const cover = p.product_images?.find((i) => i.is_cover)?.url ?? p.product_images?.[0]?.url ?? null;
              return (
                <Link key={p.id} to="/produk/$slug" params={{ slug: p.slug }} className="flex items-center gap-4 p-3 hover:bg-accent/50">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {cover ? <img src={cover} alt={p.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-primary"><Package className="h-6 w-6" /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-1 text-sm font-medium">{p.name}</h3>
                    {cd && <p className="text-xs font-semibold text-rose-600"><Timer className="mr-1 inline h-3 w-3" />{cd.days}h {String(cd.hours).padStart(2,"0")}:{String(cd.minutes).padStart(2,"0")}:{String(cd.seconds).padStart(2,"0")}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-display text-base font-bold text-primary">{formatRupiah(unit)}</p>
                    <p className="text-xs text-muted-foreground line-through">{formatRupiah(p.price)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className={`grid gap-4 ${VIEW_GRID[view]}`}>
            {products.map(({ product: p, items }) => {
              const flash = resolveFlashFromItems(p.price, items, now);
              const promo = { price: p.price, ...flash };
              const unit = productPromoUnit(promo, now);
              const cd = countdownParts(flash.flashEndAt, now);
              const cover = p.product_images?.find((i) => i.is_cover)?.url ?? p.product_images?.[0]?.url ?? null;
              return (
                <Link key={p.id} to="/produk/$slug" params={{ slug: p.slug }} className="group">
                  <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
                    {cover ? <img src={cover} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" /> : <div className="grid h-full place-items-center text-primary"><Package className="h-10 w-10" /></div>}
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow"><Flame className="h-3 w-3" /> Flash</span>
                    {cd && (
                      <div className="absolute bottom-2 left-2 right-2 grid grid-cols-4 gap-1 rounded-md bg-black/70 p-1 text-center text-white">
                        {[["Hari", cd.days], ["Jam", cd.hours], ["Mnt", cd.minutes], ["Dtk", cd.seconds]].map(([k, v]) => (
                          <div key={k as string} className="rounded bg-white/10 px-1 py-0.5">
                            <div className="font-mono text-[11px] font-bold leading-none">{String(v as number).padStart(2,"0")}</div>
                            <div className="text-[8px] uppercase opacity-70">{k}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {view !== "small" && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.category === "serba_35" && <Badge variant="secondary" className="bg-primary-soft/60 text-foreground">Serba 35</Badge>}
                      {p.category === "serba_75" && <Badge variant="secondary" className="bg-accent text-foreground">Serba 75</Badge>}
                    </div>
                  )}
                  <h3 className={`mt-2 line-clamp-2 font-medium ${view === "small" ? "text-xs" : "text-sm"}`}>{p.name}</h3>
                  <div className="mt-1 flex items-baseline gap-2">
                    <p className={`font-display font-bold text-primary ${view === "large" ? "text-xl" : view === "small" ? "text-sm" : "text-lg"}`}>{formatRupiah(unit)}</p>
                    <p className="text-xs text-muted-foreground line-through">{formatRupiah(p.price)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
    </div>
  );
}
