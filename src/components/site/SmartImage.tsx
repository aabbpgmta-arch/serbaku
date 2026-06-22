import { useState, type ImgHTMLAttributes } from "react";
import { getOptimizedImageUrl, getImageSrcSet, type ImageSize, type OptimizeOptions } from "@/lib/image";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
  src: string | null | undefined;
  size?: ImageSize | OptimizeOptions;
  /** If provided, builds a 1x/2x srcSet around this base width. */
  responsiveWidth?: number;
  fallbackSrc?: string;
};

/**
 * <img> that requests an optimized thumbnail from Supabase Storage and
 * automatically falls back to the original URL if the render endpoint is
 * unavailable (e.g. signed-URL transforms disabled). Design-agnostic:
 * inherits all className and styling from the caller.
 */
export function SmartImage({
  src,
  size = "card",
  responsiveWidth,
  fallbackSrc,
  loading = "lazy",
  decoding = "async",
  ...rest
}: Props) {
  const optimized = getOptimizedImageUrl(src, size);
  const [current, setCurrent] = useState(optimized);
  const srcSet = responsiveWidth ? getImageSrcSet(src, responsiveWidth) : undefined;

  return (
    <img
      {...rest}
      src={current || fallbackSrc || ""}
      srcSet={current === optimized ? srcSet : undefined}
      loading={loading}
      decoding={decoding}
      onError={(e) => {
        // Fallback chain: optimized -> original -> fallbackSrc
        if (src && current !== src) {
          setCurrent(src);
          return;
        }
        if (fallbackSrc && current !== fallbackSrc) {
          setCurrent(fallbackSrc);
          return;
        }
        rest.onError?.(e);
      }}
    />
  );
}
