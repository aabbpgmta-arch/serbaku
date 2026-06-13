import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, Package, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatRupiah } from "@/lib/format";
import { WishlistButton } from "@/components/site/WishlistButton";

export const Route = createFileRoute("/_authenticated/akun/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist Saya — Toko Serba" }, { name: "robots", content: "noindex" }] }),
  component: WishlistPage,
});

type Row = {
  product_id: string;
  created_at: string;
  products: {
    id: string;
    name: string;
    slug: string;
    price: number;
    stock: number;
    is_active: boolean;
    product_images: { url: string; is_cover: boolean }[];
  } | null;
};

function WishlistPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["wishlist_items", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("product_id, created_at, products(id,name,slug,price,stock,is_active,product_images(url,is_cover))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const items = (data ?? []).filter((r) => r.products && r.products.is_active);

  return (
    <div className="container-page py-10">
      <div className="mb-6 flex items-center gap-2">
        <Heart className="h-6 w-6 text-rose-500" />
        <h1 className="font-display text-3xl font-bold">Wishlist Saya</h1>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square rounded-2xl bg-muted" />
              <div className="mt-3 h-4 w-3/4 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Heart className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Wishlist Anda masih kosong.</p>
          <Link to="/katalog" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <ShoppingBag className="h-4 w-4" /> Jelajahi Katalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((r) => {
            const p = r.products!;
            const cover = p.product_images?.find((i) => i.is_cover)?.url ?? p.product_images?.[0]?.url ?? null;
            return (
              <div key={r.product_id} className="group relative">
                <Link to="/produk/$slug" params={{ slug: p.slug }}>
                  <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
                    {cover ? (
                      <img src={cover} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="grid h-full place-items-center text-primary"><Package className="h-10 w-10" /></div>
                    )}
                  </div>
                  <h3 className="mt-2 line-clamp-2 text-sm font-medium">{p.name}</h3>
                  <p className="font-display text-base font-bold text-primary">{formatRupiah(p.price)}</p>
                  <p className="text-xs text-muted-foreground">Stok: {p.stock}</p>
                </Link>
                <WishlistButton productId={p.id} className="absolute right-2 top-2" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
