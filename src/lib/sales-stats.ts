import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SalesStat = {
  product_id: string;
  total_sold: number;
  sold_7d: number;
  sold_30d: number;
  last_sold_at: string | null;
};

export function useSalesStats(productIds?: string[]) {
  const ids = productIds && productIds.length ? [...productIds].sort() : null;
  return useQuery({
    queryKey: ["product_sales_stats", ids],
    queryFn: async (): Promise<Map<string, SalesStat>> => {
      let q = supabase
        .from("product_sales_stats")
        .select("product_id,total_sold,sold_7d,sold_30d,last_sold_at");
      if (ids) q = q.in("product_id", ids);
      const { data, error } = await q;
      if (error) throw error;
      const map = new Map<string, SalesStat>();
      for (const r of data ?? []) {
        map.set(r.product_id as string, {
          product_id: r.product_id as string,
          total_sold: Number(r.total_sold ?? 0),
          sold_7d: Number(r.sold_7d ?? 0),
          sold_30d: Number(r.sold_30d ?? 0),
          last_sold_at: (r.last_sold_at as string | null) ?? null,
        });
      }
      return map;
    },
    staleTime: 60_000,
    enabled: !productIds || productIds.length > 0,
  });
}

export function formatSold(n: number): string {
  if (!n || n <= 0) return "";
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}rb`;
  return String(n);
}
