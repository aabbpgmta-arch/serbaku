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

  const { data: recentProducts } = useQuery({
    queryKey: ["admin_recent_products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false }).limit(5);
      return data ?? [];
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
