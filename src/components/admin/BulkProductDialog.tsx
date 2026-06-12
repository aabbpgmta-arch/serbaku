import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Plus, Trash2, Upload, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Category = "serba_35" | "serba_75" | "lainnya";
type Label = "baru" | "terlaris" | "promo" | "none";

type Row = {
  name: string;
  category: Category;
  price: number;
  stock: number;
  description: string;
  isActive: boolean;
  label: Label;
  file: File | null;
  imageUrl: string; // optional URL from CSV
  preview: string;
};

const emptyRow = (): Row => ({
  name: "", category: "serba_35", price: 0, stock: 0, description: "",
  isActive: true, label: "none", file: null, imageUrl: "", preview: "",
});

const TEMPLATE_CSV =
  "nama_produk,kategori,harga,stok,deskripsi,aktif,label,foto_url\n" +
  "km04,Serba 75,50000,120,Kemeja wanita premium,true,Baru,https://example.com/km04.jpg\n" +
  "knit 126,Serba 35,25000,120,Knit premium,true,Terlaris,https://example.com/knit126.jpg\n";

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur = "", row: string[] = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c === "\r") {/* skip */}
      else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim().length));
}

function normCategory(v: string): Category {
  const x = v.trim().toLowerCase().replace(/\s+/g, "_");
  if (x === "serba_35" || x === "serba35") return "serba_35";
  if (x === "serba_75" || x === "serba75") return "serba_75";
  return "lainnya";
}
function normLabel(v: string): Label {
  const x = v.trim().toLowerCase();
  if (x.startsWith("baru") || x === "new") return "baru";
  if (x.startsWith("terlaris") || x === "bestseller") return "terlaris";
  if (x.startsWith("promo")) return "promo";
  return "none";
}
function normBool(v: string): boolean {
  const x = v.trim().toLowerCase();
  return !(x === "false" || x === "0" || x === "tidak" || x === "no");
}

