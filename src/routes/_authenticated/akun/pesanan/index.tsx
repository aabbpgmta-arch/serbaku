import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatRupiah } from "@/lib/format";
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/order-status";

export const Route = createFileRoute("/_authenticated/akun/pesanan/")({
  head: () => ({ meta: [{ title: "Riwayat Pesanan — Toko Serba" }, { name: "robots", content: "noindex" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const { user } = useAuth();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["my_orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-bold">Riwayat Pesanan</h1>
      <p className="mt-1 text-sm text-muted-foreground">Semua pesanan Anda di Toko Serba.</p>

      {isLoading ? (
        <div className="mt-8 space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : (orders ?? []).length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">Belum ada pesanan.</p>
          <Link to="/katalog" className="btn-hero mt-4">Belanja Sekarang</Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {orders!.map((o) => (
            <Link key={o.id} to="/akun/pesanan/$id" params={{ id: o.id }} className="block rounded-2xl border border-border/60 bg-card p-5 transition hover:shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("id-ID")}</p>
                  <p className="mt-1 font-mono text-sm font-semibold">{o.order_number}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[o.status]}`}>{STATUS_LABEL[o.status]}</span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <p className="text-sm text-muted-foreground">{o.full_name}</p>
                <p className="font-display text-lg font-bold text-primary">{formatRupiah(o.total)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
