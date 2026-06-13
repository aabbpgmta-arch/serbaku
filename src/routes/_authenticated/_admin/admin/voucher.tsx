import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { logAction } from "@/lib/audit";
import { IdDateTimeInput, DEFAULT_QUICK_DURATIONS } from "@/components/admin/IdDateTimeInput";
import {
  formatIdDateTime,
  parseIdDateTime,
  idToIso,
  nowId,
  formatIdLongDate,
  deriveVoucherStatus,
} from "@/lib/datetime-id";

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

function statusBadge(status: ReturnType<typeof deriveVoucherStatus>) {
  switch (status) {
    case "active": return <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300">Aktif</Badge>;
    case "scheduled": return <Badge variant="outline">Terjadwal</Badge>;
    case "expired": return <Badge variant="outline" className="text-muted-foreground">Berakhir</Badge>;
    case "inactive": return <Badge variant="outline" className="text-muted-foreground">Nonaktif</Badge>;
  }
}

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
    else {
      toast.success("Voucher dihapus");
      void logAction("delete_voucher", "voucher", v.id, { code: v.code });
      qc.invalidateQueries({ queryKey: ["admin_vouchers"] });
    }
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
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Dipakai</th>
              <th className="px-4 py-3 text-center">Aktifkan</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">Memuat...</td></tr>
              : (data ?? []).length === 0 ? <tr><td colSpan={8} className="py-10 text-center text-muted-foreground">Belum ada voucher.</td></tr>
              : data!.map((v) => {
                const status = deriveVoucherStatus({ is_active: v.is_active, starts_at: v.starts_at, expires_at: v.expires_at });
                return (
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
                  <td className="px-4 py-3 text-xs font-mono">
                    {v.starts_at ? formatIdDateTime(v.starts_at) : "—"}
                    <br />s/d {v.expires_at ? formatIdDateTime(v.expires_at) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">{statusBadge(status)}</td>
                  <td className="px-4 py-3 text-right">{v.used_count}{v.usage_limit ? ` / ${v.usage_limit}` : ""}</td>
                  <td className="px-4 py-3 text-center"><Switch checked={v.is_active} onCheckedChange={() => toggle(v)} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(v); setOpenForm(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => del(v)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              )})}
          </tbody>
        </table>
      </div>

      <VoucherFormDialog key={editing?.id ?? "new"} open={openForm} onOpenChange={setOpenForm} voucher={editing} />
    </div>
  );
}

