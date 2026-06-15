import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Upload, Copy, Truck, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatRupiah } from "@/lib/format";
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/order-status";
import { setOrderPaymentProof } from "@/lib/orders.functions";
import { useSiteSettings } from "@/lib/site-settings";
import { Button } from "@/components/ui/button";

const TIMELINE_STEPS = [
  { status: "menunggu_pembayaran", label: "Menunggu Pembayaran" },
  { status: "diproses", label: "Diproses" },
  { status: "dikirim", label: "Dikirim" },
  { status: "selesai", label: "Selesai" },
] as const;

const ACTIVE_STEP_INDEX: Record<string, number> = {
  menunggu_pembayaran: 0,
  diproses: 1,
  dikirim: 2,
  selesai: 3,
  dibatalkan: -1,
};

export const Route = createFileRoute("/_authenticated/akun/pesanan/$id")({
  head: () => ({ meta: [{ title: "Detail Pesanan — Toko Serba" }, { name: "robots", content: "noindex" }] }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const savePaymentProof = useServerFn(setOrderPaymentProof);
  const { data: settings } = useSiteSettings();
  const payment = settings?.payment;

  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
      if (error || !data) throw notFound();
      return data;
    },
  });

  const { data: history } = useQuery({
    queryKey: ["order_history_customer", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_status_history")
        .select("id,from_status,to_status,created_at,note")
        .eq("order_id", id)
        .order("created_at", { ascending: true });
      if (error) return [];
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`customer-order-detail-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `id=eq.${id}` }, (payload) => {
        qc.setQueryData(["order", id], (current: typeof data | undefined) =>
          current ? { ...current, ...(payload.new as Partial<typeof current>) } : current,
        );
        qc.invalidateQueries({ queryKey: ["order", id] });
      })
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Realtime detail pesanan gagal, fallback refresh 10 detik aktif", error);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc, user]);

  if (isLoading) return <div className="container-page py-20 text-center text-muted-foreground">Memuat...</div>;
  if (!data) return null;

  const activeStepIndex = ACTIVE_STEP_INDEX[data.status] ?? 0;

  async function uploadProof(file: File) {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("payment-proofs").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload gagal"); setUploading(false); return; }
    const { data: signed } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60 * 60 * 24 * 365);
    try {
      await savePaymentProof({ data: { orderId: id, url: signed?.signedUrl ?? path } });
    } catch (saveError) {
      console.error("Gagal menyimpan bukti transfer", saveError);
      toast.error(saveError instanceof Error ? saveError.message : "Bukti transfer gagal disimpan");
      setUploading(false);
      return;
    }
    toast.success("Bukti transfer terkirim");
    qc.invalidateQueries({ queryKey: ["order", id] });
    setUploading(false);
  }

  return (
    <div className="container-page py-10">
      <Link to="/akun/pesanan" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Kembali ke riwayat
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-bold">{data.order_number}</h1>
          <p className="text-sm text-muted-foreground">{new Date(data.created_at).toLocaleString("id-ID")}</p>
        </div>
        <div className="text-right">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Status Pesanan</p>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[data.status]}`}>{STATUS_LABEL[data.status]}</span>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-border/60 bg-card p-5">
        {data.status === "dibatalkan" ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Timeline Status</h2>
              <p className="mt-1 text-sm text-muted-foreground">Pesanan ini tidak dilanjutkan.</p>
            </div>
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">Pesanan Dibatalkan</span>
          </div>
        ) : (
          <>
            <h2 className="font-display text-lg font-semibold">Timeline Status</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {TIMELINE_STEPS.map((step, index) => {
                const active = index <= activeStepIndex;
                return (
                  <div key={step.status} className="flex items-center gap-3 sm:block">
                    <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {index + 1}
                    </div>
                    <p className={`text-sm font-semibold sm:mt-2 ${active ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border/60 bg-card p-5">
            <h2 className="font-display text-lg font-semibold">Item Pesanan</h2>
            <div className="mt-4 space-y-3">
              {(data.order_items as Array<{ id: string; product_image: string | null; product_name: string; unit_price: number; quantity: number; subtotal: number }>).map((i) => (
                <div key={i.id} className="flex gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {i.product_image && <img src={i.product_image} className="h-full w-full object-cover" alt="" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{i.product_name}</p>
                    <p className="text-xs text-muted-foreground">{formatRupiah(i.unit_price)} × {i.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold">{formatRupiah(i.subtotal)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card p-5">
            <h2 className="font-display text-lg font-semibold">Pengiriman</h2>
            <div className="mt-3 text-sm">
              <p className="font-semibold">{data.full_name}</p>
              <p>{data.whatsapp}</p>
              <p className="mt-2 text-muted-foreground">{data.address}, {data.city}, {data.province} {data.postal_code}</p>
            </div>
            {data.tracking_number && (
              <div className="mt-4 rounded-xl bg-accent p-3">
                <p className="text-xs text-muted-foreground">No. Resi</p>
                <p className="font-mono text-sm font-semibold">{data.tracking_number}</p>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <h2 className="font-display text-lg font-semibold">Total</h2>
            <div className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatRupiah(data.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Ongkir ({data.shipping_payer})</span><span>{data.shipping_cost > 0 ? formatRupiah(data.shipping_cost) : "—"}</span></div>
              <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold"><span>Total</span><span className="text-primary">{formatRupiah(data.total)}</span></div>
            </div>
          </div>

          {data.status === "menunggu_pembayaran" && payment && (
            <>
              <div className="overflow-hidden rounded-2xl border-2 border-primary/20 bg-white shadow-elegant">
                <div className="bg-gradient-to-br from-primary/10 to-accent/40 p-5">
                  <h2 className="font-display text-lg font-bold text-foreground">Informasi Pembayaran</h2>
                  <p className="text-xs text-muted-foreground">Silakan transfer ke rekening di bawah</p>
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex items-center gap-3 rounded-xl border border-primary/15 bg-white p-3">
                    {payment.bank_logo_url ? (
                      <img src={payment.bank_logo_url} alt={payment.bank_name} className="h-10 w-auto max-w-[80px] object-contain" />
                    ) : (
                      <div className="grid h-10 w-16 place-items-center rounded bg-muted text-xs font-bold">{payment.bank_name.slice(0,3).toUpperCase()}</div>
                    )}
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Bank</p>
                      <p className="text-sm font-bold">{payment.bank_name}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Atas Nama</p>
                    <p className="font-semibold">{payment.account_holder}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">No. Rekening</p>
                    <p className="font-mono text-lg font-bold tracking-wider text-primary">{payment.account_number}</p>
                  </div>
                  <Button
                    type="button"
                    className="w-full gap-2"
                    onClick={() => {
                      navigator.clipboard.writeText(payment.account_number);
                      toast.success("Nomor rekening berhasil disalin");
                    }}
                  >
                    <Copy className="h-4 w-4" /> Salin Nomor Rekening
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-primary/15 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  <h3 className="font-display text-base font-semibold">Panduan Pembayaran</h3>
                </div>
                <ol className="mt-3 space-y-1.5 pl-5 text-sm text-muted-foreground [&>li]:list-decimal">
                  <li>Transfer sesuai total pembayaran yang tertera.</li>
                  <li>Transfer ke rekening {payment.bank_name} yang tersedia di atas.</li>
                  <li>Setelah transfer, upload bukti pembayaran.</li>
                  <li>Admin akan memverifikasi pembayaran.</li>
                  <li>Setelah pembayaran dikonfirmasi, pesanan akan diproses.</li>
                </ol>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <h3 className="font-display text-base font-semibold text-amber-900">Penting</h3>
                </div>
                <p className="mt-2 text-xs text-amber-900">Transfer hanya ke:</p>
                <div className="mt-1 rounded-lg bg-white/70 p-2 text-xs">
                  <p className="font-semibold">{payment.bank_name}</p>
                  <p>A/N {payment.account_holder}</p>
                  <p className="font-mono">No. Rek {payment.account_number}</p>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-amber-900">
                  <li>• Pastikan nominal transfer sesuai dengan total pesanan.</li>
                  <li>• Kesalahan transfer bukan tanggung jawab pihak toko.</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card p-5">
                <h2 className="font-display text-base font-semibold">Bukti Transfer</h2>
                {data.payment_proof_url ? (
                  <div className="mt-3">
                    <a href={data.payment_proof_url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Lihat bukti terkirim</a>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">Upload bukti pembayaran agar pesanan diproses.</p>
                )}
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadProof(e.target.files[0])} />
                <Button type="button" variant="outline" className="mt-3 w-full gap-2" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4" /> {uploading ? "Mengupload..." : "Upload Bukti"}
                </Button>
              </div>
            </>
          )}

          {data.status === "diproses" && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-blue-600" /><h3 className="font-semibold text-blue-900">Pembayaran Diterima</h3></div>
              <p className="mt-2 text-sm text-blue-900">Pembayaran telah diterima dan pesanan sedang diproses.</p>
            </div>
          )}

          {data.status === "dikirim" && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
              <div className="flex items-center gap-2"><Truck className="h-5 w-5 text-indigo-600" /><h3 className="font-semibold text-indigo-900">Pesanan Dikirim</h3></div>
              {data.tracking_number ? (
                <div className="mt-3 rounded-lg bg-white p-3">
                  <p className="text-xs text-muted-foreground">No. Resi</p>
                  <p className="font-mono text-sm font-bold">{data.tracking_number}</p>
                </div>
              ) : <p className="mt-2 text-sm text-indigo-900">Pesanan dalam perjalanan ke alamat Anda.</p>}
            </div>
          )}

          {data.status === "selesai" && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><h3 className="font-semibold text-emerald-900">Selesai</h3></div>
              <p className="mt-2 text-sm text-emerald-900">Pesanan telah selesai. Terima kasih atas kepercayaan Anda!</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
