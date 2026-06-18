import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  ChevronRight, Upload, Download, MessageCircle, Search, Printer, FileText,
  Calendar as CalendarIcon, Clock, CheckCircle2, Truck, XCircle, Package, ShoppingBag,
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/format";
import {
  STATUS_LABEL, STATUS_COLOR, STATUS_ORDER, nextStatuses, isFinalStatus,
  type OrderStatus,
} from "@/lib/order-status";
import { printInvoice, printPackingSlip } from "@/lib/print-templates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/admin/TablePagination";

export const Route = createFileRoute("/_authenticated/_admin/admin/pesanan")({
  head: () => ({ meta: [{ title: "Admin Pesanan — Toko Serba" }, { name: "robots", content: "noindex" }] }),
  component: AdminPesanan,
});

type OrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

type Order = {
  id: string; order_number: string; full_name: string; whatsapp: string; email: string | null;
  address: string; city: string; province: string; postal_code: string | null; notes: string | null;
  subtotal: number; shipping_cost: number; total: number; status: string; created_at: string;
  payment_proof_url: string | null; tracking_number: string | null; tracking_image_url: string | null;
  shipped_courier: string | null;
  paid_at: string | null; shipped_at: string | null; completed_at: string | null; cancelled_at: string | null;
  voucher_code: string | null; voucher_discount: number; membership_discount: number;
  order_items: OrderItem[];
};

type DateRange = "all" | "today" | "yesterday" | "7d" | "30d" | "month" | "custom";

