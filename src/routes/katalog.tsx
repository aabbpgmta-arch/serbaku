import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { z } from "zod";
import { Search, Package, Flame, LayoutGrid, Grid3x3, Grid2x2, List as ListIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/format";
import { flashActive, productPromoUnit, resolveFlashFromItems, type FlashSaleItemJoin } from "@/lib/promo";
import { useSalesStats, formatSold } from "@/lib/sales-stats";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { WishlistButton } from "@/components/site/WishlistButton";

const searchSchema = z.object({
  cat: z.enum(["serba_35", "serba_75", "lainnya", "terlaris", "baru"]).optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/katalog")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Katalog Grosir — Toko Serba" },
      { name: "description", content: "Katalog grosir produk Serba 35 dan Serba 75. Minimal 6 pcs, harga supplier untuk reseller." },
      { property: "og:title", content: "Katalog Grosir — Toko Serba" },
      { property: "og:description", content: "Pilihan produk grosir lengkap, harga supplier." },
      { property: "og:url", content: "/katalog" },
    ],
    links: [{ rel: "canonical", href: "/katalog" }],
  }),
  component: KatalogPage,
});

const FILTERS = [
  { id: undefined, label: "Semua" },
  { id: "serba_35" as const, label: "Serba 35" },
  { id: "serba_75" as const, label: "Serba 75" },
  { id: "terlaris" as const, label: "Terlaris" },
  { id: "baru" as const, label: "Produk Baru" },
];

type ViewMode = "large" | "medium" | "small" | "list";

const VIEW_GRID: Record<Exclude<ViewMode, "list">, string> = {
  large: "grid-cols-1 sm:grid-cols-2",
  medium: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  small: "grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
};

