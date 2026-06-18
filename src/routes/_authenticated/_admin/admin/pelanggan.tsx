import { createFileRoute } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Crown, MapPin, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/format";
import { tierMeta, type MembershipTier } from "@/lib/membership";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/admin/TablePagination";

export const Route = createFileRoute("/_authenticated/_admin/admin/pelanggan")({
  head: () => ({ meta: [{ title: "Admin Pelanggan — Toko Serba" }, { name: "robots", content: "noindex" }] }),
  component: AdminPelanggan,
});

function AdminPelanggan() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, pageSize]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin_customers", { debouncedSearch, page, pageSize }],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .order("lifetime_spend", { ascending: false });
      if (debouncedSearch) {
        const s = debouncedSearch.replace(/[%,]/g, " ");
        q = q.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,whatsapp.ilike.%${s}%`);
      }
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data: profiles, error, count } = await q.range(from, to);
      if (error) throw error;
      const ids = (profiles ?? []).map((p) => p.id);
      let stats = new Map<string, { count: number; total: number }>();
      if (ids.length) {
        const { data: orders } = await supabase
          .from("orders")
          .select("user_id, total, status")
          .in("user_id", ids);
        (orders ?? []).forEach((o: { user_id: string | null; total: number; status: string }) => {
          if (!o.user_id || o.status === "dibatalkan") return;
          const s = stats.get(o.user_id) ?? { count: 0, total: 0 };
          stats.set(o.user_id, { count: s.count + 1, total: s.total + Number(o.total) });
        });
      }
      const rows = (profiles ?? []).map((p) => ({ ...p, _stats: stats.get(p.id) ?? { count: 0, total: 0 } }));
      return { rows, total: count ?? 0 };
    },
  });

  const rows = data?.rows;
  const total = data?.total ?? 0;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Pelanggan</h1>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, email, WhatsApp…" className="h-9 w-72 pl-8 text-xs" />
        </div>
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Nama</th>
              <th className="px-4 py-3 text-left">Kontak</th>
              <th className="px-4 py-3 text-left">Alamat</th>
              <th className="px-4 py-3 text-left">Membership</th>
              <th className="px-4 py-3 text-right">Jml Pesanan</th>
              <th className="px-4 py-3 text-right">Total Belanja</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">Memuat...</td></tr>
              : (rows ?? []).length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">Belum ada pelanggan.</td></tr>
              : rows!.map((r) => {
                const tier = tierMeta((r.membership_tier as MembershipTier) ?? "new");
                const addr = [r.address, r.city, r.province, r.postal_code].filter(Boolean).join(", ");
                return (
                  <tr key={r.id} className="border-t border-border/60 align-top">
                    <td className="px-4 py-3 font-medium">{r.full_name || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                      <div className="text-xs">{r.whatsapp || "-"}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {addr ? (
                        <div className="flex max-w-xs items-start gap-1">
                          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                          <span className="line-clamp-3">{addr}</span>
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${tier.color}`}>
                        <Crown className="h-3 w-3" /> {tier.label}
                      </span>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        Lifetime: {formatRupiah(Number(r.lifetime_spend ?? 0))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">{r._stats.count}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatRupiah(r._stats.total)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        <TablePagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} itemLabel="pelanggan" />
      </div>
    </div>
  );
}
