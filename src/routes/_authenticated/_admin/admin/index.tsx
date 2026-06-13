import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, Users, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/format";
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/order-status";

export const Route = createFileRoute("/_authenticated/_admin/admin/")({
  head: () => ({ meta: [{ title: "Dashboard Admin — Toko Serba" }, { name: "robots", content: "noindex" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["admin_stats"],
    queryFn: async () => {
      const [{ count: products }, { count: orders }, { count: customers }, { data: sales }] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("total").neq("status", "dibatalkan"),
      ]);
      const omzet = (sales ?? []).reduce((s: number, r: { total: number }) => s + Number(r.total), 0);
      return { products: products ?? 0, orders: orders ?? 0, customers: customers ?? 0, omzet };
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["admin_recent_orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  const { data: topProducts } = useQuery({
    queryKey: ["admin_top_products_30d"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("order_items")
        .select("product_id, product_name, quantity, unit_price, orders!inner(status, created_at)")
        .gte("orders.created_at", since)
        .neq("orders.status", "dibatalkan");
      if (error) { console.error("[admin top products]", error); return []; }
      const map = new Map<string, { key: string; name: string; price: number; qty: number }>();
      for (const r of (data ?? []) as Array<{ product_id: string | null; product_name: string; quantity: number; unit_price: number }>) {
        const key = r.product_id ?? r.product_name;
        const prev = map.get(key);
        if (prev) prev.qty += r.quantity;
        else map.set(key, { key, name: r.product_name, price: Number(r.unit_price), qty: r.quantity });
      }
      return Array.from(map.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);
    },
  });

  const cards = [
    { label: "Total Produk", value: stats?.products ?? 0, icon: Package, color: "bg-primary-soft/40 text-primary" },
    { label: "Total Pesanan", value: stats?.orders ?? 0, icon: ShoppingBag, color: "bg-blue-100 text-blue-700" },
    { label: "Total Pelanggan", value: stats?.customers ?? 0, icon: Users, color: "bg-emerald-100 text-emerald-700" },
    { label: "Total Omzet", value: formatRupiah(stats?.omzet ?? 0), icon: Wallet, color: "bg-amber-100 text-amber-700" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Dashboard</h1>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-2xl border border-border/60 bg-card p-5">
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${c.color}`}><Icon className="h-5 w-5" /></div>
              <p className="mt-3 text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-1 font-display text-2xl font-bold">{c.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between"><h2 className="font-display text-lg font-semibold">Pesanan Terbaru</h2><Link to="/admin/pesanan" className="text-xs text-primary hover:underline">Lihat semua</Link></div>
          <div className="mt-4 space-y-3">
            {(recentOrders ?? []).map((o) => (
              <Link key={o.id} to="/admin/pesanan" className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3 hover:bg-accent">
                <div>
                  <p className="font-mono text-xs">{o.order_number}</p>
                  <p className="text-sm">{o.full_name}</p>
                </div>
                <div className="text-right">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                  <p className="mt-1 text-sm font-semibold">{formatRupiah(o.total)}</p>
                </div>
              </Link>
            ))}
            {(recentOrders ?? []).length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Belum ada pesanan.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between"><h2 className="font-display text-lg font-semibold">Produk Terbaru</h2><Link to="/admin/produk" className="text-xs text-primary hover:underline">Kelola produk</Link></div>
          <div className="mt-4 space-y-3">
            {(recentProducts ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">Stok: {p.stock}</p>
                </div>
                <p className="text-sm font-semibold text-primary">{formatRupiah(p.price)}</p>
              </div>
            ))}
            {(recentProducts ?? []).length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Belum ada produk.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
