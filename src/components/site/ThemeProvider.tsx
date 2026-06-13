import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_THEME, applyTheme, resolveMode, buildGoogleFontsUrl,
  type Theme, type ThemeMode,
} from "@/lib/theme";

const MODE_KEY = "serbaku.theme.mode";

function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const v = window.localStorage.getItem(MODE_KEY);
  return v === "dark" || v === "auto" ? v : "light";
}

export function setThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MODE_KEY, mode);
  window.dispatchEvent(new CustomEvent("serbaku-theme-mode", { detail: mode }));
}

export function useThemeMode(): [ThemeMode, (m: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>("light");
  useEffect(() => {
    setMode(getStoredMode());
    const onChange = (e: Event) => setMode((e as CustomEvent<ThemeMode>).detail);
    window.addEventListener("serbaku-theme-mode", onChange);
    return () => window.removeEventListener("serbaku-theme-mode", onChange);
  }, []);
  return [mode, (m) => { setThemeMode(m); setMode(m); }];
}

export function ThemeProvider() {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [previewTheme, setPreviewTheme] = useState<Theme | null>(null);
  const [previewMode, setPreviewMode] = useState<"light" | "dark" | null>(null);

  // Load saved theme
  const { data: savedTheme } = useQuery({
    queryKey: ["theme_active"],
    queryFn: async (): Promise<Theme> => {
      const { data } = await supabase
        .from("site_settings").select("value").eq("key", "theme_active").maybeSingle();
      const v = data?.value as Partial<Theme> | null;
      if (!v) return DEFAULT_THEME;
      return {
        light: { ...DEFAULT_THEME.light, ...(v.light ?? {}) },
        dark: { ...DEFAULT_THEME.dark, ...(v.dark ?? {}) },
        typography: { ...DEFAULT_THEME.typography, ...(v.typography ?? {}) },
        shape: { ...DEFAULT_THEME.shape, ...(v.shape ?? {}) },
        branding: { ...DEFAULT_THEME.branding, ...(v.branding ?? {}) },
      };
    },
    staleTime: 60_000,
  });

  // Initial mode + listener
  useEffect(() => {
    setMode(getStoredMode());
    const onMode = (e: Event) => setMode((e as CustomEvent<ThemeMode>).detail);
    window.addEventListener("serbaku-theme-mode", onMode);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSys = () => setMode((m) => m); // trigger re-resolve
    mq.addEventListener("change", onSys);
    return () => {
      window.removeEventListener("serbaku-theme-mode", onMode);
      mq.removeEventListener("change", onSys);
    };
  }, []);

  // postMessage preview channel (admin editor → preview iframe)
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; theme?: Theme; mode?: "light" | "dark" } | undefined;
      if (!d || d.type !== "serbaku:theme-preview") return;
      setPreviewTheme(d.theme ?? null);
      setPreviewMode(d.mode ?? null);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Apply effective theme
  useEffect(() => {
    const theme = previewTheme ?? savedTheme ?? DEFAULT_THEME;
    const resolved = previewMode ?? resolveMode(mode);
    applyTheme(theme, resolved);
    // Inject google fonts link
    const url = buildGoogleFontsUrl([theme.typography.fontHeading, theme.typography.fontBody]);
    if (url) {
      const id = "serbaku-theme-fonts";
      let link = document.getElementById(id) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }
      if (link.href !== url) link.href = url;
    }
    // Favicon
    if (theme.branding.faviconUrl) {
      let icon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
      if (!icon) {
        icon = document.createElement("link");
        icon.rel = "icon";
        document.head.appendChild(icon);
      }
      icon.href = theme.branding.faviconUrl;
    }
  }, [savedTheme, mode, previewTheme, previewMode]);

  return null;
}
