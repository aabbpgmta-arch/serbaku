import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollText, History, ArrowRight } from "lucide-react";
import { formatRupiah } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/_admin/admin/audit")({
  head: () => ({ meta: [{ title: "Audit & Log — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AuditPage,
});

type LogRow = { id: string; admin_id: string | null; action: string; entity: string; entity_id: string | null; meta: Record<string, unknown> | null; created_at: string };
type PriceRow = { id: string; product_id: string; old_price: number; new_price: number; created_at: string };

function AuditPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Audit & Log</h1>
      <p className="mt-1 text-sm text-muted-foreground">Lacak aktivitas admin dan perubahan harga produk.</p>

      <Tabs defaultValue="activity" className="mt-6">
        <TabsList>
          <TabsTrigger value="activity"><ScrollText className="mr-1.5 h-4 w-4" /> Activity Log</TabsTrigger>
          <TabsTrigger value="prices"><History className="mr-1.5 h-4 w-4" /> Riwayat Harga</TabsTrigger>
        </TabsList>
        <TabsContent value="activity"><ActivityLogList /></TabsContent>
        <TabsContent value="prices"><PriceHistoryList /></TabsContent>
      </Tabs>
    </div>
  );
}

function ActivityLogList() {
  const { data, isLoading } = useQuery({
    queryKey: ["activity_logs"],
    queryFn: async () => {
      const client = supabase as unknown as { from: (t: string) => { select: (c: string) => { order: (col: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: LogRow[] | null }> } } } };
      const { data } = await client.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200);
      const rows = (data ?? []) as LogRow[];
      const adminIds = Array.from(new Set(rows.map((r) => r.admin_id).filter(Boolean))) as string[];
      let names: Record<string, string> = {};
      if (adminIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", adminIds);
        names = Object.fromEntries((profs ?? []).map((p) => [p.id, p.full_name || p.email || p.id]));
      }
      return rows.map((r) => ({ ...r, admin_name: r.admin_id ? (names[r.admin_id] ?? "Admin") : "System" }));
    },
  });

  if (isLoading) return <p className="py-10 text-center text-sm text-muted-foreground">Memuat...</p>;
  if ((data ?? []).length === 0)
    return <p className="mt-4 rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">Belum ada aktivitas tercatat.</p>;

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-border/60 bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr><th className="px-4 py-3">Waktu</th><th className="px-4 py-3">Admin</th><th className="px-4 py-3">Aksi</th><th className="px-4 py-3">Entitas</th></tr>
        </thead>
        <tbody>
          {(data ?? []).map((r) => (
            <tr key={r.id} className="border-t border-border/60">
              <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("id-ID")}</td>
              <td className="px-4 py-3">{r.admin_name}</td>
              <td className="px-4 py-3"><span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">{r.action}</span></td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {r.entity}{r.entity_id ? ` · ${r.entity_id.slice(0, 8)}` : ""}
                {r.meta && Object.keys(r.meta).length > 0 && (
                  <span className="ml-2 text-foreground/70">{Object.entries(r.meta).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PriceHistoryList() {
  const { data, isLoading } = useQuery({
    queryKey: ["price_history_recent"],
    queryFn: async () => {
      const client = supabase as unknown as { from: (t: string) => { select: (c: string) => { order: (col: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: PriceRow[] | null }> } } } };
      const { data } = await client.from("product_price_history").select("*").order("created_at", { ascending: false }).limit(200);
      const rows = (data ?? []) as PriceRow[];
      const pids = Array.from(new Set(rows.map((r) => r.product_id)));
      let names: Record<string, string> = {};
      if (pids.length) {
        const { data: prods } = await supabase.from("products").select("id, name").in("id", pids);
        names = Object.fromEntries((prods ?? []).map((p) => [p.id, p.name]));
      }
      return rows.map((r) => ({ ...r, product_name: names[r.product_id] ?? "(produk dihapus)" }));
    },
  });

  if (isLoading) return <p className="py-10 text-center text-sm text-muted-foreground">Memuat...</p>;
  if ((data ?? []).length === 0)
    return <p className="mt-4 rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">Belum ada perubahan harga.</p>;

  return (
    <div className="mt-4 space-y-2">
      {(data ?? []).map((r) => {
        const diff = r.new_price - r.old_price;
        return (
          <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{r.product_name}</p>
              <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("id-ID")}</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground line-through">{formatRupiah(r.old_price)}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold">{formatRupiah(r.new_price)}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${diff > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                {diff > 0 ? "+" : ""}{formatRupiah(diff)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
