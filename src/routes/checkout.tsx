import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, Tag, Check, X, AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCart, type CartItem } from "@/lib/cart";
import { useAuth } from "@/lib/auth-context";
import { tierMeta } from "@/lib/membership";
import { bestUnitPrice } from "@/lib/promo";
import { getAttribution } from "@/lib/attribution";
import { formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Toko Serba" }, { name: "robots", content: "noindex" }] }),
  component: CheckoutPage,
});

function promoOf(i: CartItem) {
  return {
    price: i.price,
    discountType: i.discountType ?? null,
    discountValue: i.discountValue ?? null,
    flashPrice: i.flashPrice ?? null,
    flashStartAt: i.flashStartAt ?? null,
    flashEndAt: i.flashEndAt ?? null,
  };
}

function CheckoutPage() {
  const { items, subtotal, clear, totalQty } = useCart();
  const { user, loading, membershipTier, refreshMembership } = useAuth();
  const tier = tierMeta(membershipTier);
  const memberPerPcs = user ? tier.discountPerPcs : 0;

  const enriched = useMemo(() => items.map((i) => {
    const best = bestUnitPrice(promoOf(i), memberPerPcs);
    return { item: i, unit: best.unit, lineTotal: best.unit * i.qty, saved: best.saved * i.qty, basis: best.basis };
  }), [items, memberPerPcs]);

  const promoSavings = enriched.filter((e) => e.basis === "promo").reduce((s, e) => s + e.saved, 0);
  const memberSavings = enriched.filter((e) => e.basis === "member").reduce((s, e) => s + e.saved, 0);
  const itemDiscount = promoSavings + memberSavings;
  const subtotalAfterItem = Math.max(0, subtotal - itemDiscount);

  const navigate = useNavigate();
  const [shippingPayer, setShippingPayer] = useState<"pengirim" | "penerima">("penerima");
  const [shippingCost, setShippingCost] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [voucherInput, setVoucherInput] = useState("");
  const [voucherChecking, setVoucherChecking] = useState(false);
  const [voucher, setVoucher] = useState<{ code: string; discount: number } | null>(null);

  const [form, setForm] = useState({
    full_name: "", whatsapp: "", email: "", address: "", city: "", province: "", postal_code: "", notes: "",
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
        if (data) {
          setForm((f) => ({
            ...f,
            full_name: data.full_name ?? "",
            whatsapp: data.whatsapp ?? "",
            email: data.email ?? user.email ?? "",
            address: data.address ?? "",
            city: data.city ?? "",
            province: data.province ?? "",
            postal_code: data.postal_code ?? "",
          }));
        } else {
          setForm((f) => ({ ...f, email: user.email ?? "" }));
        }
      });
    }
  }, [user]);

  // Re-validate voucher when subtotal changes
  useEffect(() => {
    if (!voucher) return;
    (async () => {
      const { validateVoucher } = await import("@/lib/checkout.functions");
      const row = await validateVoucher({ data: { code: voucher.code, subtotal: subtotalAfterItem } });
      if (!row || row.message !== "ok") {
        setVoucher(null);
        toast.error("Voucher tidak lagi berlaku: " + (row?.message ?? "error"));
      } else if (Number(row.discount) !== voucher.discount) {
        setVoucher({ code: row.code, discount: Number(row.discount) });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotalAfterItem]);

  if (items.length === 0) {
    return <div className="container-page py-20 text-center text-muted-foreground">Keranjang kosong.</div>;
  }

  const voucherDiscount = voucher?.discount ?? 0;
  const subtotalAfterVoucher = Math.max(0, subtotalAfterItem - voucherDiscount);
  const total = subtotalAfterVoucher + (shippingPayer === "pengirim" ? shippingCost : 0);

  async function applyVoucher() {
    const code = voucherInput.trim();
    if (!code) return;
    setVoucherChecking(true);
    const { validateVoucher } = await import("@/lib/checkout.functions");
    const row = await validateVoucher({ data: { code, subtotal: subtotalAfterItem } }).catch((error) => ({ error }));
    setVoucherChecking(false);
    if ("error" in row) { toast.error(row.error?.message ?? "Voucher tidak bisa divalidasi"); return; }
    if (!row || row.message !== "ok") {
      toast.error(row?.message ?? "Voucher tidak valid");
      setVoucher(null);
      return;
    }
    setVoucher({ code: row.code, discount: Number(row.discount) });
    toast.success(`Voucher ${row.code} berhasil dipakai (-${formatRupiah(Number(row.discount))})`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (items.some((i) => i.qty % 6 !== 0)) {
      toast.error("Quantity harus kelipatan 6 pcs");
      return;
    }
    setSubmitting(true);

    const ids = items.map((i) => i.productId);
    const { data: stockRows, error: stockErr } = await supabase
      .from("products").select("id,stock,name,is_active").in("id", ids);
    if (stockErr) {
      toast.error("Gagal mengecek stok: " + stockErr.message);
      setSubmitting(false);
      return;
    }
    for (const i of items) {
      const row = stockRows?.find((r) => r.id === i.productId);
      if (!row || !row.is_active) {
        toast.error(`Produk "${i.name}" tidak tersedia`);
        setSubmitting(false);
        return;
      }
      if (row.stock < i.qty) {
        toast.error(`Stok produk tidak mencukupi untuk "${row.name}" (sisa ${row.stock})`);
        setSubmitting(false);
        return;
      }
    }

    const attribution = getAttribution();
    try {
      const { createOrder } = await import("@/lib/checkout.functions");
      const res = await createOrder({
        data: {
          items: items.map((i) => ({ product_id: i.productId, qty: i.qty })),
          form: {
            full_name: form.full_name,
            whatsapp: form.whatsapp,
            email: form.email,
            address: form.address,
            city: form.city,
            province: form.province,
            postal_code: form.postal_code,
            notes: form.notes,
          },
          voucher_code: voucher?.code ?? null,
          shipping_payer: shippingPayer,
          shipping_cost: shippingPayer === "pengirim" ? shippingCost : 0,
          attribution: attribution ?? null,
        },
      });

      clear();
      await refreshMembership();
      toast.success("Pesanan berhasil dibuat!");
      navigate({ to: "/akun/pesanan/$id", params: { id: res.order_id } });
    } catch (err: any) {
      toast.error("Gagal membuat pesanan: " + (err?.message ?? String(err)));
      setSubmitting(false);
      return;
    }
  }



  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-bold">Checkout</h1>
      <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6 rounded-2xl border border-border/60 bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Data Pengiriman</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nama Lengkap" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} required />
            <Field label="No. WhatsApp" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} required />
            <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Field label="Kota" value={form.city} onChange={(v) => setForm({ ...form, city: v })} required />
            <Field label="Provinsi" value={form.province} onChange={(v) => setForm({ ...form, province: v })} required />
            <Field label="Kode Pos" value={form.postal_code} onChange={(v) => setForm({ ...form, postal_code: v })} />
          </div>
          <div>
            <Label htmlFor="addr">Alamat Lengkap</Label>
            <Textarea id="addr" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required rows={3} />
          </div>
          <div>
            <Label htmlFor="notes">Catatan Pesanan</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>

          <div>
            <Label>Opsi Ongkir</Label>
            <RadioGroup value={shippingPayer} onValueChange={(v) => setShippingPayer(v as "pengirim" | "penerima")} className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft/20">
                <RadioGroupItem value="penerima" />
                <div>
                  <div className="text-sm font-semibold">Bayar di Penerima (COD ongkir)</div>
                  <div className="text-xs text-muted-foreground">Ongkir dibayar saat barang sampai.</div>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft/20">
                <RadioGroupItem value="pengirim" />
                <div>
                  <div className="text-sm font-semibold">Bayar di Pengirim</div>
                  <div className="text-xs text-muted-foreground">Ongkir ditambahkan ke total.</div>
                </div>
              </label>
            </RadioGroup>
            {shippingPayer === "pengirim" && (
              <div className="mt-3">
                <Label htmlFor="ongkir">Estimasi Ongkir (Rp)</Label>
                <Input id="ongkir" type="number" min={0} value={shippingCost} onChange={(e) => setShippingCost(Number(e.target.value) || 0)} />
                <p className="mt-1 text-xs text-muted-foreground">Admin akan mengkonfirmasi nominal final.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-border/60 bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Ringkasan</h2>
          <div className="mt-4 space-y-3">
            {enriched.map(({ item: i, unit, lineTotal }) => (
              <div key={i.productId} className="flex justify-between gap-3 text-sm">
                <span className="line-clamp-2">
                  {i.name} <span className="text-muted-foreground">×{i.qty}</span>
                  {unit < i.price && <span className="ml-1 text-[10px] font-semibold text-rose-600">PROMO</span>}
                </span>
                <span className="shrink-0 text-right">
                  <div className="font-semibold">{formatRupiah(lineTotal)}</div>
                  {unit < i.price && <div className="text-[10px] text-muted-foreground line-through">{formatRupiah(i.price * i.qty)}</div>}
                </span>
              </div>
            ))}
          </div>
          {user && (
            <div className={`mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${tier.color}`}>
              <Crown className="h-3.5 w-3.5" />
              <span className="font-bold">Member {tier.label}</span>
              <span className="ml-auto">{tier.discountPerPcs > 0 ? `Diskon ${formatRupiah(tier.discountPerPcs)}/pcs` : "Belum ada diskon"}</span>
            </div>
          )}

          {/* Voucher */}
          <div className="mt-4 rounded-xl border border-dashed border-border p-3">
            <Label className="flex items-center gap-1.5 text-xs"><Tag className="h-3.5 w-3.5" /> Kode Voucher</Label>
            {voucher ? (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm">
                <span className="font-semibold text-emerald-700 inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" /> {voucher.code}</span>
                <span className="text-emerald-700">-{formatRupiah(voucher.discount)}</span>
                <button type="button" onClick={() => { setVoucher(null); setVoucherInput(""); }} className="text-xs text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="mt-2 flex gap-2">
                <Input value={voucherInput} onChange={(e) => setVoucherInput(e.target.value.toUpperCase())} placeholder="MISAL: HEMAT10" className="uppercase" />
                <Button type="button" variant="outline" onClick={applyVoucher} disabled={voucherChecking || !voucherInput.trim()}>
                  {voucherChecking ? "..." : "Pakai"}
                </Button>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
            <Row label={`Subtotal (${totalQty} pcs)`} value={formatRupiah(subtotal)} />
            {promoSavings > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Diskon Promo</span>
                <span className="font-semibold">-{formatRupiah(promoSavings)}</span>
              </div>
            )}
            {memberSavings > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Diskon Member {tier.label}</span>
                <span className="font-semibold">-{formatRupiah(memberSavings)}</span>
              </div>
            )}
            {voucherDiscount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Voucher {voucher?.code}</span>
                <span className="font-semibold">-{formatRupiah(voucherDiscount)}</span>
              </div>
            )}
            <Row label={`Ongkir (${shippingPayer === "pengirim" ? "ditanggung pengirim" : "ditanggung penerima"})`} value={shippingPayer === "pengirim" ? formatRupiah(shippingCost) : "—"} />
          </div>
          <div className="mt-3 flex justify-between border-t border-border pt-3 text-base font-bold">
            <span>Total</span><span className="text-primary">{formatRupiah(total)}</span>
          </div>
          <Button type="submit" size="lg" className="mt-5 w-full" disabled={submitting}>
            {submitting ? "Memproses..." : "Buat Pesanan"}
          </Button>
        </aside>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>;
}
