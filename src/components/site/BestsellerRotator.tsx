import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/format";
import { badgeFor } from "@/lib/homepage-stats";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  category: string | null;
  is_bestseller: boolean | null;
  is_new: boolean | null;
  manual_badge: string | null;
  product_images?: { url: string; is_cover: boolean | null; sort_order: number | null }[];
};

const BATCH_SIZE = 8;
const ROTATE_MS = 15000;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function BestsellerRotator({ products }: { products: Product[] }) {
  const batches = useMemo(() => chunk(products, BATCH_SIZE), [products]);
  const total = batches.length;
  const [index, setIndex] = useState(() => (total > 1 ? Math.floor(Math.random() * total) : 0));
  const [paused, setPaused] = useState(false);
  const [fadeKey, setFadeKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (total <= 1 || paused) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % total);
      setFadeKey((k) => k + 1);
    }, ROTATE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total, paused]);

  if (products.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Belum ada produk. Admin dapat menambahkan produk melalui dashboard.
      </div>
    );
  }

  const go = (dir: 1 | -1) => {
    setIndex((i) => (i + dir + total) % total);
    setFadeKey((k) => k + 1);
  };

  const current = batches[index] ?? [];

  return (
    <div
      className="relative mt-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {total > 1 && (
        <>
          <button
            type="button"
            aria-label="Sebelumnya"
            onClick={() => go(-1)}
            className="absolute -left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-border bg-card p-2 shadow-soft transition hover:bg-accent md:block"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Berikutnya"
            onClick={() => go(1)}
            className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-border bg-card p-2 shadow-soft transition hover:bg-accent md:block"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Mobile: horizontal slider */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:hidden">
        {current.map((p) => (
          <ProductCardLink key={p.id} p={p} className="min-w-[45%] snap-start" />
        ))}
      </div>

      {/* Tablet/Desktop grid with fade */}
      <div
        key={fadeKey}
        className="hidden animate-fade-in grid-cols-3 gap-4 sm:grid lg:grid-cols-4"
      >
        {current.map((p) => (
          <ProductCardLink key={p.id} p={p} />
        ))}
      </div>

      {total > 1 && (
        <div className="mt-5 flex items-center justify-center gap-1.5">
          {batches.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Batch ${i + 1}`}
              onClick={() => {
                setIndex(i);
                setFadeKey((k) => k + 1);
              }}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-primary" : "w-2 bg-border hover:bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCardLink({ p, className = "" }: { p: Product; className?: string }) {
  const cover =
    p.product_images?.find((i) => i.is_cover)?.url ??
    p.product_images?.[0]?.url ??
    null;
  return (
    <Link to="/produk/$slug" params={{ slug: p.slug }} className={`group ${className}`}>
      <div className="aspect-square overflow-hidden rounded-2xl bg-muted">
        {cover ? (
          <img src={cover} alt={p.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="grid h-full place-items-center bg-gradient-to-br from-primary-soft/40 to-accent text-primary">
            <Package className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {p.category === "serba_35" && <Badge variant="secondary" className="bg-primary-soft/60 text-foreground">Serba 35</Badge>}
        {p.category === "serba_75" && <Badge variant="secondary" className="bg-accent text-foreground">Serba 75</Badge>}
        {badgeFor(p) && <Badge className="bg-primary text-primary-foreground">{badgeFor(p)}</Badge>}
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-medium">{p.name}</h3>
      <p className="mt-1 font-display text-lg font-bold text-primary">{formatRupiah(p.price)}</p>
    </Link>
  );
}
