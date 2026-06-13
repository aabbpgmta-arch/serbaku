import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LowStockRow = { id: string; name: string; slug: string; stock: number; price: number; category: string };
export type IdleRow = LowStockRow & { last_sold_at: string | null };

export function useLowStock(threshold = 10, limit = 10) {
  return useQuery({
    queryKey: ["admin_low_stock", threshold, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_low_stock_products", { p_threshold: threshold, p_limit: limit });
      if (error) throw error;
      return (data ?? []) as LowStockRow[];
    },
  });
}

export function useIdleProducts(days = 60, limit = 10) {
  return useQuery({
    queryKey: ["admin_idle_products", days, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_idle_products", { p_days: days, p_limit: limit });
      if (error) throw error;
      return (data ?? []) as IdleRow[];
    },
  });
}
