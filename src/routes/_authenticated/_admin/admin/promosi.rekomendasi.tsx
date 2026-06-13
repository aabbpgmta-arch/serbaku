import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Package, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/_admin/admin/promosi/rekomendasi")({
  head: () => ({ meta: [{ title: "Rekomendasi Flash Sale — Admin" }, { name: "robots", content: "noindex" }] }),
  component: RekomendasiPage,
});

type Row = { id: string; name: string; price: number; stock: number; image: string | null; sold30: number };

function RekomendasiPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin_recommend_30d"],
    queryFn: async (): Promise<Row[]> => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString();
      const [{ data: products }, { data: items }] = await Promise.all([
        supabase.from("products").select("id, name, price, stock, product_images(url, is_cover)").eq("is_active", true),
        supabase.from("order_items").select("product_id, quantity, orders!inner(created_at, status)").gte("orders.created_at", since).neq("orders.status", "dibatalkan"),
      ]);
      const sales: Record<string, number> = {};
      for (const it of items ?? []) {
        if (!it.product_id) continue;
        sales[it.product_id] = (sales[it.product_id] ?? 0) + Number(it.quantity ?? 0);
      }
      const rows: Row[] = (products ?? []).map((p) => ({
        id: p.id, name: p.name, price: Number(p.price), stock: p.stock,
        image: p.product_images?.find((i: { is_cover: boolean }) => i.is_cover)?.url ?? p.product_images?.[0]?.url ?? null,
        sold30: sales[p.id] ?? 0,
      }));
      // Lowest sales first; products with 0 sales paling atas
      rows.sort((a, b) => a.sold30 - b.sold30);
      return rows;
    },
  });

  const topRecommended = 12; // Tandai 12 teratas sebagai "Rekomendasi"

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Rekomendasi Flash Sale</h1>
          <p className="text-sm text-muted-foreground">Produk dengan penjualan terendah 30 hari terakhir — kandidat ideal untuk flash sale.</p>
        </div>
        <Button asChild className="gap-1.5"><Link to="/admin/promosi/flash-sale"><Zap className="h-4 w-4" /> Buat Flash Sale</Link></Button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Memuat...</p>
        : !data?.length ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Belum ada produk aktif.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="p-3">#</th><th className="p-3">Produk</th><th className="p-3">Harga</th><th className="p-3">Stok</th><th className="p-3">Terjual 30 hari</th><th className="p-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((r, idx) => (
                  <tr key={r.id} className={idx < topRecommended ? "bg-rose-50/40" : ""}>
                    <td className="p-3 text-xs text-muted-foreground">{idx + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {r.image ? <img src={r.image} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-primary"><Package className="h-4 w-4" /></div>}
                        </div>
                        <div>
                          <p className="line-clamp-1 font-medium">{r.name}</p>
                          {idx < topRecommended && (
                            <Badge className="mt-0.5 bg-rose-500 text-white"><Sparkles className="mr-1 h-3 w-3" /> Rekomendasi</Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">{formatRupiah(r.price)}</td>
                    <td className="p-3">{r.stock}</td>
                    <td className="p-3"><span className={r.sold30 === 0 ? "font-semibold text-rose-600" : ""}>{r.sold30} pcs</span></td>
                    <td className="p-3 text-right"><Button asChild size="sm" variant="outline"><Link to="/admin/promosi/flash-sale">Tambahkan</Link></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
