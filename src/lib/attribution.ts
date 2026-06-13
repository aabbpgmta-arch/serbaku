// Attribution tracker — capture UTM dari URL pertama yang dibuka, simpan 30 hari.
// Dipakai checkout untuk mencatat sumber order (Google/Facebook/TikTok/YouTube Ads, dll).

export type Attribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  landing_path: string | null;
  saved_at: string;
};

const KEY = "serbaku_attribution_v1";
const TTL_MS = 30 * 24 * 60 * 60_000;

export function captureAttribution() {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const utmSource = url.searchParams.get("utm_source");
    // Derive source dari referrer kalau UTM kosong
    let derivedSource: string | null = null;
    let derivedMedium: string | null = null;
    const ref = document.referrer || null;
    if (!utmSource && ref) {
      try {
        const host = new URL(ref).hostname.replace(/^www\./, "");
        if (/google\./.test(host)) { derivedSource = "google"; derivedMedium = "organic"; }
        else if (/facebook|fb\.com|instagram/.test(host)) { derivedSource = "facebook"; derivedMedium = "social"; }
        else if (/tiktok/.test(host)) { derivedSource = "tiktok"; derivedMedium = "social"; }
        else if (/youtube|youtu\.be/.test(host)) { derivedSource = "youtube"; derivedMedium = "social"; }
        else { derivedSource = host; derivedMedium = "referral"; }
      } catch { /* ignore */ }
    }

    const incoming: Attribution = {
      utm_source: utmSource || derivedSource,
      utm_medium: url.searchParams.get("utm_medium") || derivedMedium,
      utm_campaign: url.searchParams.get("utm_campaign"),
      utm_content: url.searchParams.get("utm_content"),
      utm_term: url.searchParams.get("utm_term"),
      referrer: ref,
      landing_path: url.pathname + url.search,
      saved_at: new Date().toISOString(),
    };

    // Hanya overwrite kalau ada UTM baru ATAU storage kosong/kadaluwarsa
    const existing = getAttribution();
    const hasNewUtm = !!utmSource;
    if (!existing || hasNewUtm) {
      if (incoming.utm_source || incoming.referrer) {
        localStorage.setItem(KEY, JSON.stringify(incoming));
      }
    }
  } catch { /* noop */ }
}

export function getAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Attribution;
    if (Date.now() - new Date(parsed.saved_at).getTime() > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch { return null; }
}

export function clearAttribution() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

// Klasifikasi sumber untuk dashboard
export function classifySource(utm_source: string | null, utm_medium: string | null, referrer: string | null): string {
  const s = (utm_source ?? "").toLowerCase();
  const m = (utm_medium ?? "").toLowerCase();
  if (m === "cpc" || m === "paid" || m === "ppc") {
    if (s.includes("google")) return "Google Ads";
    if (s.includes("facebook") || s.includes("meta")) return "Facebook Ads";
    if (s.includes("tiktok")) return "TikTok Ads";
    if (s.includes("youtube")) return "YouTube Ads";
    return "Paid Ads";
  }
  if (s.includes("google")) return "Google";
  if (s.includes("facebook") || s.includes("instagram") || s.includes("meta")) return "Facebook";
  if (s.includes("tiktok")) return "TikTok";
  if (s.includes("youtube")) return "YouTube";
  if (s) return s.charAt(0).toUpperCase() + s.slice(1);
  if (!referrer) return "Direct";
  return "Organic";
}
