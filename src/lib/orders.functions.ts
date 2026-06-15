import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      orderId: z.string().uuid(),
      reason: z.string().trim().min(1).max(500),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: order, error: orderError } = await context.supabase
      .from("orders")
      .select("id,status,user_id")
      .eq("id", data.orderId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (orderError) throw new Error(orderError.message);
    if (!order) throw new Error("Pesanan tidak ditemukan");
    if (order.status !== "menunggu_pembayaran") {
      throw new Error("Pesanan ini sudah diproses dan tidak dapat dibatalkan melalui sistem. Silakan hubungi admin.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: updErr } = await supabaseAdmin
      .from("orders")
      .update({
        status: "dibatalkan",
        cancel_reason: data.reason,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.orderId);
    if (updErr) throw new Error(updErr.message);

    // Annotate the just-inserted status-history row with the cancel reason
    const { data: lastHist } = await supabaseAdmin
      .from("order_status_history")
      .select("id")
      .eq("order_id", data.orderId)
      .eq("to_status", "dibatalkan")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastHist?.id) {
      await supabaseAdmin
        .from("order_status_history")
        .update({ note: `Dibatalkan oleh customer: ${data.reason}` })
        .eq("id", lastHist.id);
    }

    return { ok: true };
  });


export const setOrderPaymentProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      orderId: z.string().uuid(),
      url: z
        .string()
        .url()
        .max(4096)
        .refine((u) => {
          try {
            const parsed = new URL(u);
            const supaUrl = new URL(process.env.SUPABASE_URL ?? "https://fnudwwfysbjrxbxoqmpv.supabase.co");
            return (
              parsed.protocol === "https:" &&
              parsed.host === supaUrl.host &&
              parsed.pathname.startsWith("/storage/v1/object/")
            );
          } catch {
            return false;
          }
        }, { message: "URL bukti transfer tidak valid" }),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: order, error: orderError } = await context.supabase
      .from("orders")
      .select("id,status")
      .eq("id", data.orderId)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (orderError) throw new Error(orderError.message);
    if (!order) throw new Error("Pesanan tidak ditemukan");
    if (order.status !== "menunggu_pembayaran") throw new Error("Pesanan tidak bisa menerima bukti transfer");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ payment_proof_url: data.url, updated_at: new Date().toISOString() })
      .eq("id", data.orderId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });