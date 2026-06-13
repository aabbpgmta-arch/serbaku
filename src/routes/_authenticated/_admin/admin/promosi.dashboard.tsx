import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart3, TrendingUp, ShoppingBag, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/format";
import { classifySource } from "@/lib/attribution";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/_admin/admin/promosi/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Iklan — Admin" }, { name: "robots", content: "noindex" }] }),
  component: DashboardIklan,
});

type Bucket = { source: string; visitors: number; orders: number; revenue: number };

function DashboardIklan() {
  const [days, setDays] = useState("30");
  const since = new Date(Date.now() - Number(days) * 24 * 60 * 60_000).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["admin_ads_dashboard", days],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, status, total, subtotal, utm_source, utm_medium, referrer, created_at")
        .gte("created_at", since);
      if (error) throw error;

      const buckets: Record<string, Bucket> = {};
      const ensure = (key: string) => (buckets[key] ||= { source: key, visitors: 0, orders: 0, revenue: 0 });

      for (const o of orders ?? []) {
        const src = classifySource(o.utm_source, o.utm_medium, o.referrer);
        const b = ensure(src);
        if (o.status !== "dibatalkan") {
          b.orders += 1;
          b.revenue += Number(o.total ?? 0);
        }
      }
      // Sort by revenue desc
      const rows = Object.values(buckets).sort((a, b) => b.revenue - a.revenue);
      const totalOrders = rows.reduce((s, r) => s + r.orders, 0);
      const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
      return { rows, totalOrders, totalRevenue };
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Dashboard Iklan</h1>
          <p className="text-sm text-muted-foreground">Omzet & order per sumber traffic (UTM / referrer).</p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 hari terakhir</SelectItem>
            <SelectItem value="30">30 hari terakhir</SelectItem>
            <SelectItem value="90">90 hari terakhir</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Stat icon={ShoppingBag} label="Total Order" value={String(data?.totalOrders ?? 0)} />
        <Stat icon={TrendingUp} label="Total Omzet" value={formatRupiah(data?.totalRevenue ?? 0)} />
        <Stat icon={Target} label="Sumber Aktif" value={String(data?.rows.length ?? 0)} />
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Memuat...</p>
        : !data?.rows.length ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Belum ada data order pada periode ini.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-3">Sumber</th>
                  <th className="p-3 text-right">Order</th>
                  <th className="p-3 text-right">Omzet</th>
                  <th className="p-3 text-right">% Omzet</th>
                  <th className="p-3 text-right">Avg / Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.rows.map((r) => {
                  const pct = data.totalRevenue ? (r.revenue / data.totalRevenue) * 100 : 0;
                  const avg = r.orders ? r.revenue / r.orders : 0;
                  return (
                    <tr key={r.source}>
                      <td className="p-3 font-medium">{r.source}</td>
                      <td className="p-3 text-right">{r.orders}</td>
                      <td className="p-3 text-right font-semibold">{formatRupiah(r.revenue)}</td>
                      <td className="p-3 text-right text-muted-foreground">{pct.toFixed(1)}%</td>
                      <td className="p-3 text-right text-muted-foreground">{formatRupiah(avg)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      <p className="text-xs text-muted-foreground">
        Catatan: jumlah Visitor mentah belum dilacak di database — gunakan GA4/Meta/TikTok Pixel di menu Ads Manager untuk metrik kunjungan & conversion rate detail per platform.
      </p>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof BarChart3; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <p className="mt-1 font-display text-xl font-bold">{value}</p>
    </div>
  );
}
