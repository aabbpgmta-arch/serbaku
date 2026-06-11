import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { ArrowLeft, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatRupiah } from "@/lib/format";
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/order-status";
import { Button } from "@/components/ui/button";

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

  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
      if (error || !data) throw notFound();
      return data;
    },
  });

  if (isLoading) return <div className="container-page py-20 text-center text-muted-foreground">Memuat...</div>;
  if (!data) return null;

  async function uploadProof(file: File) {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("payment-proofs").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload gagal"); setUploading(false); return; }
    const { data: signed } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60 * 60 * 24 * 365);
    const { error: rpcErr } = await supabase.rpc("set_order_payment_proof", { _order_id: id, _url: signed?.signedUrl ?? path });
    if (rpcErr) { toast.error(rpcErr.message); setUploading(false); return; }
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
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[data.status]}`}>{STATUS_LABEL[data.status]}</span>
      </div>

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

          {data.status === "menunggu_pembayaran" && (
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
          )}
        </aside>
      </div>
    </div>
  );
}
