import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Zap, LayoutGrid, Grid3x3, Grid2x2, List as ListIcon, Package, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/_admin/admin/promosi/flash-sale")({
  head: () => ({ meta: [{ title: "Flash Sale — Admin" }, { name: "robots", content: "noindex" }] }),
  component: FlashSaleAdmin,
});

type Campaign = {
  id: string; name: string; starts_at: string; ends_at: string; is_active: boolean;
  flash_sale_items: Array<{ id: string; product_id: string; discount_type: "percent"|"nominal"; discount_value: number; products: { id: string; name: string; price: number } | null }>;
};

function FlashSaleAdmin() {
  const qc = useQueryClient();
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["admin_flash_sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flash_sales")
        .select("*, flash_sale_items(id, product_id, discount_type, discount_value, products(id, name, price))")
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Campaign[];
    },
  });

const [editing, setEditing] = useState<Campaign | null>(null);
  const [open, setOpen] = useState(false);

  async function remove(id: string) {
    if (!confirm("Hapus campaign ini?")) return;
    const { error } = await supabase.from("flash_sales").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Dihapus");
    qc.invalidateQueries({ queryKey: ["admin_flash_sales"] });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Flash Sale</h1>
          <p className="text-sm text-muted-foreground">Promo terbatas waktu dengan countdown untuk pelanggan.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-1.5"><Plus className="h-4 w-4" /> Buat Flash Sale</Button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Memuat...</p>
        : !campaigns?.length ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Zap className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Belum ada campaign Flash Sale.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {campaigns.map((c) => {
              const now = new Date();
              const s = new Date(c.starts_at);
              const e = new Date(c.ends_at);
              const status = !c.is_active ? "Nonaktif" : now < s ? "Terjadwal" : now > e ? "Selesai" : "Berlangsung";
              const statusCls = status === "Berlangsung" ? "bg-rose-500 text-white" : status === "Terjadwal" ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground";
              return (
                <div key={c.id} className="rounded-2xl border border-border/60 bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2"><Badge className={statusCls}>{status}</Badge><h3 className="font-semibold">{c.name}</h3></div>
                      <p className="mt-1 text-xs text-muted-foreground">{s.toLocaleString("id-ID")} → {e.toLocaleString("id-ID")}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{c.flash_sale_items?.length ?? 0} produk</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setEditing(c); setOpen(true); }} className="gap-1.5"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                      <Button size="sm" variant="outline" onClick={() => remove(c.id)} className="gap-1.5 text-destructive"><Trash2 className="h-3.5 w-3.5" /> Hapus</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {open && <CampaignDialog open={open} onOpenChange={setOpen} campaign={editing} />}
    </div>
  );
}

const DURATIONS = [
  { label: "30 menit", ms: 30 * 60_000 },
  { label: "1 jam", ms: 60 * 60_000 },
  { label: "1 hari", ms: 24 * 60 * 60_000 },
  { label: "1 minggu", ms: 7 * 24 * 60 * 60_000 },
  { label: "1 bulan", ms: 30 * 24 * 60 * 60_000 },
];

type ProductPick = { id: string; name: string; price: number; stock: number; image: string | null; sold30: number };
type ViewMode = "large" | "medium" | "small" | "list";

function CampaignDialog({ open, onOpenChange, campaign }: { open: boolean; onOpenChange: (o: boolean) => void; campaign: Campaign | null }) {
  const qc = useQueryClient();
  const [name, setName] = useState(campaign?.name ?? "");
  function toLocalDT(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day}T${h}:${min}`;
  }
  const [startsAt, setStartsAt] = useState(campaign ? toLocalDT(campaign.starts_at) : toLocalDT(new Date().toISOString()));
  const [endsAt, setEndsAt] = useState(campaign ? toLocalDT(campaign.ends_at) : "");
  const [isActive, setIsActive] = useState(campaign?.is_active ?? true);
  const [discountType, setDiscountType] = useState<"percent"|"nominal">("percent");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [selected, setSelected] = useState<Set<string>>(new Set((campaign?.flash_sale_items ?? []).map((i) => i.product_id)));
  const [perProduct, setPerProduct] = useState<Record<string, { type: "percent"|"nominal"; value: number }>>(
    Object.fromEntries((campaign?.flash_sale_items ?? []).map((i) => [i.product_id, { type: i.discount_type, value: Number(i.discount_value) }])),
  );
  const [view, setView] = useState<ViewMode>("medium");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedDurMs, setSelectedDurMs] = useState<number | null>(null);

  function computeEnd(startLocal: string, ms: number): string {
    const start = new Date(startLocal);
    const end = new Date(start.getTime() + ms);
    const y = end.getFullYear();
    const m = String(end.getMonth() + 1).padStart(2, "0");
    const d = String(end.getDate()).padStart(2, "0");
    const h = String(end.getHours()).padStart(2, "0");
    const min = String(end.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${d}T${h}:${min}`;
  }
  function applyDuration(ms: number) {
    setSelectedDurMs(ms);
    const start = startsAt ? new Date(startsAt) : new Date();
    if (!startsAt) setStartsAt(toLocalDT(start.toISOString()));
    setEndsAt(computeEnd(startsAt || toLocalDT(start.toISOString()), ms));
  }

  const { data: products } = useQuery({
    queryKey: ["fs_product_picker"],
    queryFn: async (): Promise<ProductPick[]> => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString();
      const [{ data: prods }, { data: items }] = await Promise.all([
        supabase
          .from("products")
          .select("id, name, price, stock, product_images(url, is_cover)")
          .eq("is_active", true).order("name"),
        supabase
          .from("order_items")
          .select("product_id, quantity, orders!inner(created_at, status)")
          .gte("orders.created_at", since)
          .neq("orders.status", "dibatalkan"),
      ]);
      const sales: Record<string, number> = {};
      for (const it of items ?? []) {
        if (!it.product_id) continue;
        sales[it.product_id] = (sales[it.product_id] ?? 0) + Number(it.quantity ?? 0);
      }
      return (prods ?? []).map((p) => ({
        id: p.id, name: p.name, price: Number(p.price), stock: p.stock,
        image: p.product_images?.find((i: { is_cover: boolean }) => i.is_cover)?.url ?? p.product_images?.[0]?.url ?? null,
        sold30: sales[p.id] ?? 0,
      }));
    },
    enabled: open,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products ?? []).filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [products, search]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
    if (!perProduct[id]) setPerProduct({ ...perProduct, [id]: { type: discountType, value: discountValue } });
  }

  function applyDefaultToAll() {
    const next: typeof perProduct = {};
    selected.forEach((id) => { next[id] = { type: discountType, value: discountValue }; });
    setPerProduct(next);
    toast.success("Diskon default diterapkan ke semua produk terpilih");
  }

  async function save() {
    if (!name.trim()) return toast.error("Nama campaign wajib diisi");
    if (!startsAt || !endsAt) return toast.error("Waktu mulai & selesai wajib diisi");
    if (new Date(endsAt) <= new Date(startsAt)) return toast.error("Waktu selesai harus setelah waktu mulai");
    if (selected.size === 0) return toast.error("Pilih minimal 1 produk");

    // Validasi per-produk
    for (const pid of selected) {
      const cfg = perProduct[pid] ?? { type: discountType, value: discountValue };
      const prod = (products ?? []).find((x) => x.id === pid);
      if (cfg.type === "percent") {
        if (cfg.value < 1 || cfg.value > 100) return toast.error(`Diskon persen harus 1–100% (${prod?.name ?? pid})`);
      } else {
        if (cfg.value <= 0) return toast.error(`Nominal diskon harus > 0 (${prod?.name ?? pid})`);
        if (prod && cfg.value >= prod.price) return toast.error(`Diskon nominal melebihi harga produk "${prod.name}"`);
      }
    }

    setSaving(true);
    const payload = { name, starts_at: new Date(startsAt).toISOString(), ends_at: new Date(endsAt).toISOString(), is_active: isActive };
    let campaignId = campaign?.id;
    if (campaign) {
      const { error } = await supabase.from("flash_sales").update(payload).eq("id", campaign.id);
      if (error) { setSaving(false); return toast.error(error.message); }
      await supabase.from("flash_sale_items").delete().eq("flash_sale_id", campaign.id);
    } else {
      const { data, error } = await supabase.from("flash_sales").insert(payload).select().single();
      if (error || !data) { setSaving(false); return toast.error(error?.message ?? "Gagal"); }
      campaignId = data.id;
    }
    const items = Array.from(selected).map((pid) => ({
      flash_sale_id: campaignId!,
      product_id: pid,
      discount_type: perProduct[pid]?.type ?? discountType,
      discount_value: Number(perProduct[pid]?.value ?? discountValue) || 0,
    }));
    if (items.length) {
      const { error } = await supabase.from("flash_sale_items").insert(items);
      if (error) { setSaving(false); return toast.error(error.message); }
    }
    setSaving(false);
    toast.success(campaign ? "Flash Sale diperbarui" : "Flash Sale dibuat");
    qc.invalidateQueries({ queryKey: ["admin_flash_sales"] });
    qc.invalidateQueries({ queryKey: ["flash_sale_public"] });
    onOpenChange(false);
  }

  function previewFor(p: ProductPick): { unit: number; ok: boolean } {
    const cfg = perProduct[p.id] ?? { type: discountType, value: discountValue };
    let unit = p.price;
    let ok = true;
    if (cfg.type === "percent") {
      if (cfg.value < 1 || cfg.value > 100) ok = false;
      unit = Math.max(0, Math.round(p.price * (1 - cfg.value / 100)));
    } else {
      if (cfg.value <= 0 || cfg.value >= p.price) ok = false;
      unit = Math.max(0, p.price - cfg.value);
    }
    return { unit, ok };
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader><DialogTitle>{campaign ? "Edit Flash Sale" : "Buat Flash Sale"}</DialogTitle></DialogHeader>
        <div className="space-y-5">
          <div><Label>Nama Campaign</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Flash Sale Akhir Pekan" /></div>

          <div className="grid gap-3 md:grid-cols-3">
            <div><Label>Mulai</Label><Input type="datetime-local" value={startsAt} onChange={(e) => { const v = e.target.value; setStartsAt(v); if (selectedDurMs) setEndsAt(computeEnd(v, selectedDurMs)); }} /></div>
            <div><Label>Selesai</Label><Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></div>
            <div className="flex items-end"><label className="flex items-center gap-2 text-sm"><Switch checked={isActive} onCheckedChange={setIsActive} /> Aktif</label></div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Durasi cepat</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <Button key={d.label} type="button" size="sm" variant="outline" onClick={() => applyDuration(d.ms)}>{d.label}</Button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="mb-2 text-sm font-semibold">Diskon Default</p>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Tipe</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percent"|"nominal")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Persen (%)</SelectItem>
                    <SelectItem value="nominal">Nominal (Rp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Nilai</Label><Input type="number" min={0} value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value) || 0)} /></div>
              <div className="flex items-end"><Button type="button" variant="outline" size="sm" onClick={applyDefaultToAll} disabled={selected.size === 0}>Terapkan ke semua terpilih</Button></div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Tiap produk bisa di-override diskonnya di daftar bawah.</p>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">Pilih Produk ({selected.size} dipilih)</p>
              <div className="flex items-center gap-2">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari produk..." className="h-8 w-40" />
                <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
                  {([["large", LayoutGrid], ["medium", Grid3x3], ["small", Grid2x2], ["list", ListIcon]] as const).map(([id, Icon]) => (
                    <button key={id} type="button" onClick={() => setView(id)} className={`grid h-7 w-7 place-items-center rounded-full transition ${view === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {view === "list" ? (
              <div className="max-h-96 divide-y divide-border overflow-y-auto rounded-xl border border-border">
                {filtered.map((p) => (
                  <ProductPickRow key={p.id} p={p} checked={selected.has(p.id)} onToggle={() => toggle(p.id)} dv={perProduct[p.id]} onChangeDv={(v) => setPerProduct({ ...perProduct, [p.id]: v })} />
                ))}
              </div>
            ) : (
              <div className={`grid max-h-[480px] gap-3 overflow-y-auto rounded-xl border border-border p-3 ${view === "large" ? "grid-cols-2" : view === "medium" ? "grid-cols-3 md:grid-cols-4" : "grid-cols-4 md:grid-cols-6"}`}>
                {filtered.map((p) => (
                  <ProductPickCard key={p.id} p={p} checked={selected.has(p.id)} onToggle={() => toggle(p.id)} dv={perProduct[p.id]} onChangeDv={(v) => setPerProduct({ ...perProduct, [p.id]: v })} view={view} />
                ))}
              </div>
            )}
          </div>

          {selected.size > 0 && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Preview Harga Setelah Diskon</p>
              <div className="max-h-40 space-y-1 overflow-y-auto text-xs">
                {Array.from(selected).map((pid) => {
                  const p = (products ?? []).find((x) => x.id === pid);
                  if (!p) return null;
                  const pv = previewFor(p);
                  return (
                    <div key={pid} className="flex items-center justify-between gap-2">
                      <span className="line-clamp-1 flex-1">{p.name}</span>
                      <span className="text-muted-foreground line-through">{formatRupiah(p.price)}</span>
                      <span className={`font-semibold ${pv.ok ? "text-primary" : "text-destructive"}`}>{formatRupiah(pv.unit)}</span>
                      {!pv.ok && <Badge variant="destructive" className="text-[9px]">Invalid</Badge>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProductPickCard({ p, checked, onToggle, dv, onChangeDv, view }: { p: ProductPick; checked: boolean; onToggle: () => void; dv?: { type: "percent"|"nominal"; value: number }; onChangeDv: (v: { type: "percent"|"nominal"; value: number }) => void; view: ViewMode }) {
  return (
    <div className={`relative rounded-xl border bg-card p-2 transition ${checked ? "border-primary ring-2 ring-primary/30" : "border-border"}`}>
      <button type="button" onClick={onToggle} className="absolute left-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-md bg-background/90 shadow">
        <Checkbox checked={checked} onCheckedChange={onToggle} />
      </button>
      <div className="aspect-square overflow-hidden rounded-lg bg-muted">
        {p.image ? <img src={p.image} alt={p.name} className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full place-items-center text-primary"><Package className="h-6 w-6" /></div>}
      </div>
      <p className={`mt-2 line-clamp-2 font-medium ${view === "small" ? "text-[11px]" : "text-xs"}`}>{p.name}</p>
      <p className="text-[11px] text-primary">{formatRupiah(p.price)}</p>
      {checked && (
        <div className="mt-2 flex items-center gap-1">
          <select className="h-7 rounded border border-border bg-background px-1 text-[11px]" value={dv?.type ?? "percent"} onChange={(e) => onChangeDv({ type: e.target.value as "percent"|"nominal", value: dv?.value ?? 0 })}>
            <option value="percent">%</option><option value="nominal">Rp</option>
          </select>
          <Input className="h-7 text-[11px]" type="number" min={0} value={dv?.value ?? 0} onChange={(e) => onChangeDv({ type: dv?.type ?? "percent", value: Number(e.target.value) || 0 })} />
        </div>
      )}
    </div>
  );
}

function ProductPickRow({ p, checked, onToggle, dv, onChangeDv }: { p: ProductPick; checked: boolean; onToggle: () => void; dv?: { type: "percent"|"nominal"; value: number }; onChangeDv: (v: { type: "percent"|"nominal"; value: number }) => void }) {
  return (
    <div className={`flex items-center gap-3 p-2 ${checked ? "bg-primary/5" : ""}`}>
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
        {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-primary"><Package className="h-4 w-4" /></div>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-medium">{p.name}</p>
        <p className="text-xs text-primary">{formatRupiah(p.price)}</p>
      </div>
      {checked && (
        <div className="flex items-center gap-1">
          <select className="h-8 rounded border border-border bg-background px-1 text-xs" value={dv?.type ?? "percent"} onChange={(e) => onChangeDv({ type: e.target.value as "percent"|"nominal", value: dv?.value ?? 0 })}>
            <option value="percent">%</option><option value="nominal">Rp</option>
          </select>
          <Input className="h-8 w-20 text-xs" type="number" min={0} value={dv?.value ?? 0} onChange={(e) => onChangeDv({ type: dv?.type ?? "percent", value: Number(e.target.value) || 0 })} />
        </div>
      )}
    </div>
  );
}
