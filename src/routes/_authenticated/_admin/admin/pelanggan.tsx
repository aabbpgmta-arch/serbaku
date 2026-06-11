import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/_admin/admin/pelanggan")({
  head: () => ({ meta: [{ title: "Admin Pelanggan — Toko Serba" }, { name: "robots", content: "noindex" }] }),
  component: AdminPelanggan,
});

function AdminPelanggan() {
  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin_customers"],
    queryFn: async () => {
      const [{ data: profiles }, { data: orders }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("user_id, total, status"),
      ]);
      const stats = new Map<string, { count: number; total: number }>();
      (orders ?? []).forEach((o: { user_id: string | null; total: number; status: string }) => {
        if (!o.user_id || o.status === "dibatalkan") return;
        const s = stats.get(o.user_id) ?? { count: 0, total: 0 };
        stats.set(o.user_id, { count: s.count + 1, total: s.total + Number(o.total) });
      });
      return (profiles ?? []).map((p) => ({ ...p, _stats: stats.get(p.id) ?? { count: 0, total: 0 } }));
    },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Pelanggan</h1>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Nama</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">WhatsApp</th>
              <th className="px-4 py-3 text-right">Jumlah Pesanan</th>
              <th className="px-4 py-3 text-right">Total Pembelian</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">Memuat...</td></tr>
              : (rows ?? []).length === 0 ? <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">Belum ada pelanggan.</td></tr>
              : rows!.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium">{r.full_name || "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                  <td className="px-4 py-3">{r.whatsapp || "-"}</td>
                  <td className="px-4 py-3 text-right">{r._stats.count}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatRupiah(r._stats.total)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
