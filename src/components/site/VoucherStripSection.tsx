import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Tag, ArrowRight, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { VoucherCountdown } from "./VoucherCountdown";

type V = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_subtotal: number;
  max_discount: number | null;
  expires_at: string | null;
};

export function VoucherStripSection() {
  const { data } = useQuery({
    queryKey: ["home_active_vouchers"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_active_vouchers");
      if (error) throw error;
      return ((data ?? []) as V[]).slice(0, 3);
    },
  });
  if (!data || data.length === 0) return null;
  return (
    <section className="container-page py-10">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <span className="badge-pink">Promo</span>
          <h2 className="mt-2 font-display text-2xl font-bold md:text-3xl">Voucher Aktif</h2>
        </div>
        <Link to="/voucher" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          Lihat semua <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {data.map((v) => <StripCard key={v.id} v={v} />)}
      </div>
    </section>
  );
}

function StripCard({ v }: { v: V }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(v.code);
    setCopied(true);
    toast.success(`Kode ${v.code} disalin`);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-card to-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Tag className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-base font-bold tracking-wider text-primary">{v.code}</div>
          <div className="text-sm font-semibold">
            Diskon {v.discount_type === "percent" ? `${v.discount_value}%` : formatRupiah(v.discount_value)}
          </div>
          <div className="text-xs text-muted-foreground">
            {v.min_subtotal > 0 ? `Min. ${formatRupiah(v.min_subtotal)}` : "Tanpa minimum"}
            {v.max_discount ? ` • Maks. ${formatRupiah(v.max_discount)}` : ""}
          </div>
          {v.expires_at && (
            <VoucherCountdown target={v.expires_at} className="mt-1.5 inline-block rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive" />
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
