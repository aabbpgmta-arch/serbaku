import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ShoppingBag,
  MessageCircle,
  Tag,
  Shirt,
  CheckCircle2,
  RefreshCw,
  Truck,
  Clock,
  Store,
  ChevronDown,
  Package,
  Sparkles,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { SmartImage } from "@/components/site/SmartImage";

const WA_NUMBER = "6282130007881";
const WA_TEXT = encodeURIComponent(
  "Halo SERBAKU, saya tertarik menjadi reseller. Bisa info lebih lanjut?",
);
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${WA_TEXT}`;

export const Route = createFileRoute("/reseller")({
  head: () => ({
    meta: [
      { title: "Grosir Baju Murah Mulai 25 Ribuan — Supplier Toko Serba 35 | SERBAKU" },
      {
        name: "description",
        content:
          "Kulakan baju grosir mulai 25 ribuan, supplier fashion wanita untuk reseller online & toko serba 35. Banyak model, stok ready, kirim setiap hari.",
      },
      {
        name: "keywords",
        content:
          "grosir baju murah, supplier baju wanita, kulakan baju murah, grosir fashion wanita, supplier toko serba 35, grosir baju wanita murah",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Grosir Baju Mulai 25 Ribuan — SERBAKU" },
      {
        property: "og:description",
        content:
          "Supplier fashion wanita untuk reseller & toko serba 35. Banyak model, stok ready, kirim setiap hari.",
      },
      { property: "og:url", content: "/reseller" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/reseller" }],
  }),
  component: ResellerPage,
});

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  product_images?: { url: string; is_cover: boolean | null; sort_order: number | null }[];
};

function ResellerPage() {
  const { data: products } = useQuery({
    queryKey: ["reseller_bestsellers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, product_images(url, is_cover, sort_order)")
        .eq("is_active", true)
        .or("is_bestseller.eq.true,is_new.eq.true")
        .order("created_at", { ascending: false })
        .limit(8);
      return (data ?? []) as Product[];
    },
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-soft/60 via-background to-accent/40">
        <div className="container mx-auto px-4 py-12 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 bg-primary text-primary-foreground">
              <Sparkles className="mr-1 h-3.5 w-3.5" /> Supplier Resmi Reseller
            </Badge>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
              Kulakan Baju Mulai{" "}
              <span className="text-primary">25 Ribuan</span>, Cocok Untuk Toko{" "}
              <span className="whitespace-nowrap">Serba 35</span>
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Banyak model, stok ready, kirim setiap hari. Cocok untuk reseller online
              maupun toko offline.
            </p>
            <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
              <Link
                to="/katalog"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-soft transition hover:opacity-90"
              >
                <ShoppingBag className="h-5 w-5" /> Mulai Belanja Sekarang
              </Link>
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 font-semibold transition hover:bg-accent"
              >
                <MessageCircle className="h-5 w-5 text-primary" /> Chat WhatsApp
              </a>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground sm:text-sm">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Min. 6 pcs / model</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Stok diperbarui rutin</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Kirim setiap hari</span>
            </div>
          </div>
        </div>
      </section>

      {/* KEUNTUNGAN */}
      <section className="container mx-auto px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl font-bold sm:text-4xl">
            Keuntungan Jadi Reseller SERBAKU
          </h2>
          <p className="mt-3 text-muted-foreground">
            Mulai usaha fashion dengan modal kecil dan margin lebih besar.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Tag, title: "Harga grosir mulai 25 ribuan", desc: "Modal kecil, untung lebih besar." },
            { icon: Shirt, title: "Banyak model fashion wanita", desc: "Koleksi terus diperbarui." },
            { icon: CheckCircle2, title: "Bebas pilih model", desc: "Pilih sesuai pasar toko Anda." },
            { icon: RefreshCw, title: "Stok selalu diperbarui", desc: "Restock cepat & rutin." },
            { icon: Truck, title: "Pengiriman setiap hari", desc: "Order cepat sampai." },
            { icon: Clock, title: "Website order 24 jam", desc: "Kapan saja, di mana saja." },
            { icon: Store, title: "Cocok untuk toko serba 35", desc: "Harga jual seragam, mudah dijual." },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CARA ORDER */}
      <section className="bg-muted/40 py-14 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold sm:text-4xl">Cara Order</h2>
            <p className="mt-3 text-muted-foreground">Cukup 4 langkah mudah.</p>
          </div>
          <ol className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "Pilih produk yang diinginkan.",
              "Minimal order 6 pcs per model.",
              "Checkout melalui website.",
              "Barang diproses dan dikirim.",
            ].map((step, i) => (
              <li
                key={i}
                className="relative rounded-2xl border border-border bg-card p-5 shadow-soft"
              >
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary font-display text-base font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <p className="mt-3 text-sm font-medium">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* PRODUK TERLARIS */}
      {products && products.length > 0 && (
        <section className="container mx-auto px-4 py-14 sm:py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold sm:text-4xl">Produk Terlaris</h2>
              <p className="mt-2 text-muted-foreground">Pilihan favorit reseller minggu ini.</p>
            </div>
            <Link
              to="/katalog"
              className="hidden text-sm font-semibold text-primary hover:underline sm:inline"
            >
              Lihat semua →
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {products.map((p) => {
              const cover =
                p.product_images?.find((i) => i.is_cover)?.url ??
                p.product_images?.[0]?.url ??
                null;
              return (
                <Link
                  key={p.id}
                  to="/produk/$slug"
                  params={{ slug: p.slug }}
                  className="group flex flex-col"
                >
                  <div className="aspect-square overflow-hidden rounded-2xl bg-muted">
                    {cover ? (
                      <SmartImage
                        src={cover}
                        alt={p.name}
                        size="card"
                        responsiveWidth={400}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-primary">
                        <Package className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <h3 className="mt-3 line-clamp-2 text-sm font-medium">{p.name}</h3>
                  <p className="mt-1 font-display text-base font-bold text-primary">
                    {formatRupiah(p.price)}
                  </p>
                  <span className="mt-2 inline-flex w-fit items-center gap-1 text-xs font-semibold text-primary">
                    Lihat produk →
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Link
              to="/katalog"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-accent"
            >
              Lihat semua produk
            </Link>
          </div>
        </section>
      )}

      {/* KENAPA MEMILIH */}
      <section className="bg-muted/40 py-14 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold sm:text-4xl">
              Kenapa Memilih SERBAKU?
            </h2>
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { icon: Layers, title: "Supplier fashion wanita dengan banyak pilihan model" },
              { icon: Tag, title: "Harga grosir kompetitif" },
              { icon: ShoppingBag, title: "Sistem order online mudah" },
              { icon: RefreshCw, title: "Stok diperbarui secara berkala" },
              { icon: ShieldCheck, title: "Cocok untuk reseller pemula maupun toko yang sudah berjalan" },
            ].map(({ icon: Icon, title }) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 shadow-soft"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-1 text-sm font-medium sm:text-base">{title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl font-bold sm:text-4xl">Pertanyaan Umum</h2>
          <p className="mt-3 text-muted-foreground">Jawaban singkat untuk pertanyaan yang sering ditanyakan.</p>
        </div>
        <div className="mx-auto mt-8 max-w-3xl space-y-3">
          {[
            { q: "Berapa minimal order?", a: "Minimal order 6 pcs per model untuk mendapatkan harga grosir." },
            { q: "Apakah bisa pilih model?", a: "Bisa. Anda bebas memilih model sesuai selera pasar toko Anda." },
            { q: "Berapa harga termurah?", a: "Harga grosir mulai 25 ribuan per pcs, tergantung model dan jenis bahan." },
            { q: "Berapa lama pengiriman?", a: "Order yang masuk diproses dan dikirim setiap hari kerja melalui ekspedisi pilihan Anda." },
            { q: "Bagaimana cara order?", a: "Pilih produk di katalog, tambahkan ke keranjang, lalu checkout melalui website. Pembayaran dan pengiriman diatur otomatis." },
          ].map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* CTA AKHIR */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center text-primary-foreground">
            <h2 className="font-display text-3xl font-bold sm:text-5xl">
              Siap Menambah Keuntungan Toko Anda?
            </h2>
            <p className="mt-4 text-base opacity-90 sm:text-lg">
              Dapatkan stok fashion wanita dengan harga grosir mulai 25 ribuan dan pilih
              model sesuai kebutuhan toko Anda.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
              <Link
                to="/katalog"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-background px-6 py-3.5 font-semibold text-foreground shadow-soft transition hover:opacity-90"
              >
                <ShoppingBag className="h-5 w-5" /> Mulai Belanja Sekarang
              </Link>
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-primary-foreground/40 bg-transparent px-6 py-3.5 font-semibold text-primary-foreground transition hover:bg-primary-foreground/10"
              >
                <MessageCircle className="h-5 w-5" /> Chat WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Floating WhatsApp */}
      <a
        href={WA_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat WhatsApp"
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105"
      >
        <MessageCircle className="h-7 w-7" />
      </a>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-card shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="font-semibold">{q}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-muted-foreground">{a}</div>
      )}
    </div>
  );
}
