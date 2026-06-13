import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/_admin/admin/voucher")({
  head: () => ({ meta: [{ title: "Admin Voucher — Toko Serba" }, { name: "robots", content: "noindex" }] }),
  component: AdminVoucher,
});

type VoucherRow = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "nominal";
  discount_value: number;
  min_subtotal: number;
  max_discount: number | null;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
};

function AdminVoucher() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin_vouchers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vouchers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VoucherRow[];
    },
  });
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<VoucherRow | null>(null);

  async function del(v: VoucherRow) {
    if (!confirm(`Hapus voucher "${v.code}"?`)) return;
    const { error } = await supabase.from("vouchers").delete().eq("id", v.id);
    if (error) toast.error(error.message);
    else { toast.success("Voucher dihapus"); qc.invalidateQueries({ queryKey: ["admin_vouchers"] }); }
  }
  async function toggle(v: VoucherRow) {
    const { error } = await supabase.from("vouchers").update({ is_active: !v.is_active }).eq("id", v.id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["admin_vouchers"] });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Voucher / Kode Promo</h1>
        <Button onClick={() => { setEditing(null); setOpenForm(true); }} className="gap-1.5"><Plus className="h-4 w-4" /> Tambah Voucher</Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border/60 bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Kode</th>
              <th className="px-4 py-3 text-left">Diskon</th>
              <th className="px-4 py-3 text-right">Min Belanja</th>
              <th className="px-4 py-3 text-left">Berlaku</th>
              <th className="px-4 py-3 text-right">Dipakai</th>
              <th className="px-4 py-3 text-center">Aktif</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">Memuat...</td></tr>
              : (data ?? []).length === 0 ? <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">Belum ada voucher.</td></tr>
              : data!.map((v) => (
                <tr key={v.id} className="border-t border-border/60">
                  <td className="px-4 py-3">
                    <div className="font-mono font-bold text-primary">{v.code}</div>
                    {v.description && <div className="text-xs text-muted-foreground">{v.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {v.discount_type === "percent" ? `${v.discount_value}%` : formatRupiah(v.discount_value)}
                    {v.max_discount && <div className="text-[10px] text-muted-foreground">Max {formatRupiah(v.max_discount)}</div>}
                  </td>
                  <td className="px-4 py-3 text-right">{v.min_subtotal > 0 ? formatRupiah(v.min_subtotal) : "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {v.starts_at ? new Date(v.starts_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : "—"}
                    <br />s/d {v.expires_at ? new Date(v.expires_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">{v.used_count}{v.usage_limit ? ` / ${v.usage_limit}` : ""}</td>
                  <td className="px-4 py-3 text-center"><Switch checked={v.is_active} onCheckedChange={() => toggle(v)} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(v); setOpenForm(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => del(v)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <VoucherFormDialog key={editing?.id ?? "new"} open={openForm} onOpenChange={setOpenForm} voucher={editing} />
    </div>
  );
}

function VoucherFormDialog({ open, onOpenChange, voucher }: { open: boolean; onOpenChange: (o: boolean) => void; voucher: VoucherRow | null }) {
  const qc = useQueryClient();
  const toLocal = (iso: string | null) => iso ? new Date(iso).toISOString().slice(0,16) : "";
  const [code, setCode] = useState(voucher?.code ?? "");
  const [description, setDescription] = useState(voucher?.description ?? "");
  const [discountType, setDiscountType] = useState<"percent"|"nominal">(voucher?.discount_type ?? "percent");
  const [discountValue, setDiscountValue] = useState<number>(voucher?.discount_value ?? 10);
  const [minSubtotal, setMinSubtotal] = useState<number>(voucher?.min_subtotal ?? 0);
  const [maxDiscount, setMaxDiscount] = useState<number | "">(voucher?.max_discount ?? "");
  const [startsAt, setStartsAt] = useState<string>(toLocal(voucher?.starts_at ?? null));
  const [expiresAt, setExpiresAt] = useState<string>(toLocal(voucher?.expires_at ?? null));
  const [usageLimit, setUsageLimit] = useState<number | "">(voucher?.usage_limit ?? "");
  const [isActive, setIsActive] = useState(voucher?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!code.trim()) { toast.error("Kode wajib diisi"); return; }
    if (!discountValue || discountValue <= 0) { toast.error("Nilai diskon harus > 0"); return; }
    setSaving(true);
    const payload = {
      code: code.trim().toUpperCase(),
      description: description || null,
      discount_type: discountType,
      discount_value: discountValue,
      min_subtotal: minSubtotal || 0,
      max_discount: maxDiscount === "" ? null : Number(maxDiscount),
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      usage_limit: usageLimit === "" ? null : Number(usageLimit),
      is_active: isActive,
    };
    if (voucher) {
      const { error } = await supabase.from("vouchers").update(payload).eq("id", voucher.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Voucher diperbarui");
    } else {
      const { error } = await supabase.from("vouchers").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Voucher dibuat");
    }
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["admin_vouchers"] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Tag className="h-4 w-4" /> {voucher ? "Edit Voucher" : "Tambah Voucher"}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label>Kode Voucher</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="HEMAT10" className="font-mono uppercase" />
          </div>
          <div>
            <Label>Deskripsi (opsional)</Label>
            <Textarea rows={2} value={description ?? ""} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Tipe Diskon</Label>
              <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percent"|"nominal")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Persen (%)</SelectItem>
                  <SelectItem value="nominal">Nominal (Rp)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nilai Diskon</Label>
              <Input type="number" min={0} value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Minimum Belanja (Rp)</Label>
              <Input type="number" min={0} value={minSubtotal} onChange={(e) => setMinSubtotal(Number(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Batas Potongan (Rp, opsional)</Label>
              <Input type="number" min={0} value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value === "" ? "" : Number(e.target.value))} placeholder="—" />
            </div>
            <div>
              <Label>Mulai Berlaku</Label>
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div>
              <Label>Kedaluwarsa</Label>
              <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
            <div>
              <Label>Batas Pemakaian (opsional)</Label>
              <Input type="number" min={0} value={usageLimit} onChange={(e) => setUsageLimit(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Tanpa batas" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /> Aktif</label>
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
