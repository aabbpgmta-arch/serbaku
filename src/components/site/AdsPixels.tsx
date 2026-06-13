import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type Pixels = {
  google_ads_id?: string;
  ga4_id?: string;
  meta_pixel_id?: string;
  tiktok_pixel_id?: string;
  youtube_tag?: string;
};

// Inject ads & analytics scripts berdasarkan ID yang disimpan admin di site_settings.
export function AdsPixels() {
  const { data } = useQuery({
    queryKey: ["ads_pixels"],
    queryFn: async (): Promise<Pixels> => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "ads_pixels").maybeSingle();
      return (data?.value as Pixels) ?? {};
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!data || typeof window === "undefined") return;
    const w = window as unknown as {
      dataLayer?: unknown[];
      gtag?: (...args: unknown[]) => void;
      fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; push?: unknown; loaded?: boolean; version?: string };
      _fbq?: unknown;
      ttq?: { load?: (id: string) => void; page?: () => void; methods?: string[] };
    };

    function addScript(id: string, src?: string, inner?: string, async = true) {
      if (document.getElementById(id)) return;
      const s = document.createElement("script");
      s.id = id;
      if (src) { s.src = src; s.async = async; }
      if (inner) s.text = inner;
      document.head.appendChild(s);
    }

    // Google Ads / GA4 via gtag.js
    const gtagId = data.ga4_id || data.google_ads_id;
    if (gtagId) {
      addScript("gtag-loader", `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gtagId)}`);
      addScript(
        "gtag-init",
        undefined,
        `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());${
          data.ga4_id ? `gtag('config','${data.ga4_id}');` : ""
        }${data.google_ads_id ? `gtag('config','${data.google_ads_id}');` : ""}`,
      );
    }

    // Meta Pixel
    if (data.meta_pixel_id) {
      addScript(
        "meta-pixel",
        undefined,
        `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${data.meta_pixel_id}');fbq('track','PageView');`,
      );
    }

    // TikTok Pixel
    if (data.tiktok_pixel_id) {
      addScript(
        "tiktok-pixel",
        undefined,
        `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${data.tiktok_pixel_id}');ttq.page();}(window,document,'ttq');`,
      );
    }

    // Generic YouTube / extra tag (allow raw snippet)
    if (data.youtube_tag) {
      addScript("youtube-tag", undefined, data.youtube_tag);
    }
  }, [data]);

  return null;
}
