import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Crown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth-context";
import { tierMeta, discountForTier } from "@/lib/membership";
import { formatRupiah } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect } from "react";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Toko Serba" }, { name: "robots", content: "noindex" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, subtotal, clear, totalQty } = useCart();
  const { user, loading, membershipTier, refreshMembership } = useAuth();
  const tier = tierMeta(membershipTier);
  const membershipDiscount = user ? discountForTier(membershipTier, totalQty) : 0;
  const discountedSubtotal = Math.max(0, subtotal - membershipDiscount);
  const navigate = useNavigate();
  const [shippingPayer, setShippingPayer] = useState<"pengirim" | "penerima">("penerima");
  const [shippingCost, setShippingCost] = useState(0);
  const [submitting, setSubmitting] = useState(false);

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

  if (items.length === 0) {
    return <div className="container-page py-20 text-center text-muted-foreground">Keranjang kosong.</div>;
  }

  const total = discountedSubtotal + (shippingPayer === "pengirim" ? shippingCost : 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (items.some((i) => i.qty % 6 !== 0)) {
      toast.error("Quantity harus kelipatan 6 pcs");
      return;
    }
    setSubmitting(true);

    // Validate latest stock from Supabase
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
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        ...form,
        subtotal,
        shipping_cost: shippingPayer === "pengirim" ? shippingCost : 0,
        shipping_payer: shippingPayer,
        total,
        status: "menunggu_pembayaran",
        membership_tier: membershipTier,
        membership_discount: membershipDiscount,
      })
      .select()
      .single();

    if (error || !order) {
      toast.error("Gagal membuat pesanan: " + (error?.message ?? ""));
      setSubmitting(false);
      return;
    }
    const itemsPayload = items.map((i) => ({
      order_id: order.id,
      product_id: i.productId,
      product_name: i.name,
      product_image: i.image,
      unit_price: i.price,
      quantity: i.qty,
      subtotal: i.price * i.qty,
    }));
    const { error: itemsErr } = await supabase.from("order_items").insert(itemsPayload);
    if (itemsErr) {
      toast.error("Gagal menyimpan item pesanan");
      setSubmitting(false);
      return;
    }
    // Save profile snapshot
    await supabase.from("profiles").upsert({
      id: user.id, email: form.email, full_name: form.full_name, whatsapp: form.whatsapp,
      address: form.address, city: form.city, province: form.province, postal_code: form.postal_code,
    });
    clear();
    await refreshMembership();
    toast.success("Pesanan berhasil dibuat!");
    navigate({ to: "/akun/pesanan/$id", params: { id: order.id } });
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
            {items.map((i) => (
              <div key={i.productId} className="flex justify-between gap-3 text-sm">
                <span className="line-clamp-2">{i.name} <span className="text-muted-foreground">×{i.qty}</span></span>
                <span className="shrink-0 font-semibold">{formatRupiah(i.price * i.qty)}</span>
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
          <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
            <Row label={`Subtotal (${totalQty} pcs)`} value={formatRupiah(subtotal)} />
            {membershipDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Diskon Member {tier.label}</span>
                <span className="font-semibold">-{formatRupiah(membershipDiscount)}</span>
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
