import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, Star, X, ImageIcon, ChevronDown, CheckSquare, Square } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/_admin/admin/produk")({
  head: () => ({ meta: [{ title: "Admin Produk — Toko Serba" }, { name: "robots", content: "noindex" }] }),
  component: AdminProduk,
});

type ProductRow = {
  id: string; name: string; slug: string; price: number; stock: number;
  category: "serba_35" | "serba_75" | "lainnya";
  description: string | null; is_active: boolean; is_bestseller: boolean; is_new: boolean;
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
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function toggleActive(p: ProductRow) {
    const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) toast.error(error.message); else { toast.success("Status diperbarui"); refresh(); }
  }

  async function deleteProduct(p: ProductRow) {
    if (!confirm(`Hapus produk "${p.name}"?`)) return;
    await deleteProductsWithImages([p.id]);
  }

  async function deleteProductsWithImages(ids: string[]) {
    const { data: imgs } = await supabase.from("product_images").select("url").in("product_id", ids);
    const paths: string[] = [];
    for (const r of imgs ?? []) {
      const m = r.url?.match(/\/product-images\/([^?]+)/);
      if (m?.[1]) paths.push(decodeURIComponent(m[1]));
    }
    if (paths.length) {
      const { error: sErr } = await supabase.storage.from("product-images").remove(paths);
      if (sErr) console.warn("[admin produk] gagal hapus beberapa foto", sErr);
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
    const ok = await deleteProductsWithImages(ids);
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
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Produk</h1>
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

      <div className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-card">
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
                    <td className="px-3 py-3">
                      <Checkbox checked={checked} onCheckedChange={(v) => toggleOne(p.id, Boolean(v))} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-lg bg-muted">
                          {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="m-2 h-6 w-6 text-muted-foreground" />}
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


      <ProductFormDialog open={openForm} onOpenChange={setOpenForm} product={editing} />
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
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [images, setImages] = useState(product?.product_images ?? []);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Reset when product changes
  useState(() => {
    if (!product) {
      setName(""); setPrice(0); setStock(0); setCategory("serba_35"); setDescription("");
      setIsBestseller(false); setIsNew(false); setIsActive(true); setImages([]);
    }
  });

  async function save() {
    if (!name.trim()) { toast.error("Nama wajib diisi"); return; }
    setSaving(true);
    let slug = slugify(name);
    const payload = { name, price, stock, category, description, is_bestseller: isBestseller, is_new: isNew, is_active: isActive };

    if (product) {
      const { error } = await supabase.from("products").update(payload).eq("id", product.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Produk diperbarui");
    } else {
      // unique slug
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
      const { data: newP, error } = await supabase.from("products").insert({ ...payload, slug }).select().single();
      if (error || !newP) { toast.error(error?.message ?? "Gagal"); setSaving(false); return; }
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

  async function setCover(imgId: string) {
    if (!product) return;
    await supabase.from("product_images").update({ is_cover: false }).eq("product_id", product.id);
    await supabase.from("product_images").update({ is_cover: true }).eq("id", imgId);
    setImages((prev) => prev.map((i) => ({ ...i, is_cover: i.id === imgId })));
    qc.invalidateQueries({ queryKey: ["admin_products"] }); qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function removeImg(imgId: string) {
    await supabase.from("product_images").delete().eq("id", imgId);
    setImages((prev) => prev.filter((i) => i.id !== imgId));
    qc.invalidateQueries({ queryKey: ["admin_products"] }); qc.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{product ? "Edit Produk" : "Tambah Produk"}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
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

          {product && (
            <div>
              <div className="flex items-center justify-between">
                <Label>Foto Produk (max 8)</Label>
                <Button type="button" variant="outline" size="sm" disabled={uploading || images.length >= 8} onClick={() => fileRef.current?.click()} className="gap-1.5">
                  <Upload className="h-3.5 w-3.5" /> {uploading ? "Mengupload..." : "Upload"}
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
                {images.length === 0 && <div className="col-span-4 rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">Belum ada foto.</div>}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
