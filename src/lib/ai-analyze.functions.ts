import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const InputSchema = z.object({
  imageDataUrl: z.string().min(20).max(15_000_000),
});

export const analyzeProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data, context }) => {
    // Admin only
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI tidak tersedia (LOVABLE_API_KEY belum diset)");

    const systemPrompt = [
      "Anda menganalisis FOTO PRODUK untuk Toko Serba (SERBAKU) — grosir fashion Indonesia.",
      "Tugas: keluarkan JSON ringkas berbahasa Indonesia.",
      "- name: nama produk singkat & menjual (maks ~80 karakter). Jika di foto terlihat kode produk seperti #133, KM04, KNIT 126, sertakan di akhir nama dengan format ' - #KODE'.",
      "- description: 1-2 kalimat deskripsi profesional untuk fashion grosir (bahan terlihat, gaya, cocok untuk siapa). Tanpa emoji, tanpa harga, tanpa CTA.",
      "Hanya keluarkan JSON valid: {\"name\":\"...\",\"description\":\"...\"}",
    ].join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analisis foto produk ini dan buatkan nama + deskripsi." },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Rate limit AI tercapai, coba lagi sebentar.");
    if (res.status === 402) throw new Error("Kredit AI habis. Tambahkan kredit di Settings.");
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`AI error: ${res.status} ${t.slice(0, 200)}`);
    }

    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { name?: string; description?: string } = {};
    try {
      parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));
    } catch {
      const m = String(raw).match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {
          /* ignore */
        }
      }
    }

    const name = (parsed.name ?? "").trim();
    const description = (parsed.description ?? "").trim();
    if (!name && !description) throw new Error("AI gagal membaca foto. Coba foto lebih jelas.");
    return { name, description };
  });
