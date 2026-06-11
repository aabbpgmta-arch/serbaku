import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Search, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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

function KatalogPage() {
  const search = useSearch({ from: "/katalog" });
  const [q, setQ] = useState(search.q ?? "");

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", search.cat, search.q],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, name, slug, price, category, stock, is_bestseller, is_new, product_images(url, is_cover, sort_order)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (search.cat === "serba_35") query = query.eq("category", "serba_35");
      else if (search.cat === "serba_75") query = query.eq("category", "serba_75");
      else if (search.cat === "lainnya") query = query.eq("category", "lainnya");
      else if (search.cat === "terlaris") query = query.eq("is_bestseller", true);
      else if (search.cat === "baru") query = query.eq("is_new", true);

      if (search.q) query = query.ilike("name", `%${search.q}%`);

      const { data } = await query;
      return data ?? [];
    },
  });

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

      <div className="mb-8 flex flex-wrap gap-2">
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
      ) : (products ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Belum ada produk pada kategori ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products!.map((p) => {
            const cover = p.product_images?.find((i) => i.is_cover)?.url ?? p.product_images?.[0]?.url ?? null;
            return (
              <Link key={p.id} to="/produk/$slug" params={{ slug: p.slug }} className="group">
                <div className="aspect-square overflow-hidden rounded-2xl bg-muted">
                  {cover ? (
                    <img src={cover} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="grid h-full place-items-center bg-gradient-to-br from-primary-soft/40 to-accent text-primary">
                      <Package className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.category === "serba_35" && <Badge variant="secondary" className="bg-primary-soft/60 text-foreground">Serba 35</Badge>}
                  {p.category === "serba_75" && <Badge variant="secondary" className="bg-accent text-foreground">Serba 75</Badge>}
                  {p.is_bestseller && <Badge className="bg-primary text-primary-foreground">Terlaris</Badge>}
                  {p.is_new && <Badge variant="outline">Baru</Badge>}
                </div>
                <h3 className="mt-2 line-clamp-2 text-sm font-medium">{p.name}</h3>
                <p className="mt-1 font-display text-lg font-bold text-primary">{formatRupiah(p.price)}</p>
                <p className="text-xs text-muted-foreground">Stok: {p.stock}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
