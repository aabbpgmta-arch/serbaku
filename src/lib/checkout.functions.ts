// Server-side order creation. All pricing is recomputed on the server from
// authoritative product / flash-sale / membership / voucher data. The client
// only supplies cart line product_id + qty, shipping form fields, optional
// voucher code, and shipping preference. This prevents client-side price
// tampering (CLIENT_SIDE_AUTH security finding).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TIER_DISCOUNT_PER_PCS: Record<string, number> = {
  new: 0,
  grande: 250,
  elite: 500,
  royal: 1000,
};

const CreateOrderSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        qty: z.number().int().positive().max(100000),
      }),
    )
    .min(1)
    .max(200),
  form: z.object({
    full_name: z.string().trim().min(1).max(255),
    whatsapp: z.string().trim().min(3).max(64),
    email: z.string().trim().max(255).optional().default(""),
    address: z.string().trim().min(1).max(2000),
    city: z.string().trim().min(1).max(255),
    province: z.string().trim().min(1).max(255),
    postal_code: z.string().trim().max(32).optional().default(""),
    notes: z.string().trim().max(2000).optional().default(""),
  }),
  voucher_code: z.string().trim().max(64).nullable().optional(),
  shipping_payer: z.enum(["pengirim", "penerima"]),
  shipping_cost: z.number().min(0).max(10_000_000).default(0),
  attribution: z
    .object({
      utm_source: z.string().max(255).nullable().optional(),
      utm_medium: z.string().max(255).nullable().optional(),
      utm_campaign: z.string().max(255).nullable().optional(),
      utm_content: z.string().max(255).nullable().optional(),
      utm_term: z.string().max(255).nullable().optional(),
      referrer: z.string().max(2000).nullable().optional(),
      landing_path: z.string().max(2000).nullable().optional(),
    })
    .nullable()
    .optional(),
});

const ValidateVoucherSchema = z.object({
  code: z.string().trim().min(1).max(64),
  subtotal: z.number().min(0).max(1_000_000_000),
});