function waLink(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? "62" + digits.slice(1) : digits.startsWith("62") ? digits : "62" + digits;
  return `https://wa.me/${intl}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

function rangeBounds(range: DateRange, customFrom?: string, customTo?: string): [Date | null, Date | null] {
  const now = new Date();
  switch (range) {
    case "today": return [startOfDay(now), endOfDay(now)];
    case "yesterday": { const y = new Date(now); y.setDate(now.getDate() - 1); return [startOfDay(y), endOfDay(y)]; }
    case "7d": { const a = new Date(now); a.setDate(now.getDate() - 6); return [startOfDay(a), endOfDay(now)]; }
    case "30d": { const a = new Date(now); a.setDate(now.getDate() - 29); return [startOfDay(a), endOfDay(now)]; }
    case "month": return [new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0), endOfDay(now)];
    case "custom": {
      const f = customFrom ? startOfDay(new Date(customFrom)) : null;
      const t = customTo ? endOfDay(new Date(customTo)) : null;
      return [f, t];
    }
    default: return [null, null];
  }
}

type WaTemplates = { diproses: string; dikirim: string; selesai: string; dibatalkan: string };
const WA_DEFAULTS: WaTemplates = {
  diproses:  "Halo {nama} 👋\n\nPembayaran pesanan *{nomor}* sudah kami terima. Pesanan Anda sedang kami *PROSES* untuk dipacking. Terima kasih 🙏",
  dikirim:   "Halo {nama} 👋\n\nPesanan *{nomor}* sudah kami *KIRIM* via {kurir}. No. resi: *{resi}*. Mohon ditunggu ya 🚚",
  selesai:   "Halo {nama} 👋\n\nTerima kasih, pesanan *{nomor}* telah *SELESAI*. Semoga berkenan kembali belanja di toko kami ❤️",
  dibatalkan:"Halo {nama} 🙏\n\nMohon maaf pesanan *{nomor}* telah *DIBATALKAN*. Jika ini keliru, silakan balas pesan ini.",
};
function fillTemplate(tpl: string, o: Order): string {
  return tpl
    .replace(/\{nama\}/g, o.full_name || "")
    .replace(/\{nomor\}/g, o.order_number || "")
    .replace(/\{kurir\}/g, o.shipped_courier || "-")
    .replace(/\{resi\}/g, o.tracking_number || "-")
    .replace(/\{total\}/g, new Intl.NumberFormat("id-ID").format(o.total || 0));
}

function AdminPesanan() {
  const qc = useQueryClient();
  const [detail, setDetail] = useState<Order | null>(null);
  const [pendingChange, setPendingChange] = useState<{ id: string; to: OrderStatus; orderNumber: string } | null>(null);
  const [waPrompt, setWaPrompt] = useState<{ order: Order; status: OrderStatus } | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [range, setRange] = useState<DateRange>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, filterStatus, range, customFrom, customTo, pageSize]);

  const { data: waTemplates } = useQuery({
    queryKey: ["setting", "orders"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "orders").maybeSingle();
      const raw = (data?.value as { wa_templates?: Partial<WaTemplates> } | null) ?? {};
      return { ...WA_DEFAULTS, ...(raw.wa_templates ?? {}) } as WaTemplates;
    },
  });

  // Lightweight stats query (status + created_at only) across all orders for the stat cards.
  const { data: statsRows } = useQuery({
    queryKey: ["admin_orders_stats"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("status, created_at");
      if (error) throw error;
      return (data ?? []) as { status: string; created_at: string }[];
    },
  });

  const { data: ordersPage, isLoading } = useQuery({
    queryKey: ["admin_orders", { debouncedSearch, filterStatus, range, customFrom, customTo, page, pageSize }],
    placeholderData: keepPreviousData,
    refetchInterval: 10_000,
    queryFn: async () => {
      let q = supabase
        .from("orders")
        .select("*, order_items(id,product_id,product_name,product_image,quantity,unit_price,subtotal)", { count: "exact" })
        .order("created_at", { ascending: false });
      if (filterStatus !== "all") q = q.eq("status", filterStatus as OrderStatus);
      const [from, to] = rangeBounds(range, customFrom, customTo);
      if (from) q = q.gte("created_at", from.toISOString());
      if (to) q = q.lte("created_at", to.toISOString());
      if (debouncedSearch) {
        const s = debouncedSearch.replace(/[%,]/g, " ");
        q = q.or(`order_number.ilike.%${s}%,full_name.ilike.%${s}%,whatsapp.ilike.%${s}%,email.ilike.%${s}%`);
      }
      const fromIdx = (page - 1) * pageSize;
      const toIdx = fromIdx + pageSize - 1;
      const { data, error, count } = await q.range(fromIdx, toIdx);
      if (error) throw error;
      return { rows: (data ?? []) as Order[], total: count ?? 0 };
    },
  });
  const orders = ordersPage?.rows;
  const total = ordersPage?.total ?? 0;

  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        const nextOrder = payload.new as Partial<Order> | null;
        if (nextOrder?.id) {
          setDetail((current) => (current?.id === nextOrder.id ? ({ ...current, ...nextOrder } as Order) : current));
        }
        qc.invalidateQueries({ queryKey: ["admin_orders"] });
        qc.invalidateQueries({ queryKey: ["admin_orders_stats"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);


  async function applyStatusChange(id: string, newStatus: OrderStatus) {
    const patch = { status: newStatus, ...(newStatus === "dikirim" ? { shipped_at: new Date().toISOString() } : {}) };
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message ?? "Status gagal diperbarui");
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin_orders"] });
    toast.success("Status diperbarui");
    // Offer to send WA notification (if template exists for the new status)
    if (newStatus === "diproses" || newStatus === "dikirim" || newStatus === "selesai" || newStatus === "dibatalkan") {
      const order = (orders ?? []).find((o) => o.id === id);
      if (order) {
        setWaPrompt({ order: { ...order, status: newStatus }, status: newStatus });
      }
    }
  }

  // Stats (lightweight: status + created_at across ALL orders)
  const stats = useMemo(() => {
    const list = statsRows ?? [];
    const todayBounds = rangeBounds("today");
    const today = list.filter((o) => {
      const d = new Date(o.created_at);
      return todayBounds[0] && todayBounds[1] && d >= todayBounds[0] && d <= todayBounds[1];
    }).length;
    const by = (s: string) => list.filter((o) => o.status === s).length;
    return {
      today,
      menunggu: by("menunggu_pembayaran"),
      diproses: by("diproses"),
      dikirim: by("dikirim"),
      selesai: by("selesai"),
      dibatalkan: by("dibatalkan"),
    };
  }, [statsRows]);

  // Page rows already filtered server-side
  const filtered = orders ?? [];


  function exportXlsx() {
    if (filtered.length === 0) { toast.error("Tidak ada data untuk diexport"); return; }
    const rows = filtered.map((o) => ({
      "No. Pesanan": o.order_number,
      "Tanggal": new Date(o.created_at).toLocaleString("id-ID"),
      "Nama": o.full_name,
      "WhatsApp": o.whatsapp,
      "Total Item": o.order_items.reduce((a, i) => a + i.quantity, 0),
      "Total": o.total,
      "Status": STATUS_LABEL[o.status] ?? o.status,
      "Kurir": o.shipped_courier ?? "",
      "No. Resi": o.tracking_number ?? "",
      "Item": o.order_items.map((i) => `${i.product_name} x${i.quantity}`).join("; "),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pesanan");
    XLSX.writeFile(wb, `pesanan-${filterStatus}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`${rows.length} pesanan diexport`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Pesanan</h1>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={exportXlsx}>
          <Download className="h-3.5 w-3.5" /> Export XLSX
        </Button>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={<ShoppingBag className="h-4 w-4" />} label="Hari Ini" value={stats.today} color="bg-primary/10 text-primary" />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Menunggu" value={stats.menunggu} color="bg-amber-100 text-amber-800" />
        <StatCard icon={<Package className="h-4 w-4" />} label="Diproses" value={stats.diproses} color="bg-blue-100 text-blue-800" />
        <StatCard icon={<Truck className="h-4 w-4" />} label="Dikirim" value={stats.dikirim} color="bg-indigo-100 text-indigo-800" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Selesai" value={stats.selesai} color="bg-emerald-100 text-emerald-800" />
        <StatCard icon={<XCircle className="h-4 w-4" />} label="Dibatalkan" value={stats.dibatalkan} color="bg-red-100 text-red-800" />
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari no. pesanan, nama, HP, produk…"
            className="h-9 w-72 pl-8 text-xs"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-40 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
          <SelectTrigger className="h-9 w-36 text-xs"><CalendarIcon className="mr-1 h-3 w-3" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tanggal</SelectItem>
            <SelectItem value="today">Hari Ini</SelectItem>
            <SelectItem value="yesterday">Kemarin</SelectItem>
            <SelectItem value="7d">7 Hari</SelectItem>
            <SelectItem value="30d">30 Hari</SelectItem>
            <SelectItem value="month">Bulan Ini</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        {range === "custom" && (
          <>
            <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-9 w-36 text-xs" />
            <span className="text-xs text-muted-foreground">s.d.</span>
            <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-9 w-36 text-xs" />
          </>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} pesanan</span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">No. Pesanan</th>
              <th className="px-4 py-3 text-left">Pelanggan</th>
              <th className="px-4 py-3 text-right">Item</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">Memuat...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">Tidak ada pesanan sesuai filter.</td></tr>
              : filtered.map((o) => {
                const totalQty = o.order_items.reduce((a, i) => a + i.quantity, 0);
                const allowed = nextStatuses(o.status);
                const isFinal = isFinalStatus(o.status);
                return (
                  <tr key={o.id} className="border-t border-border/60">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-semibold">{o.order_number}</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(o.created_at).toLocaleString("id-ID")}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{o.full_name}</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-muted-foreground">{o.whatsapp}</p>
                        <a href={waLink(o.whatsapp, `Halo ${o.full_name}, terkait pesanan ${o.order_number}`)} target="_blank" rel="noreferrer" className="text-green-600 hover:text-green-700" title="Chat WhatsApp">
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{totalQty} pcs</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatRupiah(o.total)}</td>
                    <td className="px-4 py-3">
                      {isFinal ? (
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[o.status]}`}>
                          {STATUS_LABEL[o.status]}
                        </span>
                      ) : (
                        <Select
                          value={o.status}
                          onValueChange={(v) => {
                            if (v === o.status) return;
                            setPendingChange({ id: o.id, to: v as OrderStatus, orderNumber: o.order_number });
                          }}
                        >
                          <SelectTrigger className={`h-8 w-44 text-xs ${STATUS_COLOR[o.status]}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={o.status} disabled>{STATUS_LABEL[o.status]} (saat ini)</SelectItem>
                            {allowed.map((s) => <SelectItem key={s} value={s}>→ {STATUS_LABEL[s]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" className="gap-1" onClick={() => setDetail(o)}>Detail <ChevronRight className="h-3 w-3" /></Button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {detail && <OrderDetailDialog order={detail} onClose={() => setDetail(null)} onRequestStatusChange={(to) => setPendingChange({ id: detail.id, to, orderNumber: detail.order_number })} />}

      <AlertDialog open={!!pendingChange} onOpenChange={(o) => !o && setPendingChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ubah status pesanan?</AlertDialogTitle>
            <AlertDialogDescription>
              Pesanan <b className="font-mono">{pendingChange?.orderNumber}</b> akan diubah ke status{" "}
              <b>{pendingChange ? STATUS_LABEL[pendingChange.to] : ""}</b>.
              {pendingChange?.to === "dibatalkan" && " Stok yang ditahan/dipotong akan dikembalikan otomatis."}
              {pendingChange?.to === "selesai" && " Status ini bersifat final dan tidak bisa diubah."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!pendingChange) return;
              const p = pendingChange;
              setPendingChange(null);
              await applyStatusChange(p.id, p.to);
            }}>Ya, ubah status</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!waPrompt} onOpenChange={(o) => !o && setWaPrompt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kirim notifikasi WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              Status pesanan <b className="font-mono">{waPrompt?.order.order_number}</b> sudah diubah ke{" "}
              <b>{waPrompt ? STATUS_LABEL[waPrompt.status] : ""}</b>. Kirim pesan WhatsApp ke pelanggan?
              {waPrompt && waTemplates && (
                <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-2 text-[11px] text-foreground">
                  {fillTemplate(waTemplates[waPrompt.status as keyof WaTemplates] ?? "", waPrompt.order)}
                </pre>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Nanti saja</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (!waPrompt || !waTemplates) return;
              const msg = fillTemplate(waTemplates[waPrompt.status as keyof WaTemplates] ?? "", waPrompt.order);
              window.open(waLink(waPrompt.order.whatsapp, msg), "_blank", "noopener,noreferrer");
              setWaPrompt(null);
            }}>Buka WhatsApp</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}>
        {icon} {label}
      </div>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

type StatusHistoryRow = { id: string; from_status: string | null; to_status: string; created_at: string; note: string | null };

function OrderDetailDialog({
  order,
  onClose,
  onRequestStatusChange,
}: {
  order: Order;
  onClose: () => void;
  onRequestStatusChange: (to: OrderStatus) => void;
}) {
  const qc = useQueryClient();
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const [courier, setCourier] = useState(order.shipped_courier ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const isFinal = isFinalStatus(order.status);
  const allowed = nextStatuses(order.status);

  // Fetch enriched items with SKU
  const { data: itemsWithSku } = useQuery({
    queryKey: ["order_items_sku", order.id],
    queryFn: async () => {
      const ids = order.order_items.map((i) => i.product_id).filter((x): x is string => !!x);
      if (ids.length === 0) return {};
      const { data, error } = await supabase.from("products").select("id,sku,slug").in("id", ids);
      if (error) return {};
      const map: Record<string, { sku: string | null; slug: string | null }> = {};
      for (const p of data ?? []) map[p.id] = { sku: p.sku, slug: p.slug };
      return map;
    },
  });

  const { data: history } = useQuery({
    queryKey: ["order_history", order.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_status_history")
        .select("id,from_status,to_status,created_at,note")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true });
      if (error) return [];
      return (data ?? []) as StatusHistoryRow[];
    },
  });

  async function saveTrackingAndCourier() {
    const patch = { tracking_number: tracking || null, shipped_courier: courier || null };
    const { error } = await supabase.from("orders").update(patch).eq("id", order.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Resi & kurir tersimpan");
    qc.invalidateQueries({ queryKey: ["admin_orders"] });
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

  function enrichedItems() {
    return order.order_items.map((i) => ({
      ...i,
      sku: i.product_id ? itemsWithSku?.[i.product_id]?.sku ?? null : null,
    }));
  }

  function doPrintInvoice() {
    printInvoice({ ...order, order_items: enrichedItems() });
  }
  function doPrintPackingSlip() {
    printPackingSlip({ ...order, order_items: enrichedItems() });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <DialogTitle className="font-mono">{order.order_number}</DialogTitle>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[order.status]}`}>{STATUS_LABEL[order.status]}</span>
          </div>
        </DialogHeader>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={doPrintInvoice}>
            <Printer className="h-3.5 w-3.5" /> Print Invoice
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={doPrintPackingSlip}>
            <FileText className="h-3.5 w-3.5" /> Print Packing Slip
          </Button>
          <a href={waLink(order.whatsapp, `Halo ${order.full_name}, terkait pesanan ${order.order_number}`)} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline" className="gap-1.5 text-green-700 hover:text-green-800">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </Button>
          </a>
          {!isFinal && allowed.length > 0 && (
            <div className="ml-auto flex gap-2">
              {allowed.map((s) => (
                <Button key={s} size="sm" variant={s === "dibatalkan" ? "destructive" : "default"} onClick={() => onRequestStatusChange(s)}>
                  → {STATUS_LABEL[s]}
                </Button>
              ))}
            </div>
          )}
        </div>

        {isFinal && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Pesanan yang sudah {STATUS_LABEL[order.status]} tidak dapat diedit untuk menjaga akurasi stok, laporan penjualan, dan histori transaksi.
          </div>
        )}

        <div className="grid gap-5 text-sm">
          <section>
            <h3 className="font-semibold">Pelanggan</h3>
            <p>{order.full_name} · {order.whatsapp}</p>
            {order.email && <p className="text-muted-foreground">{order.email}</p>}
            <p className="mt-1 text-muted-foreground">{order.address}, {order.city}, {order.province} {order.postal_code}</p>
            {order.notes && <p className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs">📝 Catatan: {order.notes}</p>}
          </section>

          <section>
            <h3 className="font-semibold">Item ({order.order_items.reduce((a, i) => a + i.quantity, 0)} pcs)</h3>
            <div className="mt-2 space-y-2">
              {enrichedItems().map((i) => (
                <div key={i.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-2.5">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {i.product_image
                      ? <img src={i.product_image} alt={i.product_name} className="h-full w-full object-cover" />
                      : <div className="grid h-full w-full place-items-center text-muted-foreground"><Package className="h-5 w-5" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {i.sku && <span className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase">{i.sku}</span>}
                      <span className="text-sm font-medium truncate">{i.product_name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatRupiah(i.unit_price)} × {i.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold whitespace-nowrap">{formatRupiah(i.subtotal)}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 border-t border-border pt-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatRupiah(order.subtotal)}</span></div>
              {order.voucher_discount > 0 && (
                <div className="flex justify-between text-green-700"><span>Voucher {order.voucher_code}</span><span>-{formatRupiah(order.voucher_discount)}</span></div>
              )}
              {order.membership_discount > 0 && (
                <div className="flex justify-between text-green-700"><span>Diskon Member</span><span>-{formatRupiah(order.membership_discount)}</span></div>
              )}
              <div className="flex justify-between"><span>Ongkir</span><span>{order.shipping_cost > 0 ? formatRupiah(order.shipping_cost) : "—"}</span></div>
              <div className="mt-1 flex justify-between font-bold text-primary"><span>Total</span><span>{formatRupiah(order.total)}</span></div>
            </div>
          </section>

          {/* Pembayaran */}
          <section>
            <h3 className="font-semibold">Pembayaran</h3>
            <div className="mt-1 text-xs text-muted-foreground">
              {order.paid_at ? `Dikonfirmasi ${new Date(order.paid_at).toLocaleString("id-ID")}` : "Belum dikonfirmasi"}
            </div>
            {order.payment_proof_url ? (
              <a href={order.payment_proof_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-primary underline">
                Lihat Bukti Transfer
              </a>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Customer belum upload bukti.</p>
            )}
          </section>

          {/* Pengiriman */}
          <section>
            <h3 className="font-semibold">Pengiriman</h3>
            <div className="mt-2 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <div>
                <Label className="text-xs">Kurir</Label>
                <Input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="JNE, J&T, Sicepat…" disabled={isFinal} />
              </div>
              <div>
                <Label className="text-xs">No. Resi</Label>
                <Input value={tracking} onChange={(e) => setTracking(e.target.value)} disabled={isFinal} />
              </div>
              <Button onClick={saveTrackingAndCourier} className="self-end" disabled={isFinal}>Simpan</Button>
            </div>
            <div className="mt-3">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadReceipt(e.target.files[0])} />
              <Button variant="outline" size="sm" className="gap-1.5" disabled={uploading || isFinal} onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> {uploading ? "Mengupload..." : "Upload Foto Resi"}
              </Button>
              {order.tracking_image_url && <a href={order.tracking_image_url} target="_blank" rel="noreferrer" className="ml-3 text-xs text-primary underline">Lihat foto resi</a>}
            </div>
          </section>

          {/* Timeline */}
          <section>
            <h3 className="font-semibold">Riwayat Status</h3>
            <ol className="mt-2 space-y-2">
              {(history ?? []).map((h) => (
                <li key={h.id} className="flex gap-3 text-sm">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="font-medium">
                      {h.from_status ? `${STATUS_LABEL[h.from_status] ?? h.from_status} → ` : ""}
                      {STATUS_LABEL[h.to_status] ?? h.to_status}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(h.created_at).toLocaleString("id-ID")}{h.note ? ` · ${h.note}` : ""}
                    </p>
                  </div>
                </li>
              ))}
              {(!history || history.length === 0) && <li className="text-xs text-muted-foreground">Belum ada riwayat.</li>}
            </ol>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
