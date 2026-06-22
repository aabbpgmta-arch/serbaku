// Global helper to render lightweight thumbnails from Supabase Storage URLs
// without re-uploading. Uses the Storage render endpoint when available and
// falls back gracefully if image transformation is disabled.

export type ImageSize = "thumb" | "card" | "detail" | "hero";

export interface OptimizeOptions {
  width?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
}

const PRESETS: Record<ImageSize, Required<Pick<OptimizeOptions, "width" | "quality">> & { resize: "cover" | "contain" | "fill" }> = {
  thumb: { width: 200, quality: 70, resize: "cover" },
  card: { width: 480, quality: 72, resize: "cover" },
  detail: { width: 900, quality: 75, resize: "contain" },
  hero: { width: 1200, quality: 75, resize: "cover" },
};

function isSupabaseStorageUrl(url: string): boolean {
  return /\/storage\/v1\/object\/(?:sign|public)\//.test(url);
}

/**
 * Returns an optimized thumbnail URL for a Supabase Storage image.
 * - Public objects: swaps to /render/image/public/ and appends transform params.
 * - Signed objects: swaps to /render/image/sign/ keeping the token (works when
 *   the Storage image transform addon is enabled; otherwise the <img> onError
 *   fallback should restore the original URL).
 * - Anything non-Supabase or empty: returned unchanged.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  sizeOrOpts: ImageSize | OptimizeOptions = "card",
): string {
  if (!url) return "";
  if (!isSupabaseStorageUrl(url)) return url;

  const opts: OptimizeOptions =
    typeof sizeOrOpts === "string" ? PRESETS[sizeOrOpts] : sizeOrOpts;
  const width = Math.round(opts.width ?? 480);
  const quality = Math.max(20, Math.min(100, Math.round(opts.quality ?? 72)));
  const resize = opts.resize ?? "cover";

  try {
    const u = new URL(url);
    u.pathname = u.pathname
      .replace("/storage/v1/object/sign/", "/storage/v1/render/image/sign/")
      .replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
    u.searchParams.set("width", String(width));
    u.searchParams.set("quality", String(quality));
    u.searchParams.set("resize", resize);
    return u.toString();
  } catch {
    return url;
  }
}

/** Build a srcSet at 1x/2x for a base width. */
export function getImageSrcSet(
  url: string | null | undefined,
  baseWidth: number,
  quality = 72,
): string | undefined {
  if (!url || !isSupabaseStorageUrl(url)) return undefined;
  const x1 = getOptimizedImageUrl(url, { width: baseWidth, quality });
  const x2 = getOptimizedImageUrl(url, { width: baseWidth * 2, quality });
  return `${x1} 1x, ${x2} 2x`;
}
