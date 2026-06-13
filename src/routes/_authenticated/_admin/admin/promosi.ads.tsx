import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Save, Copy, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/_admin/admin/promosi/ads")({
  head: () => ({ meta: [{ title: "Ads Manager — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdsPage,
});

type Pixels = {
  google_ads_id?: string;
  ga4_id?: string;
  meta_pixel_id?: string;
  tiktok_pixel_id?: string;
};

function AdsPage() {
  const qc = useQueryClient();
  const { data: pixels, isLoading } = useQuery({
    queryKey: ["admin_ads_pixels"],
    queryFn: async (): Promise<Pixels> => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "ads_pixels").maybeSingle();
      return (data?.value as Pixels) ?? {};
    },
  });

  const [form, setForm] = useState<Pixels>({});
  useMemo(() => { if (pixels) setForm(pixels); }, [pixels]);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const safePixels: Pixels = {
      google_ads_id: form.google_ads_id?.trim() || undefined,
      ga4_id: form.ga4_id?.trim() || undefined,
      meta_pixel_id: form.meta_pixel_id?.trim() || undefined,
      tiktok_pixel_id: form.tiktok_pixel_id?.trim() || undefined,
    };
    const { error } = await supabase.from("site_settings").upsert({ key: "ads_pixels", value: safePixels });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pixel/Tag disimpan. Akan dimuat di halaman publik.");
    qc.invalidateQueries({ queryKey: ["admin_ads_pixels"] });
    qc.invalidateQueries({ queryKey: ["ads_pixels"] });
  }

  // UTM builder
  const [utm, setUtm] = useState({ url: typeof window !== "undefined" ? window.location.origin : "https://serbaku.com", source: "google", medium: "cpc", campaign: "", content: "", term: "" });
  const utmLink = useMemo(() => {
    try {
      const u = new URL(utm.url);
      if (utm.source) u.searchParams.set("utm_source", utm.source);
      if (utm.medium) u.searchParams.set("utm_medium", utm.medium);
      if (utm.campaign) u.searchParams.set("utm_campaign", utm.campaign);
      if (utm.content) u.searchParams.set("utm_content", utm.content);
      if (utm.term) u.searchParams.set("utm_term", utm.term);
      return u.toString();
    } catch { return ""; }
  }, [utm]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Ads Manager</h1>
        <p className="text-sm text-muted-foreground">Pasang Pixel/Tag iklan & buat link kampanye ber-UTM.</p>
      </div>

      <section className="rounded-2xl border border-border/60 bg-card p-5">
        <h2 className="font-semibold">Pixel & Tag IDs</h2>
        <p className="mb-4 text-xs text-muted-foreground">ID di sini otomatis dipasang di seluruh halaman publik.</p>
        {isLoading ? <p className="text-sm text-muted-foreground">Memuat...</p> : (
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Google Ads ID</Label><Input placeholder="AW-XXXXXXXXX" value={form.google_ads_id ?? ""} onChange={(e) => setForm({ ...form, google_ads_id: e.target.value })} /></div>
            <div><Label>GA4 Measurement ID</Label><Input placeholder="G-XXXXXXXXXX" value={form.ga4_id ?? ""} onChange={(e) => setForm({ ...form, ga4_id: e.target.value })} /></div>
            <div><Label>Meta (Facebook) Pixel ID</Label><Input placeholder="1234567890" value={form.meta_pixel_id ?? ""} onChange={(e) => setForm({ ...form, meta_pixel_id: e.target.value })} /></div>
            <div><Label>TikTok Pixel ID</Label><Input placeholder="ABCDEF0123" value={form.tiktok_pixel_id ?? ""} onChange={(e) => setForm({ ...form, tiktok_pixel_id: e.target.value })} /></div>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button onClick={save} disabled={saving} className="gap-1.5"><Save className="h-4 w-4" /> {saving ? "Menyimpan..." : "Simpan"}</Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-5">
        <h2 className="font-semibold">UTM Link Builder</h2>
        <p className="mb-3 text-xs text-muted-foreground">Buat link ber-UTM untuk dipasang di kampanye Google/Meta/TikTok/YouTube Ads.</p>
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">Preset:</span>
          {[
            { label: "Google Ads", source: "google", medium: "cpc" },
            { label: "Facebook Ads", source: "facebook", medium: "cpc" },
            { label: "TikTok Ads", source: "tiktok", medium: "cpc" },
            { label: "YouTube Ads", source: "youtube", medium: "cpc" },
          ].map((p) => (
            <Button key={p.label} type="button" size="sm" variant="outline" onClick={() => setUtm({ ...utm, source: p.source, medium: p.medium })}>{p.label}</Button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><Label>URL Tujuan</Label><Input value={utm.url} onChange={(e) => setUtm({ ...utm, url: e.target.value })} /></div>
          <div><Label>utm_source</Label><Input value={utm.source} onChange={(e) => setUtm({ ...utm, source: e.target.value })} placeholder="google / facebook / tiktok / youtube" /></div>
          <div><Label>utm_medium</Label><Input value={utm.medium} onChange={(e) => setUtm({ ...utm, medium: e.target.value })} placeholder="cpc / social / video" /></div>
          <div><Label>utm_campaign</Label><Input value={utm.campaign} onChange={(e) => setUtm({ ...utm, campaign: e.target.value })} placeholder="flash_sale_juni" /></div>
          <div><Label>utm_content (opsional)</Label><Input value={utm.content} onChange={(e) => setUtm({ ...utm, content: e.target.value })} placeholder="banner_a" /></div>
          <div className="md:col-span-2"><Label>utm_term (opsional)</Label><Input value={utm.term} onChange={(e) => setUtm({ ...utm, term: e.target.value })} placeholder="grosir+serba" /></div>
        </div>
        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Hasil:</p>
          <p className="mt-1 break-all font-mono text-sm">{utmLink || "—"}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" disabled={!utmLink} onClick={() => { navigator.clipboard.writeText(utmLink); toast.success("Tersalin"); }} className="gap-1.5"><Copy className="h-3.5 w-3.5" /> Copy</Button>
            <Button size="sm" variant="outline" disabled={!utmLink} asChild className="gap-1.5"><a href={utmLink} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /> Buka</a></Button>
          </div>
        </div>
      </section>
    </div>
  );
}
