import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StoreStats = {
  total_products: number;
  total_customers: number;
  total_orders_done: number;
  total_items_sold: number;
};

export function useStoreStats() {
  return useQuery({
    queryKey: ["store_stats"],
    queryFn: async (): Promise<StoreStats> => {
      const { data, error } = await supabase.rpc("get_store_stats");
      if (error) throw error;
      const row = (data as any[])?.[0] ?? {};
      return {
        total_products: Number(row.total_products ?? 0),
        total_customers: Number(row.total_customers ?? 0),
        total_orders_done: Number(row.total_orders_done ?? 0),
        total_items_sold: Number(row.total_items_sold ?? 0),
      };
    },
    staleTime: 5 * 60_000,
  });
}

export type ProductCard = {
  id: string;
  name: string;
  slug: string;
  price: number;
  category: string;
  is_bestseller: boolean | null;
  is_new: boolean | null;
  manual_badge: string | null;
  product_images?: Array<{ url: string; is_cover: boolean | null; sort_order: number | null }>;
  qty_sold?: number;
};

export function useTopProducts(days: 7 | 30, limit = 8) {
  return useQuery({
    queryKey: ["top_products", days, limit],
    queryFn: async (): Promise<ProductCard[]> => {
      const { data: top, error } = await supabase.rpc("top_products_window", {
        p_days: days,
        p_limit: limit,
      });
      if (error) throw error;
      const ids = (top ?? []).map((r: any) => r.product_id as string);
      if (ids.length === 0) return [];
      const { data: products } = await supabase
        .from("products")
        .select("id,name,slug,price,category,is_bestseller,is_new,manual_badge,product_images(url,is_cover,sort_order)")
        .in("id", ids)
        .eq("is_active", true);
      const qtyMap = new Map<string, number>(
        (top ?? []).map((r: any) => [r.product_id, Number(r.qty_sold ?? 0)]),
      );
      // Preserve top-N order
      return ids
        .map((id) => {
          const p = (products ?? []).find((pp) => pp.id === id);
          return p ? ({ ...p, qty_sold: qtyMap.get(id) ?? 0 } as ProductCard) : null;
        })
        .filter((p): p is ProductCard => !!p);
    },
    staleTime: 2 * 60_000,
  });
}

export type TickerItem = {
  city: string;
  qty: number;
  product_name: string | null;
  created_at: string;
};

export function useSalesTicker(limit = 12) {
  return useQuery({
    queryKey: ["recent_sales_ticker", limit],
    queryFn: async (): Promise<TickerItem[]> => {
      const { data, error } = await supabase.rpc("recent_sales_ticker", { p_limit: limit });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        city: String(r.city ?? ""),
        qty: Number(r.qty ?? 0),
        product_name: r.product_name ?? null,
        created_at: String(r.created_at),
      }));
    },
    staleTime: 60_000,
    refetchInterval: 90_000,
  });
}

export function badgeFor(p: { manual_badge?: string | null; is_bestseller?: boolean | null; is_new?: boolean | null; qty_sold?: number }): string | null {
  if (p.manual_badge && p.manual_badge.trim()) return p.manual_badge.trim();
  if (p.qty_sold && p.qty_sold > 0) return "Terlaris";
  if (p.is_bestseller) return "Terlaris";
  if (p.is_new) return "Baru";
  return null;
}