function KatalogPage() {
  const search = useSearch({ from: "/katalog" });
  const [q, setQ] = useState(search.q ?? "");
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "medium";
    return (localStorage.getItem("katalog_view") as ViewMode) || "medium";
  });
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("katalog_view", view);
  }, [view]);

  const { data: products, isLoading, error } = useQuery({
    queryKey: ["products", search.cat, search.q],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, name, slug, price, category, stock, is_bestseller, is_new, discount_type, discount_value, product_images(url, is_cover, sort_order), flash_sale_items(discount_type, discount_value, flash_sales(starts_at, ends_at, is_active))")
        .eq("is_active", true)
        .gt("stock", 0)
        .order("created_at", { ascending: false });

      if (search.cat === "serba_35") query = query.eq("category", "serba_35");
      else if (search.cat === "serba_75") query = query.eq("category", "serba_75");
      else if (search.cat === "lainnya") query = query.eq("category", "lainnya");
      else if (search.cat === "terlaris") query = query.eq("is_bestseller", true);
      else if (search.cat === "baru") query = query.eq("is_new", true);

      if (search.q) query = query.ilike("name", `%${search.q}%`);

      const { data, error } = await query;
      if (error) { console.error("[katalog] gagal memuat", error); throw error; }
      return data ?? [];
    },
  });

  const productIds = (products ?? []).map((p) => p.id);
  const { data: statsMap } = useSalesStats(productIds);


  return (
    <div className="container-page py-10">
      <div className="mb-6">
        <span className="badge-pink">Katalog</span>
        <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">Produk Grosir</h1>
        <p className="mt-1 text-sm text-muted-foreground">Minimal pembelian 6 pcs · Grosir kelipatan 6 pcs.</p>
      </div>

      <form
        className="relative mb-5 max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          const url = new URL(window.location.href);
          if (q) url.searchParams.set("q", q); else url.searchParams.delete("q");
          window.history.replaceState({}, "", url.toString());
          window.location.search = url.search;
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk..." className="pl-9" />
      </form>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = search.cat === f.id;
            return (
              <Link
                key={f.label}
                to="/katalog"
                search={{ ...search, cat: f.id }}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          {([
            ["large", LayoutGrid, "Large"],
            ["medium", Grid3x3, "Medium"],
            ["small", Grid2x2, "Small"],
            ["list", ListIcon, "List"],
          ] as const).map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              title={label}
              className={`grid h-8 w-8 place-items-center rounded-full transition ${view === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square rounded-2xl bg-muted" />
              <div className="mt-3 h-4 w-3/4 rounded bg-muted" />
              <div className="mt-2 h-5 w-1/2 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-12 text-center">
          <p className="text-sm font-medium text-destructive">Gagal memuat produk.</p>
          <p className="mt-1 text-xs text-muted-foreground">{(error as Error).message}</p>
        </div>
      ) : (products ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Belum ada produk pada kategori ini.</p>
        </div>
      ) : view === "list" ? (
        <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
          {products!.map((p) => {
            const cover = p.product_images?.find((i) => i.is_cover)?.url ?? p.product_images?.[0]?.url ?? null;
            const flash = resolveFlashFromItems(Number(p.price), p.flash_sale_items as FlashSaleItemJoin[]);
            const promo = { price: Number(p.price), discountType: p.discount_type as "none"|"percent"|"nominal"|null, discountValue: p.discount_value, ...flash };
            const isFlash = flashActive(promo);
            const promoUnit = productPromoUnit(promo);
            const hasPromo = promoUnit < Number(p.price);
            return (
              <Link key={p.id} to="/produk/$slug" params={{ slug: p.slug }} className="flex items-center gap-4 p-3 hover:bg-accent/50">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {cover ? <img src={cover} alt={p.name} className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full place-items-center text-primary"><Package className="h-6 w-6" /></div>}
                  {isFlash && <span className="absolute left-1 top-1 rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white"><Flame className="inline h-2.5 w-2.5" /></span>}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-1 text-sm font-medium">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Stok: {p.stock}
                    {statsMap?.get(p.id)?.total_sold ? ` · Terjual ${formatSold(statsMap.get(p.id)!.total_sold)} pcs` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-base font-bold text-primary">{formatRupiah(promoUnit)}</p>
                  {hasPromo && <p className="text-xs text-muted-foreground line-through">{formatRupiah(p.price)}</p>}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className={`grid gap-4 ${VIEW_GRID[view]}`}>
          {products!.map((p) => {
            const cover = p.product_images?.find((i) => i.is_cover)?.url ?? p.product_images?.[0]?.url ?? null;
            const flash = resolveFlashFromItems(Number(p.price), p.flash_sale_items as FlashSaleItemJoin[]);
            const promo = { price: Number(p.price), discountType: p.discount_type as "none"|"percent"|"nominal"|null, discountValue: p.discount_value, ...flash };
            const isFlash = flashActive(promo);
            const promoUnit = productPromoUnit(promo);
            const hasPromo = promoUnit < Number(p.price);
            return (
              <Link key={p.id} to="/produk/$slug" params={{ slug: p.slug }} className="group">
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
                  {cover ? (
                    <img src={cover} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="grid h-full place-items-center bg-gradient-to-br from-primary-soft/40 to-accent text-primary">
                      <Package className="h-10 w-10" />
                    </div>
                  )}
                  {isFlash && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow"><Flame className="h-3 w-3" /> Flash</span>
                  )}
                  {!isFlash && hasPromo && (
                    <span className="absolute left-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">Diskon</span>
                  )}
                </div>
                {view !== "small" && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.category === "serba_35" && <Badge variant="secondary" className="bg-primary-soft/60 text-foreground">Serba 35</Badge>}
                    {p.category === "serba_75" && <Badge variant="secondary" className="bg-accent text-foreground">Serba 75</Badge>}
                    {p.is_bestseller && <Badge className="bg-primary text-primary-foreground">Terlaris</Badge>}
                    {p.is_new && <Badge variant="outline">Baru</Badge>}
                  </div>
                )}
                <h3 className={`mt-2 line-clamp-2 font-medium ${view === "small" ? "text-xs" : "text-sm"}`}>{p.name}</h3>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className={`font-display font-bold text-primary ${view === "large" ? "text-xl" : view === "small" ? "text-sm" : "text-lg"}`}>{formatRupiah(promoUnit)}</p>
                  {hasPromo && <p className="text-xs text-muted-foreground line-through">{formatRupiah(p.price)}</p>}
                </div>
                {view !== "small" && (
                  <p className="text-xs text-muted-foreground">
                    Stok: {p.stock}
                    {statsMap?.get(p.id)?.total_sold ? ` · Terjual ${formatSold(statsMap.get(p.id)!.total_sold)} pcs` : ""}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
