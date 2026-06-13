import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { ChevronRight, Upload, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/format";
import { STATUS_LABEL, STATUS_COLOR, STATUS_ORDER } from "@/lib/order-status";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/_admin/admin/pesanan")({
  head: () => ({ meta: [{ title: "Admin Pesanan — Toko Serba" }, { name: "robots", content: "noindex" }] }),
  component: AdminPesanan,
});

type Order = {
  id: string; order_number: string; full_name: string; whatsapp: string; email: string | null;
  address: string; city: string; province: string; postal_code: string | null; notes: string | null;
  subtotal: number; shipping_cost: number; total: number; status: string; created_at: string;
  payment_proof_url: string | null; tracking_number: string | null; tracking_image_url: string | null;
  order_items: Array<{ id: string; product_name: string; quantity: number; unit_price: number; subtotal: number }>;
};

type OrderStatus = "menunggu_pembayaran" | "diproses" | "dikirim" | "selesai" | "dibatalkan";

function AdminPesanan() {
  const qc = useQueryClient();
  const [detail, setDetail] = useState<Order | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin_orders"],
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        const nextOrder = payload.new as Partial<Order> | null;
        if (nextOrder?.id) {
          qc.setQueryData<Order[]>(["admin_orders"], (current) =>
            current?.map((order) => (order.id === nextOrder.id ? { ...order, ...nextOrder } : order)),
          );
          setDetail((current) => (current?.id === nextOrder.id ? ({ ...current, ...nextOrder } as Order) : current));
        }
        qc.invalidateQueries({ queryKey: ["admin_orders"] });
      })
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Realtime pesanan gagal, fallback refresh 10 detik aktif", error);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  async function updateStatus(id: string, status: string) {
    const newStatus = status as OrderStatus;
    const { data: updated, error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", id)
      .select("id,status")
      .single();

    if (error || !updated) {
      console.error("Gagal memperbarui status pesanan", { orderId: id, status: newStatus, error });
      toast.error(error?.message ?? "Status gagal diperbarui");
      return;
    }

    qc.setQueryData<Order[]>(["admin_orders"], (current) =>
      current?.map((order) => (order.id === id ? { ...order, status: updated.status } : order)),
    );
    setDetail((current) => (current?.id === id ? { ...current, status: updated.status } : current));
    await qc.invalidateQueries({ queryKey: ["admin_orders"] });
    toast.success("Status diperbarui");
  }

  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filtered = (orders ?? []).filter((o) => filterStatus === "all" || o.status === filterStatus);

  function exportXlsx() {
    if (filtered.length === 0) { toast.error("Tidak ada data untuk diexport"); return; }
    const rows = filtered.map((o) => ({
      "No. Pesanan": o.order_number,
      "Tanggal": new Date(o.created_at).toLocaleString("id-ID"),
      "Nama": o.full_name,
      "WhatsApp": o.whatsapp,
      "Email": o.email ?? "",
      "Alamat": o.address,
      "Kota": o.city,
      "Provinsi": o.province,
      "Kode Pos": o.postal_code ?? "",
      "Subtotal": o.subtotal,
      "Ongkir": o.shipping_cost,
      "Total": o.total,
      "Status": STATUS_LABEL[o.status] ?? o.status,
      "No. Resi": o.tracking_number ?? "",
      "Item": o.order_items.map((i) => `${i.product_name} x${i.quantity}`).join("; "),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pesanan");
    const fname = `pesanan-${filterStatus}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fname);
    toast.success(`${rows.length} pesanan diexport`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Pesanan</h1>
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-44 text-xs"><SelectValue placeholder="Filter status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              {STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={exportXlsx}>
            <Download className="h-3.5 w-3.5" /> Export XLSX
          </Button>
        </div>
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">No. Pesanan</th>
              <th className="px-4 py-3 text-left">Pelanggan</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">Memuat...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">Belum ada pesanan.</td></tr>
              : filtered.map((o) => (
                <tr key={o.id} className="border-t border-border/60">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs">{o.order_number}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(o.created_at).toLocaleString("id-ID")}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{o.full_name}</p>
                    <p className="text-xs text-muted-foreground">{o.whatsapp}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{formatRupiah(o.total)}</td>
                  <td className="px-4 py-3">
                    <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                      <SelectTrigger className={`h-8 w-44 text-xs ${STATUS_COLOR[o.status]}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => setDetail(o)}>Detail <ChevronRight className="h-3 w-3" /></Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {detail && <OrderDetailDialog order={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function OrderDetailDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const qc = useQueryClient();
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function saveTracking() {
    const { error } = await supabase.from("orders").update({ tracking_number: tracking }).eq("id", order.id);
    if (error) toast.error(error.message); else { toast.success("Resi tersimpan"); qc.invalidateQueries({ queryKey: ["admin_orders"] }); }
  }

  async function uploadReceipt(file: File) {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${order.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("shipping-receipts").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data: signed } = await supabase.storage.from("shipping-receipts").createSignedUrl(path, 60 * 60 * 24 * 365);
    await supabase.from("orders").update({ tracking_image_url: signed?.signedUrl ?? path }).eq("id", order.id);
    toast.success("Foto resi terupload");
    setUploading(false);
    qc.invalidateQueries({ queryKey: ["admin_orders"] });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle className="font-mono">{order.order_number}</DialogTitle></DialogHeader>
        <div className="grid gap-5 text-sm">
          <section>
            <h3 className="font-semibold">Pelanggan</h3>
            <p>{order.full_name} · {order.whatsapp}</p>
            {order.email && <p className="text-muted-foreground">{order.email}</p>}
            <p className="mt-1 text-muted-foreground">{order.address}, {order.city}, {order.province} {order.postal_code}</p>
            {order.notes && <p className="mt-2 rounded-lg bg-muted p-2 text-xs">Catatan: {order.notes}</p>}
          </section>

          <section>
            <h3 className="font-semibold">Item</h3>
            <div className="mt-2 space-y-1.5">
              {order.order_items.map((i) => (
                <div key={i.id} className="flex justify-between text-sm">
                  <span>{i.product_name} <span className="text-muted-foreground">×{i.quantity}</span></span>
                  <span className="font-semibold">{formatRupiah(i.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-border pt-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatRupiah(order.subtotal)}</span></div>
              <div className="flex justify-between"><span>Ongkir</span><span>{order.shipping_cost > 0 ? formatRupiah(order.shipping_cost) : "—"}</span></div>
              <div className="mt-1 flex justify-between font-bold text-primary"><span>Total</span><span>{formatRupiah(order.total)}</span></div>
            </div>
          </section>

          {order.payment_proof_url && (
            <section>
              <h3 className="font-semibold">Bukti Pembayaran</h3>
              <a href={order.payment_proof_url} target="_blank" rel="noreferrer" className="text-primary underline">Lihat bukti</a>
            </section>
          )}

          <section>
            <h3 className="font-semibold">Resi Pengiriman</h3>
            <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto]">
              <div>
                <Label className="text-xs">No. Resi</Label>
                <Input value={tracking} onChange={(e) => setTracking(e.target.value)} />
              </div>
              <Button onClick={saveTracking} className="self-end">Simpan Resi</Button>
            </div>
            <div className="mt-3">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadReceipt(e.target.files[0])} />
              <Button variant="outline" size="sm" className="gap-1.5" disabled={uploading} onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> {uploading ? "Mengupload..." : "Upload Foto Resi"}
              </Button>
              {order.tracking_image_url && <a href={order.tracking_image_url} target="_blank" rel="noreferrer" className="ml-3 text-xs text-primary underline">Lihat foto resi</a>}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