function VoucherFormDialog({ open, onOpenChange, voucher }: { open: boolean; onOpenChange: (o: boolean) => void; voucher: VoucherRow | null }) {
  const qc = useQueryClient();
  const [code, setCode] = useState(voucher?.code ?? "");
  const [description, setDescription] = useState(voucher?.description ?? "");
  const [discountType, setDiscountType] = useState<"percent"|"nominal">(voucher?.discount_type ?? "percent");
  const [discountValue, setDiscountValue] = useState<number>(voucher?.discount_value ?? 10);
  const [minSubtotal, setMinSubtotal] = useState<number>(voucher?.min_subtotal ?? 0);
  const [maxDiscount, setMaxDiscount] = useState<number | "">(voucher?.max_discount ?? "");
  // Auto-set "now" when creating new voucher.
  const [startsAt, setStartsAt] = useState<string>(
    voucher?.starts_at ? formatIdDateTime(voucher.starts_at) : nowId()
  );
  const [expiresAt, setExpiresAt] = useState<string>(
    voucher?.expires_at ? formatIdDateTime(voucher.expires_at) : ""
  );
  const [usageLimit, setUsageLimit] = useState<number | "">(voucher?.usage_limit ?? "");
  const [isActive, setIsActive] = useState(voucher?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  // Validation
  const startDate = useMemo(() => parseIdDateTime(startsAt), [startsAt]);
  const expireDate = useMemo(() => parseIdDateTime(expiresAt), [expiresAt]);
  const dateError = useMemo(() => {
    if (expiresAt && !expireDate) return "Format kedaluwarsa tidak valid";
    if (startDate && expireDate) {
      if (expireDate.getTime() <= startDate.getTime()) {
        return "Kedaluwarsa harus lebih besar dari mulai berlaku";
      }
    }
    return undefined;
  }, [startDate, expireDate, expiresAt]);

  async function save() {
    if (!code.trim()) { toast.error("Kode wajib diisi"); return; }
    if (!discountValue || discountValue <= 0) { toast.error("Nilai diskon harus > 0"); return; }
    if (startsAt && !startDate) { toast.error("Format mulai berlaku tidak valid"); return; }
    if (dateError) { toast.error(dateError); return; }
    setSaving(true);
    const payload = {
      code: code.trim().toUpperCase(),
      description: description || null,
      discount_type: discountType,
      discount_value: discountValue,
      min_subtotal: minSubtotal || 0,
      max_discount: maxDiscount === "" ? null : Number(maxDiscount),
      starts_at: startsAt ? idToIso(startsAt) : null,
      expires_at: expiresAt ? idToIso(expiresAt) : null,
      usage_limit: usageLimit === "" ? null : Number(usageLimit),
      is_active: isActive,
    };
    if (voucher) {
      const { error } = await supabase.from("vouchers").update(payload).eq("id", voucher.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Voucher diperbarui");
      void logAction("update_voucher", "voucher", voucher.id, { code: payload.code });
    } else {
      const { error } = await supabase.from("vouchers").insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Voucher dibuat");
      void logAction("create_voucher", "voucher", null, { code: payload.code });
    }
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["admin_vouchers"] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
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
            <IdDateTimeInput
              label="Mulai Berlaku"
              value={startsAt}
              onChange={setStartsAt}
              showNow
            />
            <IdDateTimeInput
              label="Kedaluwarsa"
              value={expiresAt}
              onChange={setExpiresAt}
              error={dateError}
              quickDurations={DEFAULT_QUICK_DURATIONS}
              durationBase={startsAt}
              hint="Klik durasi cepat untuk hitung otomatis dari Mulai Berlaku"
            />
            <div>
              <Label>Batas Pemakaian (opsional)</Label>
              <Input type="number" min={0} value={usageLimit} onChange={(e) => setUsageLimit(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Tanpa batas" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /> Aktif</label>
            </div>
          </div>

          <VoucherPreviewCard
            code={code}
            discountType={discountType}
            discountValue={discountValue}
            minSubtotal={minSubtotal}
            maxDiscount={maxDiscount === "" ? null : Number(maxDiscount)}
            expiresAt={expireDate}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button onClick={save} disabled={saving || !!dateError}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VoucherPreviewCard({
  code, discountType, discountValue, minSubtotal, maxDiscount, expiresAt,
}: {
  code: string;
  discountType: "percent" | "nominal";
  discountValue: number;
  minSubtotal: number;
  maxDiscount: number | null;
  expiresAt: Date | null;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview Voucher</div>
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Tag className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-lg font-bold tracking-wider text-primary">{code || "KODE"}</div>
          <div className="mt-0.5 font-semibold">
            Diskon {discountType === "percent" ? `${discountValue || 0}%` : formatRupiah(discountValue || 0)}
          </div>
          <div className="text-xs text-muted-foreground">
            {minSubtotal > 0 ? `Min. Belanja ${formatRupiah(minSubtotal)}` : "Tanpa minimum belanja"}
            {maxDiscount ? ` • Maks. Potongan ${formatRupiah(maxDiscount)}` : ""}
          </div>
          {expiresAt && (
            <div className="mt-1 text-xs text-muted-foreground">
              Berlaku sampai {formatIdLongDate(expiresAt)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Avoid "imported but unused" if effects are added later.
useEffect;
