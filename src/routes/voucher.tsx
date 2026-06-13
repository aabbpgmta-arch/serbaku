import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Tag, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { VoucherCountdown } from "@/components/site/VoucherCountdown";
import { formatIdLongDate, deriveVoucherStatus } from "@/lib/datetime-id";

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
  is_active: boolean;
};

function VoucherPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["public_vouchers"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("vouchers")
        .select("id,code,description,discount_type,discount_value,min_subtotal,max_discount,starts_at,expires_at,is_active")
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order("expires_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as PublicVoucher[];
    },
  });

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-10">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold md:text-4xl">Voucher & Kode Promo</h1>
          <p className="mt-2 text-muted-foreground">Salin kode dan gunakan saat checkout</p>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground">Memuat voucher...</p>
        ) : (data ?? []).length === 0 ? (
          <p className="text-center text-muted-foreground">Belum ada voucher aktif saat ini.</p>
        ) : (
          <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
            {data!.map((v) => <PublicVoucherCard key={v.id} v={v} />)}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

function PublicVoucherCard({ v }: { v: PublicVoucher }) {
  const [copied, setCopied] = useState(false);
  const status = deriveVoucherStatus({ is_active: v.is_active, starts_at: v.starts_at, expires_at: v.expires_at });
  async function copy() {
    await navigator.clipboard.writeText(v.code);
    setCopied(true);
    toast.success(`Kode ${v.code} disalin`);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Tag className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold tracking-wider text-primary">{v.code}</span>
            {status === "scheduled" && <Badge variant="outline" className="text-xs">Segera</Badge>}
          </div>
          <div className="mt-0.5 font-semibold">
            Diskon {v.discount_type === "percent" ? `${v.discount_value}%` : formatRupiah(v.discount_value)}
          </div>
          {v.description && <div className="mt-0.5 text-xs text-muted-foreground">{v.description}</div>}
          <div className="mt-1 text-xs text-muted-foreground">
            {v.min_subtotal > 0 ? `Min. Belanja ${formatRupiah(v.min_subtotal)}` : "Tanpa minimum belanja"}
            {v.max_discount ? ` • Maks. ${formatRupiah(v.max_discount)}` : ""}
          </div>
          {v.expires_at && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="text-muted-foreground">Berlaku sampai {formatIdLongDate(v.expires_at)}</span>
              <VoucherCountdown target={v.expires_at} className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive" />
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
