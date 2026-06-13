import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, Star, X, ImageIcon, ChevronDown, CheckSquare, Square, LayoutGrid, List, Video, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah, slugify } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BulkProductDialog } from "@/components/admin/BulkProductDialog";
import { PriceHistoryDialog } from "@/components/admin/PriceHistoryDialog";
import { logAction } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/_admin/admin/produk")({
  head: () => ({ meta: [{ title: "Admin Produk — Toko Serba" }, { name: "robots", content: "noindex" }] }),
  component: AdminProduk,
});

type ProductRow = {
  id: string; name: string; slug: string; price: number; stock: number;
  category: "serba_35" | "serba_75" | "lainnya";
  description: string | null; is_active: boolean; is_bestseller: boolean; is_new: boolean;
  manual_badge: string | null;
  video_url: string | null;
  discount_type: "none" | "percent" | "nominal" | null;
  discount_value: number | null;
  product_images: Array<{ id: string; url: string; sort_order: number; is_cover: boolean }>;
};

function AdminProduk() {
  const qc = useQueryClient();
  const { data: products, isLoading } = useQuery({
    queryKey: ["admin_products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*, product_images(*)").order("created_at", { ascending: false });
      if (error) { console.error("[admin produk] gagal memuat", error); throw error; }
      return (data ?? []) as ProductRow[];
    },
  });

  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [openBulk, setOpenBulk] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [view, setView] = useState<"list" | "grid">(() => {
    if (typeof window === "undefined") return "list";
    return (localStorage.getItem("admin_products_view") as "list" | "grid") || "list";
  });

  function changeView(v: "list" | "grid") {
    setView(v);
    if (typeof window !== "undefined") localStorage.setItem("admin_products_view", v);
  }

  const allIds = useMemo(() => (products ?? []).map((p) => p.id), [products]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;

  function toggleOne(id: string, on: boolean) {
    setSelected((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
  }
  function toggleAll(on: boolean) {
    setSelected(on ? new Set(allIds) : new Set());
  }
  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin_products"] }); qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function toggleActive(p: ProductRow) {
    const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) toast.error(error.message); else { toast.success("Status diperbarui"); refresh(); }
  }

  async function deleteProduct(p: ProductRow) {
    if (!confirm(`Hapus produk "${p.name}"?`)) return;
    await deleteProductsWithMedia([p.id]);
    refresh();
  }

  async function deleteProductsWithMedia(ids: string[]) {
    // Images
    const { data: imgs } = await supabase.from("product_images").select("url").in("product_id", ids);
    const imgPaths: string[] = [];
    for (const r of imgs ?? []) {
      const m = r.url?.match(/\/product-images\/([^?]+)/);
      if (m?.[1]) imgPaths.push(decodeURIComponent(m[1]));
    }
    if (imgPaths.length) {
      const { error: sErr } = await supabase.storage.from("product-images").remove(imgPaths);
      if (sErr) console.warn("[admin produk] gagal hapus beberapa foto", sErr);
    }
    // Videos
    const { data: vids } = await supabase.from("products").select("video_url").in("id", ids);
    const vidPaths: string[] = [];
    for (const r of vids ?? []) {
      const m = r.video_url?.match(/\/product-videos\/([^?]+)/);
      if (m?.[1]) vidPaths.push(decodeURIComponent(m[1]));
    }
    if (vidPaths.length) {
      const { error: vErr } = await supabase.storage.from("product-videos").remove(vidPaths);
      if (vErr) console.warn("[admin produk] gagal hapus beberapa video", vErr);
    }
    const { error } = await supabase.from("products").delete().in("id", ids);
    if (error) { toast.error(error.message); return false; }
    return true;
  }

  async function bulkDelete() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!confirm(`Yakin ingin menghapus ${ids.length} produk?`)) return;
    setBulkBusy(true);
    const ok = await deleteProductsWithMedia(ids);
    setBulkBusy(false);
    if (ok) { toast.success(`${ids.length} produk berhasil dihapus`); setSelected(new Set()); refresh(); }
  }

  async function bulkSetActive(active: boolean) {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBulkBusy(true);
    const { error } = await supabase.from("products").update({ is_active: active }).in("id", ids);
    setBulkBusy(false);
    if (error) toast.error(error.message);
    else { toast.success(`${ids.length} produk ${active ? "diaktifkan" : "dinonaktifkan"}`); setSelected(new Set()); refresh(); }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Produk</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border/60 bg-card p-0.5">
            <button type="button" onClick={() => changeView("list")} title="Tampilan list" className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
              <List className="h-3.5 w-3.5" /> List
            </button>
            <button type="button" onClick={() => changeView("grid")} title="Tampilan grid" className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
              <LayoutGrid className="h-3.5 w-3.5" /> Grid
            </button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-1.5"><Plus className="h-4 w-4" /> Tambah Produk <ChevronDown className="h-3.5 w-3.5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => { setEditing(null); setOpenForm(true); }}>Tambah Produk Satuan</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setOpenBulk(true)}>Tambah Produk Massal</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
          <span className="text-sm font-semibold">{selected.size} Produk Dipilih</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulkSetActive(true)}>Aktifkan Terpilih</Button>
            <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulkSetActive(false)}>Nonaktifkan Terpilih</Button>
            <Button size="sm" variant="destructive" disabled={bulkBusy} onClick={bulkDelete} className="gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> {bulkBusy ? "Memproses..." : "Hapus Terpilih"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Batal</Button>
          </div>
        </div>
      )}

      {view === "list" ? (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border/60 bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-3">
                  <button type="button" onClick={() => toggleAll(!allSelected)} title={allSelected ? "Batalkan pilih semua" : "Pilih semua"} className="grid place-content-center">
                    {allSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : someSelected ? <CheckSquare className="h-4 w-4 text-primary/60" /> : <Square className="h-4 w-4" />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">Produk</th>
                <th className="px-4 py-3 text-left">Kategori</th>
                <th className="px-4 py-3 text-right">Harga</th>
                <th className="px-4 py-3 text-right">Stok</th>
                <th className="px-4 py-3 text-center">Aktif</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">Memuat...</td></tr>
                : (products ?? []).length === 0 ? <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">Belum ada produk.</td></tr>
                : products!.map((p) => {
                  const cover = p.product_images?.find((i) => i.is_cover)?.url ?? p.product_images?.[0]?.url ?? null;
                  const checked = selected.has(p.id);
                  return (
                    <tr key={p.id} className={`border-t border-border/60 ${checked ? "bg-primary/5" : ""}`}>
                      <td className="px-3 py-3"><Checkbox checked={checked} onCheckedChange={(v) => toggleOne(p.id, Boolean(v))} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-muted">
                            {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="m-2 h-6 w-6 text-muted-foreground" />}
                            {p.video_url && <span className="absolute bottom-0 right-0 grid h-4 w-4 place-content-center rounded-tl bg-black/70"><Video className="h-2.5 w-2.5 text-white" /></span>}
                          </div>
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <div className="mt-0.5 flex gap-1.5 text-[10px]">
                              {p.is_bestseller && <span className="rounded bg-primary px-1.5 py-0.5 font-bold text-primary-foreground">Terlaris</span>}
                              {p.is_new && <span className="rounded border px-1.5 py-0.5">Baru</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">{p.category === "serba_35" ? "Serba 35" : p.category === "serba_75" ? "Serba 75" : "Lainnya"}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatRupiah(p.price)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={p.stock <= 0 ? "text-destructive font-semibold" : ""}>{p.stock}</span>
                          {p.stock <= 0 && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">Stok Habis</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center"><Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpenForm(true); }}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteProduct(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-6">
          {isLoading ? <p className="py-10 text-center text-muted-foreground">Memuat...</p>
            : (products ?? []).length === 0 ? <p className="py-10 text-center text-muted-foreground">Belum ada produk.</p>
            : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {products!.map((p) => {
                  const cover = p.product_images?.find((i) => i.is_cover)?.url ?? p.product_images?.[0]?.url ?? null;
                  const checked = selected.has(p.id);
                  return (
                    <div key={p.id} className={`relative overflow-hidden rounded-2xl border bg-card transition ${checked ? "border-primary ring-2 ring-primary/30" : "border-border/60"}`}>
                      <div className="absolute left-2 top-2 z-10">
                        <Checkbox checked={checked} onCheckedChange={(v) => toggleOne(p.id, Boolean(v))} className="bg-white shadow" />
                      </div>
                      <div className="absolute right-2 top-2 z-10 flex gap-1">
                        {p.video_url && <span className="grid h-6 w-6 place-content-center rounded-full bg-black/70 text-white"><Video className="h-3 w-3" /></span>}
                      </div>
                      <div className="aspect-square w-full bg-muted">
                        {cover ? <img src={cover} alt={p.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-content-center"><ImageIcon className="h-8 w-8 text-muted-foreground" /></div>}
                      </div>
                      <div className="space-y-1.5 p-3">
                        <p className="line-clamp-2 text-sm font-medium leading-tight">{p.name}</p>
                        <p className="text-sm font-bold text-primary">{formatRupiah(p.price)}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className={p.stock <= 0 ? "font-semibold text-destructive" : ""}>Stok {p.stock}</span>
                          <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                        </div>
                        <div className="flex gap-1 pt-1">
                          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => { setEditing(p); setOpenForm(true); }}><Pencil className="h-3 w-3" /> Edit</Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteProduct(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      )}

      <ProductFormDialog key={editing?.id ?? "new"} open={openForm} onOpenChange={setOpenForm} product={editing} />
      <BulkProductDialog open={openBulk} onOpenChange={setOpenBulk} />
    </div>
  );
}

function ProductFormDialog({ open, onOpenChange, product }: { open: boolean; onOpenChange: (o: boolean) => void; product: ProductRow | null }) {
  const qc = useQueryClient();
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product?.price ?? 0);
  const [stock, setStock] = useState(product?.stock ?? 0);
  const [category, setCategory] = useState<"serba_35" | "serba_75" | "lainnya">(product?.category ?? "serba_35");
  const [description, setDescription] = useState(product?.description ?? "");
  const [isBestseller, setIsBestseller] = useState(product?.is_bestseller ?? false);
  const [isNew, setIsNew] = useState(product?.is_new ?? false);
  const [manualBadge, setManualBadge] = useState<string>(product?.manual_badge ?? "");
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [images, setImages] = useState(product?.product_images ?? []);
  const [videoUrl, setVideoUrl] = useState<string | null>(product?.video_url ?? null);
  const [discountType, setDiscountType] = useState<"none" | "percent" | "nominal">((product?.discount_type as "none"|"percent"|"nominal") ?? "none");
  const [discountValue, setDiscountValue] = useState<number>(Number(product?.discount_value ?? 0));
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);

  async function save() {
    if (!name.trim()) { toast.error("Nama wajib diisi"); return; }
    setSaving(true);
    let slug = slugify(name);
    const payload = {
      name, price, stock, category, description,
      is_bestseller: isBestseller, is_new: isNew, is_active: isActive, video_url: videoUrl,
      manual_badge: manualBadge.trim() || null,
      discount_type: discountType,
      discount_value: discountType === "none" ? 0 : Number(discountValue) || 0,
    };

    if (product) {
      const { error } = await supabase.from("products").update(payload).eq("id", product.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Produk diperbarui");
    } else {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
      const { error } = await supabase.from("products").insert({ ...payload, slug }).select().single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Produk dibuat");
    }
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["admin_products"] }); qc.invalidateQueries({ queryKey: ["products"] });
    onOpenChange(false);
  }

  async function uploadFiles(files: FileList) {
    if (!product) { toast.error("Simpan produk terlebih dahulu sebelum upload foto"); return; }
    if (images.length + files.length > 8) { toast.error("Maksimum 8 foto"); return; }
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = f.name.split(".").pop();
      const path = `${product.id}/${Date.now()}-${i}.${ext}`;
      const { error: upErr } = await supabase.storage.from("product-images").upload(path, f);
      if (upErr) { toast.error(upErr.message); continue; }
      const { data: signed } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      const isCover = images.length === 0 && i === 0;
      const { data: img } = await supabase.from("product_images").insert({
        product_id: product.id, url: signed?.signedUrl ?? path, is_cover: isCover, sort_order: images.length + i,
      }).select().single();
      if (img) setImages((prev) => [...prev, img]);
    }
    setUploading(false);
    qc.invalidateQueries({ queryKey: ["admin_products"] }); qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function uploadVideo(file: File) {
    if (!product) { toast.error("Simpan produk terlebih dahulu sebelum upload video"); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("Ukuran video maksimum 50MB"); return; }
    setVideoUploading(true);
    // remove old video first
    if (videoUrl) {
      const m = videoUrl.match(/\/product-videos\/([^?]+)/);
      if (m?.[1]) await supabase.storage.from("product-videos").remove([decodeURIComponent(m[1])]);
    }
    const ext = file.name.split(".").pop();
    const path = `${product.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("product-videos").upload(path, file);
    if (upErr) { toast.error(upErr.message); setVideoUploading(false); return; }
    const { data: signed } = await supabase.storage.from("product-videos").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    const url = signed?.signedUrl ?? null;
    const { error: dbErr } = await supabase.from("products").update({ video_url: url }).eq("id", product.id);
    if (dbErr) { toast.error(dbErr.message); setVideoUploading(false); return; }
    setVideoUrl(url);
    setVideoUploading(false);
    toast.success("Video diupload");
    qc.invalidateQueries({ queryKey: ["admin_products"] }); qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function removeVideo() {
    if (!product || !videoUrl) return;
    const m = videoUrl.match(/\/product-videos\/([^?]+)/);
    if (m?.[1]) await supabase.storage.from("product-videos").remove([decodeURIComponent(m[1])]);
    await supabase.from("products").update({ video_url: null }).eq("id", product.id);
    setVideoUrl(null);
    toast.success("Video dihapus");
    qc.invalidateQueries({ queryKey: ["admin_products"] }); qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function setCover(imgId: string) {
    if (!product) return;
    await supabase.from("product_images").update({ is_cover: false }).eq("product_id", product.id);
    await supabase.from("product_images").update({ is_cover: true }).eq("id", imgId);
    setImages((prev) => prev.map((i) => ({ ...i, is_cover: i.id === imgId })));
    qc.invalidateQueries({ queryKey: ["admin_products"] }); qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function removeImg(imgId: string) {
    const img = images.find((i) => i.id === imgId);
    if (img) {
      const m = img.url.match(/\/product-images\/([^?]+)/);
      if (m?.[1]) await supabase.storage.from("product-images").remove([decodeURIComponent(m[1])]);
    }
    await supabase.from("product_images").delete().eq("id", imgId);
    setImages((prev) => prev.filter((i) => i.id !== imgId));
    qc.invalidateQueries({ queryKey: ["admin_products"] }); qc.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{product ? "Edit Produk" : "Tambah Produk"}</DialogTitle></DialogHeader>
        <div className="grid gap-5">
          {/* MEDIA — foto & video di atas */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            {!product && (
              <p className="mb-3 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
                Simpan produk terlebih dahulu, lalu upload foto & video di sini.
              </p>
            )}
            <div className="flex items-center justify-between">
              <Label>Foto Produk (max 8)</Label>
              <Button type="button" variant="outline" size="sm" disabled={!product || uploading || images.length >= 8} onClick={() => fileRef.current?.click()} className="gap-1.5">
                <Upload className="h-3.5 w-3.5" /> {uploading ? "Mengupload..." : "Upload Foto"}
              </Button>
              <input ref={fileRef} type="file" hidden accept="image/*" multiple onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {images.map((img) => (
                <div key={img.id} className={`group relative aspect-square overflow-hidden rounded-lg border-2 ${img.is_cover ? "border-primary" : "border-transparent"}`}>
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 hidden items-center justify-center gap-1 bg-black/50 group-hover:flex">
                    <button onClick={() => setCover(img.id)} title="Jadikan cover" className="rounded-full bg-white/90 p-1.5"><Star className={`h-3.5 w-3.5 ${img.is_cover ? "fill-primary text-primary" : ""}`} /></button>
                    <button onClick={() => removeImg(img.id)} title="Hapus" className="rounded-full bg-white/90 p-1.5"><X className="h-3.5 w-3.5 text-destructive" /></button>
                  </div>
                </div>
              ))}
              {images.length === 0 && <div className="col-span-4 rounded-lg border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">Belum ada foto.</div>}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <Label>Video Produk (opsional, max 50MB)</Label>
              <div className="flex gap-2">
                {videoUrl && <Button type="button" variant="ghost" size="sm" onClick={removeVideo} className="gap-1.5 text-destructive"><X className="h-3.5 w-3.5" /> Hapus</Button>}
                <Button type="button" variant="outline" size="sm" disabled={!product || videoUploading} onClick={() => videoRef.current?.click()} className="gap-1.5">
                  <Video className="h-3.5 w-3.5" /> {videoUploading ? "Mengupload..." : videoUrl ? "Ganti Video" : "Upload Video"}
                </Button>
                <input ref={videoRef} type="file" hidden accept="video/*" onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])} />
              </div>
            </div>
            <div className="mt-3">
              {videoUrl ? (
                <video src={videoUrl} controls className="aspect-video w-full rounded-lg bg-black" />
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">Belum ada video.</div>
              )}
            </div>
          </div>

          {/* DATA UTAMA */}
          <div>
            <Label>Nama Produk</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div><Label>Harga (Rp)</Label><Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></div>
            <div><Label>Stok</Label><Input type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} /></div>
            <div>
              <Label>Kategori</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="serba_35">Serba 35</SelectItem>
                  <SelectItem value="serba_75">Serba 75</SelectItem>
                  <SelectItem value="lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Deskripsi</Label><Textarea rows={4} value={description ?? ""} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2"><Switch checked={isBestseller} onCheckedChange={setIsBestseller} /> Terlaris</label>
            <label className="flex items-center gap-2"><Switch checked={isNew} onCheckedChange={setIsNew} /> Produk Baru</label>
            <label className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /> Aktif</label>
          </div>
          <div>
            <Label>Badge Manual (opsional)</Label>
            <Input
              value={manualBadge}
              onChange={(e) => setManualBadge(e.target.value)}
              placeholder="cth: Trending, Best Value, Limited"
              maxLength={20}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Jika diisi, badge ini menggantikan badge otomatis (Terlaris/Baru) di kartu produk.
            </p>
          </div>



          {/* PROMO PER PRODUK (tanpa batas waktu) */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="mb-1 text-sm font-semibold">Diskon Produk</p>
            <p className="mb-3 text-[11px] text-muted-foreground">Untuk promo terbatas waktu (countdown), gunakan menu <b>Promosi → Flash Sale</b>.</p>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Tipe Diskon</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as "none"|"percent"|"nominal")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak ada</SelectItem>
                    <SelectItem value="percent">Persen (%)</SelectItem>
                    <SelectItem value="nominal">Nominal (Rp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Nilai Diskon</Label>
                <Input type="number" min={0} value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value) || 0)} disabled={discountType === "none"} />
                <p className="mt-1 text-[11px] text-muted-foreground">Tampil sebagai harga coret di kartu produk & halaman detail.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
