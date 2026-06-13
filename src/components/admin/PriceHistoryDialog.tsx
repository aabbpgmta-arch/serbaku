import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatRupiah } from "@/lib/format";
import { ArrowRight, History } from "lucide-react";

type Row = { id: string; old_price: number; new_price: number; changed_by_name: string; created_at: string };

export function PriceHistoryDialog({
  productId, productName, open, onOpenChange,
}: { productId: string; productName: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["price_history", productId],
    enabled: open,
    queryFn: async () => {
      const client = supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: Row[] | null; error: unknown }>;
      };
      const { data } = await client.rpc("get_product_price_history", { _product_id: productId, _limit: 50 });
      return (data ?? []) as Row[];
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><History className="h-4 w-4" /> Riwayat Harga</DialogTitle>
          <p className="text-sm text-muted-foreground">{productName}</p>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Memuat...</p>}
          {!isLoading && (data ?? []).length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Belum ada perubahan harga tercatat.
            </p>
          )}
          {(data ?? []).map((r) => {
            const diff = r.new_price - r.old_price;
            return (
              <div key={r.id} className="rounded-xl border border-border/60 bg-card p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="line-through text-muted-foreground">{formatRupiah(r.old_price)}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{formatRupiah(r.new_price)}</span>
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${diff > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                    {diff > 0 ? "+" : ""}{formatRupiah(diff)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("id-ID")} · oleh {r.changed_by_name}
                </p>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