export function BulkProductDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const csvRef = useRef<HTMLInputElement>(null);

  function update(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() { setRows((rs) => [...rs, emptyRow()]); }
  function removeRow(i: number) { setRows((rs) => rs.filter((_, idx) => idx !== i)); }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "template-produk.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function importCSV(file: File) {
    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.length < 2) { toast.error("CSV kosong atau format salah"); return; }
    const header = parsed[0].map((h) => h.trim().toLowerCase());
    const idx = (k: string) => header.indexOf(k);
    const iName = idx("nama_produk");
    if (iName < 0) { toast.error("Header 'nama_produk' tidak ditemukan"); return; }
    const newRows: Row[] = [];
    for (let i = 1; i < parsed.length; i++) {
      const r = parsed[i];
      const url = (r[idx("foto_url")] ?? "").trim();
      newRows.push({
        ...emptyRow(),
        name: (r[iName] ?? "").trim(),
        category: normCategory(r[idx("kategori")] ?? ""),
        price: Number((r[idx("harga")] ?? "0").trim()) || 0,
        stock: Number((r[idx("stok")] ?? "0").trim()) || 0,
        description: (r[idx("deskripsi")] ?? "").trim(),
        isActive: normBool(r[idx("aktif")] ?? "true"),
        label: normLabel(r[idx("label")] ?? ""),
        imageUrl: url,
        preview: url,
      });
    }
    setRows(newRows.length ? newRows : [emptyRow()]);
    toast.success(`${newRows.length} baris dimuat dari CSV`);
  }

  function onFileChange(i: number, f: File | null) {
    if (!f) { update(i, { file: null, preview: rows[i].imageUrl }); return; }
    const reader = new FileReader();
    reader.onload = () => update(i, { file: f, preview: String(reader.result) });
    reader.readAsDataURL(f);
  }

  async function saveAll() {
    const valid = rows.filter((r) => r.name.trim());
    if (!valid.length) { toast.error("Tambah minimal 1 produk dengan nama"); return; }
    setSaving(true);
    let ok = 0, fail = 0;
    for (const r of valid) {
      const slug = `${slugify(r.name)}-${Date.now().toString(36).slice(-4)}-${Math.random().toString(36).slice(-3)}`;
      const { data: prod, error } = await supabase.from("products").insert({
        name: r.name.trim(), slug, price: r.price, stock: r.stock,
        category: r.category, description: r.description || null,
        is_active: r.isActive, is_bestseller: r.label === "terlaris", is_new: r.label === "baru",
      }).select("id").single();
      if (error || !prod) { fail++; console.error("Gagal simpan produk", r.name, error); continue; }

      let finalUrl = r.imageUrl.trim() || null;
      if (r.file) {
        const ext = r.file.name.split(".").pop();
        const path = `${prod.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("product-images").upload(path, r.file);
        if (!upErr) {
          const { data: signed } = await supabase.storage.from("product-images")
            .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
          finalUrl = signed?.signedUrl ?? null;
        }
      }
      if (finalUrl) {
        await supabase.from("product_images").insert({
          product_id: prod.id, url: finalUrl, is_cover: true, sort_order: 0,
        });
      }
      ok++;
    }
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["admin_products"] });
    if (fail) toast.error(`${ok} berhasil, ${fail} gagal`);
    else toast.success(`${ok} produk berhasil disimpan`);
    if (!fail) { setRows([emptyRow()]); onOpenChange(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
        <DialogHeader><DialogTitle>Tambah Produk Massal</DialogTitle></DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={downloadTemplate}>
            <Download className="h-3.5 w-3.5" /> Download Template CSV
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => csvRef.current?.click()}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> Import CSV
          </Button>
          <input ref={csvRef} type="file" hidden accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && importCSV(e.target.files[0])} />
          <span className="ml-auto text-xs text-muted-foreground">{rows.length} baris</span>
        </div>

        <div className="mt-4 space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card p-3">
              <div className="flex items-start gap-3">
                <div className="flex w-24 shrink-0 flex-col items-center gap-2">
                  <div className="aspect-square w-24 overflow-hidden rounded-lg bg-muted">
                    {r.preview ? <img src={r.preview} alt="" className="h-full w-full object-cover" /> :
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">No image</div>}
                  </div>
                  <label className="cursor-pointer text-[11px] text-primary underline">
                    <input type="file" hidden accept="image/*" onChange={(e) => onFileChange(i, e.target.files?.[0] ?? null)} />
                    Pilih foto
                  </label>
                </div>

                <div className="grid flex-1 gap-2 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <Label className="text-[11px]">Nama Produk *</Label>
                    <Input value={r.name} onChange={(e) => update(i, { name: e.target.value })} className="h-9" />
                  </div>
                  <div className="md:col-span-3">
                    <Label className="text-[11px]">Kategori</Label>
                    <Select value={r.category} onValueChange={(v) => update(i, { category: v as Category })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="serba_35">Serba 35</SelectItem>
                        <SelectItem value="serba_75">Serba 75</SelectItem>
                        <SelectItem value="lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-[11px]">Harga</Label>
                    <Input type="number" value={r.price} onChange={(e) => update(i, { price: Number(e.target.value) })} className="h-9" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-[11px]">Stok</Label>
                    <Input type="number" value={r.stock} onChange={(e) => update(i, { stock: Number(e.target.value) })} className="h-9" />
                  </div>
                  <div className="md:col-span-1 flex items-end justify-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)} title="Hapus baris">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="md:col-span-6">
                    <Label className="text-[11px]">Deskripsi</Label>
                    <Textarea rows={2} value={r.description} onChange={(e) => update(i, { description: e.target.value })} />
                  </div>
                  <div className="md:col-span-3">
                    <Label className="text-[11px]">Label</Label>
                    <Select value={r.label} onValueChange={(v) => update(i, { label: v as Label })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Tanpa label —</SelectItem>
                        <SelectItem value="baru">Produk Baru</SelectItem>
                        <SelectItem value="terlaris">Terlaris</SelectItem>
                        <SelectItem value="promo">Promo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3 flex items-end gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Switch checked={r.isActive} onCheckedChange={(v) => update(i, { isActive: v })} /> Aktif
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap justify-between gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addRow}>
            <Plus className="h-3.5 w-3.5" /> Tambah Baris Produk
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Batal</Button>
            <Button type="button" onClick={saveAll} disabled={saving} className="gap-1.5">
              <Upload className="h-4 w-4" /> {saving ? "Menyimpan..." : "Simpan Semua Produk"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
