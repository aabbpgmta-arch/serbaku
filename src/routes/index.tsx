import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight, Package, Tag, Truck, Users, Star, Sparkles, BadgeCheck, ShoppingBag, TrendingUp, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/lib/site-settings";
import { formatRupiah } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { useStoreStats, useTopProducts, badgeFor, type ProductCard } from "@/lib/homepage-stats";
import { formatSold } from "@/lib/sales-stats";
import { SocialProofTicker } from "@/components/site/SocialProofTicker";
import { VoucherStripSection } from "@/components/site/VoucherStripSection";
import { getIcon } from "@/lib/icon-map";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Toko Serba — Supplier Grosir Serba 35 & Serba 75" },
      { name: "description", content: "Supplier grosir produk Serba 35 dan Serba 75 untuk reseller, toko serba harga, dan pedagang online. Minimal 6 pcs, modal kecil untung lebih besar." },
      { property: "og:title", content: "Toko Serba — Supplier Grosir Serba 35 & Serba 75" },
      { property: "og:description", content: "Modal kecil, untung lebih besar. Supplier resmi untuk reseller di seluruh Indonesia." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  tag: Tag, package: Package, users: Users, truck: Truck, star: Star, sparkles: Sparkles,
};

function HomePage() {
  const { data: settings } = useSiteSettings();
  const hero = settings?.hero;

  const { data: sections } = useQuery({
    queryKey: ["homepage_sections"],
    queryFn: async () => {
      const { data } = await supabase
        .from("homepage_sections").select("*").eq("is_active", true).order("sort_order");
      return data ?? [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["website_categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("website_categories").select("*").eq("is_active", true).order("sort_order");
      return data ?? [];
    },
  });

  const { data: bestsellers } = useQuery({
    queryKey: ["home_bestsellers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, category, is_bestseller, is_new, manual_badge, product_images(url, is_cover, sort_order)")
        .eq("is_active", true)
        .or("is_bestseller.eq.true,is_new.eq.true")
        .limit(8);
      return data ?? [];
    },
  });

  const { data: testimonials } = useQuery({
    queryKey: ["testimonials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("testimonials").select("*").eq("is_active", true).order("sort_order").limit(6);
      return data ?? [];
    },
  });

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[oklch(0.97_0.04_350)] via-background to-[oklch(0.96_0.02_60)]" />
        <div className="absolute -right-32 -top-32 -z-10 h-96 w-96 rounded-full bg-primary-soft/40 blur-3xl" />
        <div className="container-page grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="badge-pink"><Sparkles className="h-3 w-3" /> Supplier Resmi</span>
            <h1 className="mt-4 font-display text-4xl font-bold leading-tight md:text-6xl">
              {hero?.headline ?? "Supplier Produk Serba 35 & Serba 75"}
            </h1>
            <p className="mt-5 text-lg text-muted-foreground md:text-xl">
              {hero?.subheadline ?? "Modal Kecil, Untung Lebih Besar"}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={hero?.cta_link || "/katalog"} className="btn-hero">
                {hero?.cta_text || "Lihat Katalog"} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/auth" className="inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold transition hover:bg-accent">
                Daftar Reseller
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Min. 6 pcs</span>
              <span className="flex items-center gap-2"><Tag className="h-4 w-4 text-primary" /> Harga grosir</span>
              <span className="flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> Stok ready</span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 -z-10 translate-x-6 translate-y-6 rounded-3xl bg-primary-soft/60" />
            <div className="aspect-[4/5] overflow-hidden rounded-3xl bg-card shadow-elegant">
              <HeroSlider
                images={[hero?.image_url, hero?.image_url_2, hero?.image_url_3, hero?.image_url_4].filter((u): u is string => !!u)}
              />
            </div>
          </div>
        </div>
      </section>


      {/* KEUNGGULAN */}
      <section className="container-page py-14 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="badge-pink">Kenapa Toko Serba</span>
          <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">Solusi Grosir untuk Reseller</h2>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {(sections ?? []).map((s) => {
            const Icon = ICONS[s.icon ?? "sparkles"] ?? Sparkles;
            return (
              <div key={s.id} className="rounded-2xl border border-border/60 bg-card p-6 transition hover:-translate-y-1 hover:shadow-soft">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary-soft/60 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* STATISTIK TOKO */}
      <StoreStatsSection />

      {/* VOUCHER AKTIF */}
      <VoucherStripSection />

      {/* KATEGORI */}
      {(categories ?? []).length > 0 && (
        <section className="container-page py-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="badge-pink">Kategori</span>
              <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">Belanja Berdasarkan Harga</h2>
            </div>
            <Link to="/katalog" className="hidden text-sm font-semibold text-primary hover:underline md:inline-flex">
              Lihat semua →
            </Link>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {categories!.map((c) => (
              <Link key={c.id} to={c.link || "/katalog"} className="group relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary-soft/40 to-accent p-8 transition hover:shadow-elegant">
                <div className="relative z-10">
                  <h3 className="font-display text-3xl font-bold text-foreground">{c.name}</h3>
                  <p className="mt-2 max-w-xs text-sm text-foreground/70">{c.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    Belanja Sekarang <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
                {c.image_url && (
                  <img src={c.image_url} alt={c.name} className="absolute -right-6 -bottom-6 h-44 w-44 rounded-2xl object-cover opacity-80" />
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* PRODUK PILIHAN */}
      <section className="container-page py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="badge-pink">Pilihan</span>
            <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">Produk Terlaris & Terbaru</h2>
          </div>
          <Link to="/katalog" className="hidden text-sm font-semibold text-primary hover:underline md:inline-flex">
            Semua produk →
          </Link>
        </div>
        {bestsellers && bestsellers.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {bestsellers.map((p) => {
              const cover =
                p.product_images?.find((i) => i.is_cover)?.url ??
                p.product_images?.[0]?.url ??
                null;
              return (
                <Link key={p.id} to="/produk/$slug" params={{ slug: p.slug }} className="group">
                  <div className="aspect-square overflow-hidden rounded-2xl bg-muted">
                    {cover ? (
                      <img src={cover} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" />
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
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Belum ada produk. Admin dapat menambahkan produk melalui dashboard.
          </div>
        )}
      </section>

      {/* TERLARIS MINGGU & BULAN INI */}
      <TopProductsSection />

      {/* TESTIMONI */}
      {(testimonials ?? []).length > 0 && (
        <section className="container-page py-14">
          <div className="mx-auto max-w-2xl text-center">
            <span className="badge-pink">Testimoni</span>
            <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">Reseller Toko Serba</h2>
          </div>
          <TestimonialSlider items={testimonials!} />
        </section>
      )}


      {/* CTA */}
      <section className="container-page py-14">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[oklch(0.55_0.18_350)] p-10 text-primary-foreground md:p-16">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="relative max-w-2xl">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Siap Mulai Bisnis Grosir?</h2>
            <p className="mt-3 text-primary-foreground/85">
              Daftar gratis dan dapatkan akses ke katalog grosir Serba 35 & Serba 75 lengkap.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/auth" className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:bg-white/90">
                Daftar Sekarang
              </Link>
              <Link to="/katalog" className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 text-sm font-semibold transition hover:bg-white/10">
                Jelajahi Katalog
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SocialProofTicker />
    </div>
  );
}

function StoreStatsSection() {
  const { data } = useStoreStats();
  if (!data) return null;
  const meetsThreshold = data.total_customers >= 100 || data.total_items_sold >= 100;
  if (!meetsThreshold) return null;
  const items: Array<{ icon: React.ComponentType<{ className?: string }>; label: string; value: number }> = [
    { icon: Package, label: "Produk Aktif", value: data.total_products },
    { icon: ShoppingBag, label: "Item Terjual", value: data.total_items_sold },
    { icon: CheckCircle2, label: "Pesanan Selesai", value: data.total_orders_done },
    { icon: Users, label: "Pelanggan", value: data.total_customers },
  ];
  return (
    <section className="container-page py-8">
      <div className="grid grid-cols-2 gap-3 rounded-3xl border border-border/60 bg-card p-5 sm:p-7 md:grid-cols-4 md:gap-5">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.label} className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft/60 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-2xl font-bold leading-tight">
                  {it.value.toLocaleString("id-ID")}
                </div>
                <div className="truncate text-xs text-muted-foreground">{it.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TopProductsSection() {
  const { data: stats } = useStoreStats();
  const [days, setDays] = useState<7 | 30>(7);
  const { data, isLoading } = useTopProducts(days, 8);
  const meetsThreshold = stats && (stats.total_customers >= 100 || stats.total_items_sold >= 100);
  if (!meetsThreshold) return null;
  return (
    <section className="container-page py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="badge-pink"><TrendingUp className="h-3 w-3" /> Terlaris</span>
          <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">
            {days === 7 ? "Terlaris Minggu Ini" : "Terlaris Bulan Ini"}
          </h2>
        </div>
        <div className="inline-flex rounded-full border border-border bg-card p-1 text-sm">
          {[7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d as 7 | 30)}
              className={`rounded-full px-4 py-1.5 font-semibold transition ${
                days === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {d === 7 ? "7 Hari" : "30 Hari"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {data.map((p) => <TopProductCard key={p.id} p={p} />)}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Belum ada penjualan dalam {days} hari terakhir.
        </div>
      )}
    </section>
  );
}

function TopProductCard({ p }: { p: ProductCard }) {
  const cover =
    p.product_images?.find((i) => i.is_cover)?.url ?? p.product_images?.[0]?.url ?? null;
  const badge = badgeFor(p);
  return (
    <Link to="/produk/$slug" params={{ slug: p.slug }} className="group">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
        {cover ? (
          <img src={cover} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="grid h-full place-items-center bg-gradient-to-br from-primary-soft/40 to-accent text-primary">
            <Package className="h-10 w-10" />
          </div>
        )}
        {badge && (
          <span className="absolute left-2 top-2 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {p.category === "serba_35" && <Badge variant="secondary" className="bg-primary-soft/60 text-foreground">Serba 35</Badge>}
        {p.category === "serba_75" && <Badge variant="secondary" className="bg-accent text-foreground">Serba 75</Badge>}
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-medium">{p.name}</h3>
      <p className="mt-1 font-display text-lg font-bold text-primary">{formatRupiah(p.price)}</p>
      {p.qty_sold && p.qty_sold > 0 ? (
        <p className="mt-0.5 text-xs text-muted-foreground">Terjual {formatSold(p.qty_sold)} pcs</p>
      ) : null}
    </Link>
  );
}

function HeroSlider({ images }: { images: string[] }) {
  const autoplay = useRef(Autoplay({ delay: 4000, stopOnInteraction: false }));
  const [emblaRef, embla] = useEmblaCarousel({ loop: true }, images.length > 1 ? [autoplay.current] : []);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!embla) return;
    const onSel = () => setSelected(embla.selectedScrollSnap());
    embla.on("select", onSel);
    onSel();
    return () => { embla.off("select", onSel); };
  }, [embla]);

  if (images.length === 0) {
    return (
      <div className="grid h-full place-items-center bg-gradient-to-br from-primary-soft via-accent to-cream p-10 text-center">
        <div>
          <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-white/70 backdrop-blur">
            <Sparkles className="h-9 w-9 text-primary" />
          </div>
          <div className="font-display text-3xl font-bold text-foreground">Serba 35</div>
          <div className="font-display text-3xl font-bold text-primary">& Serba 75</div>
          <p className="mt-4 text-sm text-foreground/70">Produk grosir berkualitas untuk reseller di seluruh Indonesia.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={emblaRef} className="h-full overflow-hidden">
        <div className="flex h-full">
          {images.map((src, i) => (
            <div key={i} className="relative h-full min-w-0 flex-[0_0_100%]">
              <img src={src} alt={`Toko Serba ${i + 1}`} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => embla?.scrollTo(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === selected ? "w-6 bg-white" : "w-1.5 bg-white/60"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type TestimonialItem = {
  id: string;
  name: string;
  message: string;
  rating: number | null;
  avatar_url: string | null;
  city?: string | null;
  role?: string | null;
  verified?: boolean | null;
  photos?: unknown;
};

function TestimonialSlider({ items }: { items: TestimonialItem[] }) {
  const autoplay = useRef(Autoplay({ delay: 4500, stopOnInteraction: false }));
  const [emblaRef] = useEmblaCarousel({ loop: items.length > 1, align: "start" }, [autoplay.current]);
  return (
    <div className="mt-10 overflow-hidden" ref={emblaRef}>
      <div className="flex gap-5">
        {items.map((t) => {
          const photos = Array.isArray(t.photos) ? (t.photos as string[]).slice(0, 3) : [];
          return (
            <div key={t.id} className="min-w-0 flex-[0_0_100%] sm:flex-[0_0_50%] md:flex-[0_0_33.333%]">
              <div className="h-full rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
                <div className="flex gap-0.5 text-primary">
                  {Array.from({ length: t.rating ?? 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="mt-3 text-sm text-foreground/80 line-clamp-5">"{t.message}"</p>
                {photos.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {photos.map((p, i) => (
                      <img key={i} src={p} alt="" className="h-14 w-14 rounded-lg object-cover" />
                    ))}
                  </div>
                )}
                <div className="mt-4 flex items-center gap-3">
                  {t.avatar_url ? (
                    <img src={t.avatar_url} alt={t.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary font-bold">
                      {t.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      <span className="truncate">{t.name}</span>
                      {t.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
                    </div>
                    {(t.city || t.role) && (
                      <div className="text-xs text-muted-foreground">{t.city ?? t.role}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


