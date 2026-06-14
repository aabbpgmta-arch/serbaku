import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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