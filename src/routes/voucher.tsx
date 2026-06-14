import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Tag, Copy, Check, Flame, Star, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VoucherCountdown } from "@/components/site/VoucherCountdown";
import { formatIdLongDate } from "@/lib/datetime-id";

export const Route = createFileRoute("/voucher")({
  head: () => ({
    meta: [
      { title: "Voucher & Kode Promo Aktif — Toko Serba" },
      { name: "description", content: "Daftar voucher dan kode promo aktif. Hemat lebih banyak dengan kode diskon eksklusif Toko Serba." },
    ],
  }),
  component: VoucherPage,
});

type PublicVoucher = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "nominal";
  discount_value: number;
  min_subtotal: number;
  max_discount: number | null;
  starts_at: string | null;
  expires_at: string | null;
  used_count: number | null;
  is_active: boolean;
};

// Estimate max saving for sort & badge. For percent: use max_discount when set,
// otherwise project potential at min_subtotal (heuristic). For nominal: discount_value.
function estimateMaxSaving(v: PublicVoucher): number {
  if (v.discount_type === "nominal") return Number(v.discount_value) || 0;
  const pct = Number(v.discount_value) || 0;
  const base = Number(v.min_subtotal) || 0;
  const projected = base > 0 ? Math.round((base * pct) / 100) : pct * 10000; // fallback heuristic
  if (v.max_discount != null) return Math.min(projected, Number(v.max_discount));
  return projected;
}

function sortVouchers(list: PublicVoucher[]): PublicVoucher[] {
  return [...list].sort((a, b) => {
    // 1. largest saving first
    const sa = estimateMaxSaving(a);
    const sb = estimateMaxSaving(b);
    if (sb !== sa) return sb - sa;
    // 2. larger discount value
    if (b.discount_value !== a.discount_value) return Number(b.discount_value) - Number(a.discount_value);
    // 3. soonest to expire (non-null first)
    const ea = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
    const eb = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
    return ea - eb;
  });
}

function VoucherPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["public_vouchers_v2"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("vouchers")
        .select("id,code,description,discount_type,discount_value,min_subtotal,max_discount,starts_at,expires_at,used_count,is_active")
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`);
      if (error) throw error;
      // Filter out scheduled (not yet started) for customer view
      const now = Date.now();
      const filtered = (data ?? []).filter((v) => {
        if (v.starts_at && new Date(v.starts_at).getTime() > now) return false;
        return true;
      }) as PublicVoucher[];
      return sortVouchers(filtered);
    },
  });

  const mostUsedId = (() => {
    if (!data || data.length === 0) return null;
    const max = data.reduce((m, v) => Math.max(m, v.used_count ?? 0), 0);
    if (max <= 0) return null;
    const top = data.find((v) => (v.used_count ?? 0) === max);
    return top?.id ?? null;
  })();

  return (
    <main className="container mx-auto px-4 py-10">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Voucher & Kode Promo</h1>
        <p className="mt-2 text-muted-foreground">
          Salin kode dan gunakan saat checkout untuk mendapatkan potongan harga otomatis.
        </p>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground">Memuat voucher...</p>
      ) : (data ?? []).length === 0 ? (
        <p className="text-center text-muted-foreground">Belum ada voucher aktif saat ini.</p>
      ) : (
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
          {data!.map((v) => (
            <PublicVoucherCard key={v.id} v={v} isMostUsed={v.id === mostUsedId} />
          ))}
        </div>
      )}
    </main>
  );
}

function useEndingSoon(target: string | null): { endingSoon: boolean; ended: boolean } {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [target]);
  if (!target) return { endingSoon: false, ended: false };
  const diff = new Date(target).getTime() - now;
  return { endingSoon: diff > 0 && diff <= 24 * 60 * 60 * 1000, ended: diff <= 0 };
}

function PublicVoucherCard({ v, isMostUsed }: { v: PublicVoucher; isMostUsed: boolean }) {
  const [copied, setCopied] = useState(false);
  const { endingSoon, ended } = useEndingSoon(v.expires_at);
  const maxSaving = estimateMaxSaving(v);
  const used = v.used_count ?? 0;

  async function copy() {
    await navigator.clipboard.writeText(v.code);
    setCopied(true);
    toast.success(`Kode ${v.code} disalin`);
    setTimeout(() => setCopied(false), 1500);
  }

  const status: "active" | "ending" | "ended" = ended ? "ended" : endingSoon ? "ending" : "active";

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Tag className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-lg font-bold tracking-wider text-primary">{v.code}</span>
            {status === "active" && (
              <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300">Aktif</Badge>
            )}
            {status === "ending" && (
              <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300">Segera Berakhir</Badge>
            )}
            {status === "ended" && (
              <Badge variant="outline" className="text-muted-foreground">Berakhir</Badge>
            )}
            {isMostUsed && used > 0 && (
              <Badge className="bg-rose-500/15 text-rose-700 hover:bg-rose-500/15 dark:text-rose-300">
                <Flame className="mr-1 h-3 w-3" /> Paling Banyak Dipakai
              </Badge>
            )}
            {!isMostUsed && used >= 10 && (
              <Badge className="bg-violet-500/15 text-violet-700 hover:bg-violet-500/15 dark:text-violet-300">
                <Star className="mr-1 h-3 w-3" /> Favorit Reseller
              </Badge>
            )}
          </div>
          <div className="mt-0.5 font-semibold">
            Diskon {v.discount_type === "percent" ? `${v.discount_value}%` : formatRupiah(v.discount_value)}
          </div>
          {v.description && <div className="mt-0.5 text-xs text-muted-foreground">{v.description}</div>}
          <div className="mt-1 text-xs text-muted-foreground">
            {v.min_subtotal > 0 ? `Min. Belanja ${formatRupiah(v.min_subtotal)}` : "Tanpa minimum belanja"}
            {v.max_discount ? ` • Maks. Potongan ${formatRupiah(v.max_discount)}` : ""}
          </div>
          {maxSaving > 0 && (
            <div className="mt-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              Hemat hingga {formatRupiah(maxSaving)}
            </div>
          )}
          {v.expires_at && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="text-muted-foreground">Berlaku sampai {formatIdLongDate(v.expires_at)}</span>
              {endingSoon ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 font-semibold text-destructive-foreground animate-pulse">
                  <AlertTriangle className="h-3 w-3" />
                  <VoucherCountdown target={v.expires_at} />
                </span>
              ) : (
                <VoucherCountdown target={v.expires_at} className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive" />
              )}
            </div>
          )}
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={copy} className="mt-3 w-full gap-1.5">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Tersalin" : "Salin Kode"}
      </Button>
    </div>
  );
}