export const validateVoucher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ValidateVoucherSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("validate_voucher", {
      _code: data.code,
      _subtotal: data.subtotal,
    });

    if (error) throw new Error("Voucher tidak bisa divalidasi");
    const row = Array.isArray(result) ? result[0] : result;
    return {
      code: (row?.code as string | undefined) ?? data.code,
      discount: Number(row?.discount ?? 0),
      message: (row?.message as string | undefined) ?? "Voucher tidak valid",
    };
  });

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CreateOrderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Enforce kelipatan 6
    for (const it of data.items) {
      if (it.qty % 6 !== 0) {
        throw new Error("Quantity harus kelipatan 6 pcs");
      }
    }

    const ids = data.items.map((i) => i.product_id);

    // Fetch authoritative product data + flash sale info
    const { data: products, error: prodErr } = await supabaseAdmin
      .from("products")
      .select(
        "id,name,price,discount_type,discount_value,stock,is_active,product_images(url,sort_order,is_cover),flash_sale_items(discount_type,discount_value,flash_sales(starts_at,ends_at,is_active))",
      )
      .in("id", ids);
    if (prodErr) throw new Error("Gagal memuat produk: " + prodErr.message);
    const prodMap = new Map((products ?? []).map((p) => [p.id, p]));

    // Resolve membership tier from server-side profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("membership_tier")
      .eq("id", userId)
      .maybeSingle();
    const tier = (profile?.membership_tier as string | null) ?? "new";
    const memberPerPcs = TIER_DISCOUNT_PER_PCS[tier] ?? 0;

    const now = Date.now();
    let subtotalRaw = 0;
    let subtotalAfterItem = 0;
    let membershipDiscount = 0;

    const itemsPayload: Array<{
      product_id: string;
      product_name: string;
      product_image: string | null;
      unit_price: number;
      quantity: number;
      subtotal: number;
    }> = [];

    for (const cartIt of data.items) {
      const p = prodMap.get(cartIt.product_id);
      if (!p || !p.is_active) {
        throw new Error(`Produk tidak tersedia`);
      }
      if (Number(p.stock) < cartIt.qty) {
        throw new Error(`Stok produk "${p.name}" tidak mencukupi (sisa ${p.stock})`);
      }

      const basePrice = Number(p.price) || 0;

      // Best flash-sale unit
      let flashUnit: number | null = null;
      for (const fsi of (p as any).flash_sale_items ?? []) {
        const fs = fsi.flash_sales;
        if (!fs || !fs.is_active) continue;
        const s = new Date(fs.starts_at).getTime();
        const e = new Date(fs.ends_at).getTime();
        if (now < s || now > e) continue;
        const u =
          fsi.discount_type === "percent"
            ? Math.max(0, Math.round(basePrice * (1 - Number(fsi.discount_value) / 100)))
            : Math.max(0, basePrice - Number(fsi.discount_value));
        if (flashUnit === null || u < flashUnit) flashUnit = u;
      }

      // Product-level discount
      let promoUnit = basePrice;
      if (flashUnit !== null) {
        promoUnit = Math.min(basePrice, flashUnit);
      } else if (p.discount_type === "percent" && Number(p.discount_value) > 0) {
        promoUnit = Math.max(0, Math.round(basePrice * (1 - Number(p.discount_value) / 100)));
      } else if (p.discount_type === "nominal" && Number(p.discount_value) > 0) {
        promoUnit = Math.max(0, basePrice - Number(p.discount_value));
      }
      const promoSave = basePrice - promoUnit;
      const memberSave = Math.max(0, memberPerPcs);

      let unit = basePrice;
      let basis: "promo" | "member" | "none" = "none";
      if (promoSave <= 0 && memberSave <= 0) {
        unit = basePrice;
      } else if (promoSave >= memberSave) {
        unit = promoUnit;
        basis = "promo";
      } else {
        unit = Math.max(0, basePrice - memberSave);
        basis = "member";
      }

      const lineTotal = unit * cartIt.qty;
      subtotalRaw += basePrice * cartIt.qty;
      subtotalAfterItem += lineTotal;
      if (basis === "member") membershipDiscount += memberSave * cartIt.qty;


      const imgs = ((p as any).product_images ?? []) as Array<{ url: string; sort_order: number; is_cover?: boolean }>;
      imgs.sort((a, b) => (Number(b.is_cover) - Number(a.is_cover)) || ((a.sort_order ?? 0) - (b.sort_order ?? 0)));
      itemsPayload.push({
        product_id: p.id,
        product_name: p.name,
        product_image: imgs[0]?.url ?? null,
        unit_price: unit,
        quantity: cartIt.qty,
        subtotal: lineTotal,
      });
    }

    // Validate voucher server-side via existing SQL function. Voucher
    // eligibility (min belanja) is checked against the RAW subtotal to match
    // the customer-facing UI; final discount is capped at the
    // already-discounted subtotal so we never owe the customer money.
    let voucherCode: string | null = null;
    let voucherDiscount = 0;
    if (data.voucher_code) {
      const { data: vRes, error: vErr } = await supabaseAdmin.rpc("validate_voucher", {
        _code: data.voucher_code,
        _subtotal: subtotalRaw,
      });
      if (vErr) throw new Error("Voucher: " + vErr.message);
      const row = Array.isArray(vRes) ? vRes[0] : vRes;
      if (!row || row.message !== "ok") {
        throw new Error(row?.message ?? "Voucher tidak valid");
      }
      voucherCode = row.code as string;
      voucherDiscount = Math.min(Number(row.discount) || 0, subtotalAfterItem);
    }


    const subtotalAfterVoucher = Math.max(0, subtotalAfterItem - voucherDiscount);
    const shippingCost = data.shipping_payer === "pengirim" ? Math.max(0, data.shipping_cost) : 0;
    const total = subtotalAfterVoucher + shippingCost;

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        full_name: data.form.full_name,
        whatsapp: data.form.whatsapp,
        email: data.form.email || null,
        address: data.form.address,
        city: data.form.city,
        province: data.form.province,
        postal_code: data.form.postal_code || null,
        notes: data.form.notes || null,
        subtotal: subtotalAfterItem,
        shipping_cost: shippingCost,
        shipping_payer: data.shipping_payer,
        total,
        status: "menunggu_pembayaran",
        membership_tier: tier as any,
        membership_discount: membershipDiscount,
        voucher_code: voucherCode,
        voucher_discount: voucherDiscount,
        utm_source: data.attribution?.utm_source ?? null,
        utm_medium: data.attribution?.utm_medium ?? null,
        utm_campaign: data.attribution?.utm_campaign ?? null,
        utm_content: data.attribution?.utm_content ?? null,
        utm_term: data.attribution?.utm_term ?? null,
        referrer: data.attribution?.referrer ?? null,
        landing_path: data.attribution?.landing_path ?? null,
      })
      .select("id")
      .single();
    if (orderErr || !order) throw new Error("Gagal membuat pesanan: " + (orderErr?.message ?? ""));

    const { error: itemsErr } = await supabaseAdmin
      .from("order_items")
      .insert(itemsPayload.map((it) => ({ ...it, order_id: order.id })));
    if (itemsErr) {
      // Roll back the order to avoid orphans
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw new Error("Gagal menyimpan item pesanan: " + itemsErr.message);
    }

    const { error: profileErr } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email: data.form.email || null,
      full_name: data.form.full_name,
      whatsapp: data.form.whatsapp,
      address: data.form.address,
      city: data.form.city,
      province: data.form.province,
      postal_code: data.form.postal_code || null,
    });
    if (profileErr) throw new Error("Gagal memperbarui profil: " + profileErr.message);

    return { order_id: order.id as string };
  });
