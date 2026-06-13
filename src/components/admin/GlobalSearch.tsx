import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Package, ShoppingBag, Users, Tag, Zap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

type Result =
  | { kind: "produk"; id: string; label: string; sublabel: string; to: string }
  | { kind: "pesanan"; id: string; label: string; sublabel: string; to: string }
  | { kind: "pelanggan"; id: string; label: string; sublabel: string; to: string }
  | { kind: "voucher"; id: string; label: string; sublabel: string; to: string }
  | { kind: "flash"; id: string; label: string; sublabel: string; to: string };

const ICONS = {
  produk: Package, pesanan: ShoppingBag, pelanggan: Users, voucher: Tag, flash: Zap,
} as const;

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const like = `%${term}%`;
        const [prod, ord, prof, vou, fs] = await Promise.all([
          supabase.from("products").select("id,name,slug,price").ilike("name", like).limit(5),
          supabase.from("orders").select("id,order_number,full_name,total").or(`order_number.ilike.${like},full_name.ilike.${like},whatsapp.ilike.${like}`).limit(5),
          supabase.from("profiles").select("id,full_name,email,whatsapp").or(`full_name.ilike.${like},email.ilike.${like},whatsapp.ilike.${like}`).limit(5),
          supabase.from("vouchers").select("id,code,discount_value,discount_type").ilike("code", like).limit(5),
          supabase.from("flash_sales").select("id,name,starts_at,ends_at").ilike("name", like).limit(5),
        ]);
        const out: Result[] = [];
        for (const p of prod.data ?? []) out.push({ kind: "produk", id: p.id, label: p.name, sublabel: `Rp ${Number(p.price).toLocaleString("id-ID")}`, to: "/admin/produk" });
        for (const o of ord.data ?? []) out.push({ kind: "pesanan", id: o.id, label: o.order_number, sublabel: o.full_name, to: "/admin/pesanan" });
        for (const p of prof.data ?? []) out.push({ kind: "pelanggan", id: p.id, label: p.full_name ?? p.email ?? "—", sublabel: p.email ?? p.whatsapp ?? "", to: "/admin/pelanggan" });
        for (const v of vou.data ?? []) out.push({ kind: "voucher", id: v.id, label: v.code, sublabel: `Diskon ${v.discount_type === "percent" ? v.discount_value + "%" : "Rp " + Number(v.discount_value).toLocaleString("id-ID")}`, to: "/admin/voucher" });
        for (const f of fs.data ?? []) out.push({ kind: "flash", id: f.id, label: f.name, sublabel: new Date(f.starts_at).toLocaleDateString("id-ID"), to: "/admin/promosi/flash-sale" });
        if (!ctrl.signal.aborted) setResults(out);
      } catch (e) {
        console.error("[global search]", e);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { ctrl.abort(); clearTimeout(t); setLoading(false); };
  }, [q]);

  const grouped = useMemo(() => {
    const g: Record<Result["kind"], Result[]> = { produk: [], pesanan: [], pelanggan: [], voucher: [], flash: [] };
    for (const r of results) g[r.kind].push(r);
    return g;
  }, [results]);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Cari produk, pesanan, pelanggan…"
          className="h-9 pl-8 text-sm"
        />
        {loading && <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[420px] overflow-y-auto rounded-xl border border-border bg-popover p-2 shadow-lg">
          {results.length === 0 && !loading && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">Tidak ada hasil untuk "{q}"</p>
          )}
          {(Object.keys(grouped) as Array<Result["kind"]>).map((k) => {
            const items = grouped[k];
            if (items.length === 0) return null;
            const Icon = ICONS[k];
            const labels = { produk: "Produk", pesanan: "Pesanan", pelanggan: "Pelanggan", voucher: "Voucher", flash: "Flash Sale" } as const;
            return (
              <div key={k} className="py-1">
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{labels[k]}</p>
                {items.map((r) => (
                  <Link
                    key={r.kind + r.id}
                    to={r.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.label}</p>
                      {r.sublabel && <p className="truncate text-xs text-muted-foreground">{r.sublabel}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
