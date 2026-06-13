// Theme system — color tokens, fonts, sizing, presets.
// Applied to document.documentElement via CSS custom properties.

export type ThemeMode = "light" | "dark" | "auto";

export type ThemeColorSet = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  primarySoft: string;
  secondary: string;
  accent: string;
  muted: string;
  mutedForeground: string;
  border: string;
  // Surface-level overrides (optional, fall back to background/card if empty)
  headerBg: string;
  footerBg: string;
  footerFg: string;
  buttonBg: string;
  buttonFg: string;
  cardProductBg: string;
  badgeMembership: string;
  badgeFlashSale: string;
  adminSidebarBg: string;
  adminSidebarActive: string;
};

export type ThemeTypography = {
  fontHeading: string;
  fontBody: string;
  sizeH1: number; // px (desktop)
  sizeH2: number;
  sizeH3: number;
  sizeBody: number;
};

export type ThemeShape = {
  radius: number; // rem
  buttonStyle: "rounded" | "pill" | "square";
  containerWidth: number; // px (max-width of container-page)
};

export type ThemeBranding = {
  logoUrl: string;
  faviconUrl: string;
  backgroundUrl: string; // optional CSS background-image
};

export type Theme = {
  light: ThemeColorSet;
  dark: ThemeColorSet;
  typography: ThemeTypography;
  shape: ThemeShape;
  branding: ThemeBranding;
};

export type ThemePreset = { id: string; name: string; theme: Theme };

// ───────────── Default theme ─────────────
const DEFAULT_LIGHT: ThemeColorSet = {
  background: "#FFF7F0",
  foreground: "#1F1F1F",
  card: "#FFFFFF",
  cardForeground: "#1F1F1F",
  primary: "#D96C9F",
  primaryForeground: "#FFFFFF",
  primarySoft: "#F8BBD9",
  secondary: "#F5E6EF",
  accent: "#F0D5E2",
  muted: "#F5F0EC",
  mutedForeground: "#6B5560",
  border: "#EADFE4",
  headerBg: "#FFF7F0",
  footerBg: "#1F1F1F",
  footerFg: "#FFF7F0",
  buttonBg: "#D96C9F",
  buttonFg: "#FFFFFF",
  cardProductBg: "#FFFFFF",
  badgeMembership: "#D96C9F",
  badgeFlashSale: "#E11D48",
  adminSidebarBg: "#FFFFFF",
  adminSidebarActive: "#D96C9F",
};

const DEFAULT_DARK: ThemeColorSet = {
  background: "#1A1218",
  foreground: "#F7EEF2",
  card: "#2A1F26",
  cardForeground: "#F7EEF2",
  primary: "#E689B5",
  primaryForeground: "#1A1218",
  primarySoft: "#5C2E45",
  secondary: "#3A2A33",
  accent: "#4A3540",
  muted: "#3A2A33",
  mutedForeground: "#B89AA8",
  border: "#3D2C36",
  headerBg: "#1A1218",
  footerBg: "#0F0A0D",
  footerFg: "#F7EEF2",
  buttonBg: "#E689B5",
  buttonFg: "#1A1218",
  cardProductBg: "#2A1F26",
  badgeMembership: "#E689B5",
  badgeFlashSale: "#FB7185",
  adminSidebarBg: "#2A1F26",
  adminSidebarActive: "#E689B5",
};

export const DEFAULT_THEME: Theme = {
  light: DEFAULT_LIGHT,
  dark: DEFAULT_DARK,
  typography: {
    fontHeading: "Montserrat",
    fontBody: "Poppins",
    sizeH1: 64,
    sizeH2: 48,
    sizeH3: 36,
    sizeBody: 16,
  },
  shape: { radius: 0.875, buttonStyle: "rounded", containerWidth: 1200 },
  branding: { logoUrl: "", faviconUrl: "", backgroundUrl: "" },
};

// ───────────── Presets ─────────────
export const FONT_OPTIONS = [
  "Poppins", "Inter", "Plus Jakarta Sans", "Montserrat",
  "Outfit", "DM Sans", "Manrope", "Space Grotesk",
  "Playfair Display", "Lora", "Bebas Neue", "Archivo Black",
];

function withTheme(overrides: {
  light?: Partial<ThemeColorSet>;
  dark?: Partial<ThemeColorSet>;
  typography?: Partial<ThemeTypography>;
  shape?: Partial<ThemeShape>;
  branding?: Partial<ThemeBranding>;
}): Theme {
  return {
    light: { ...DEFAULT_LIGHT, ...(overrides.light ?? {}) },
    dark: { ...DEFAULT_DARK, ...(overrides.dark ?? {}) },
    typography: { ...DEFAULT_THEME.typography, ...(overrides.typography ?? {}) },
    shape: { ...DEFAULT_THEME.shape, ...(overrides.shape ?? {}) },
    branding: { ...DEFAULT_THEME.branding, ...(overrides.branding ?? {}) },
  };
}

export const BUILT_IN_PRESETS: ThemePreset[] = [
  { id: "serbaku-pink", name: "SERBAKU Pink (Default)", theme: DEFAULT_THEME },
  {
    id: "minimal-white",
    name: "Minimal Putih",
    theme: withTheme({
      light: {
        background: "#FFFFFF", foreground: "#0A0A0A", card: "#FAFAFA", cardForeground: "#0A0A0A",
        primary: "#0A0A0A", primaryForeground: "#FFFFFF", primarySoft: "#E5E5E5",
        secondary: "#F4F4F5", accent: "#E5E5E5", muted: "#F4F4F5", mutedForeground: "#525252",
        border: "#E5E5E5", headerBg: "#FFFFFF", footerBg: "#0A0A0A", footerFg: "#FFFFFF",
        buttonBg: "#0A0A0A", buttonFg: "#FFFFFF", cardProductBg: "#FFFFFF",
        badgeMembership: "#0A0A0A", badgeFlashSale: "#DC2626",
        adminSidebarBg: "#FAFAFA", adminSidebarActive: "#0A0A0A",
      },
      typography: { fontHeading: "Inter", fontBody: "Inter" },
      shape: { radius: 0.375, buttonStyle: "rounded", containerWidth: 1280 },
    }),
  },
  {
    id: "elegant-dark",
    name: "Elegant Gelap",
    theme: withTheme({
      light: {
        background: "#0F0F12", foreground: "#F5F5F7", card: "#1A1A1F", cardForeground: "#F5F5F7",
        primary: "#D4AF37", primaryForeground: "#0F0F12", primarySoft: "#5C4A1A",
        secondary: "#22222A", accent: "#3A2F1A", muted: "#22222A", mutedForeground: "#A0A0AA",
        border: "#2A2A33", headerBg: "#0F0F12", footerBg: "#000000", footerFg: "#D4AF37",
        buttonBg: "#D4AF37", buttonFg: "#0F0F12", cardProductBg: "#1A1A1F",
        badgeMembership: "#D4AF37", badgeFlashSale: "#EF4444",
        adminSidebarBg: "#1A1A1F", adminSidebarActive: "#D4AF37",
      },
      typography: { fontHeading: "Playfair Display", fontBody: "DM Sans" },
      shape: { radius: 0.25, buttonStyle: "square", containerWidth: 1200 },
    }),
  },
  {
    id: "warm-earth",
    name: "Warm Earth",
    theme: withTheme({
      light: {
        background: "#FAF6F1", foreground: "#2A1810", card: "#FFFFFF", cardForeground: "#2A1810",
        primary: "#A0522D", primaryForeground: "#FFFFFF", primarySoft: "#E8C9A0",
        secondary: "#F0E3D3", accent: "#E8C9A0", muted: "#F0E3D3", mutedForeground: "#6B4E3D",
        border: "#E0CFB8", headerBg: "#FAF6F1", footerBg: "#2A1810", footerFg: "#FAF6F1",
        buttonBg: "#A0522D", buttonFg: "#FFFFFF", cardProductBg: "#FFFFFF",
        badgeMembership: "#A0522D", badgeFlashSale: "#C2410C",
        adminSidebarBg: "#FFFFFF", adminSidebarActive: "#A0522D",
      },
      typography: { fontHeading: "Lora", fontBody: "Manrope" },
      shape: { radius: 0.75, buttonStyle: "rounded", containerWidth: 1200 },
    }),
  },
  {
    id: "vibrant-pop",
    name: "Vibrant Pop",
    theme: withTheme({
      light: {
        background: "#FFFFFF", foreground: "#0A0A0A", card: "#FFFFFF", cardForeground: "#0A0A0A",
        primary: "#7C3AED", primaryForeground: "#FFFFFF", primarySoft: "#DDD6FE",
        secondary: "#F3E8FF", accent: "#E9D5FF", muted: "#F5F3FF", mutedForeground: "#6B7280",
        border: "#E5E7EB", headerBg: "#FFFFFF", footerBg: "#7C3AED", footerFg: "#FFFFFF",
        buttonBg: "#7C3AED", buttonFg: "#FFFFFF", cardProductBg: "#FFFFFF",
        badgeMembership: "#F59E0B", badgeFlashSale: "#EC4899",
        adminSidebarBg: "#FFFFFF", adminSidebarActive: "#7C3AED",
      },
      typography: { fontHeading: "Space Grotesk", fontBody: "Plus Jakarta Sans" },
      shape: { radius: 1.25, buttonStyle: "pill", containerWidth: 1280 },
    }),
  },
  {
    id: "ocean-fresh",
    name: "Ocean Fresh",
    theme: withTheme({
      light: {
        background: "#F0F9FF", foreground: "#0C2340", card: "#FFFFFF", cardForeground: "#0C2340",
        primary: "#0EA5E9", primaryForeground: "#FFFFFF", primarySoft: "#BAE6FD",
        secondary: "#E0F2FE", accent: "#7DD3FC", muted: "#E0F2FE", mutedForeground: "#475569",
        border: "#BAE6FD", headerBg: "#F0F9FF", footerBg: "#0C2340", footerFg: "#F0F9FF",
        buttonBg: "#0EA5E9", buttonFg: "#FFFFFF", cardProductBg: "#FFFFFF",
        badgeMembership: "#0EA5E9", badgeFlashSale: "#F43F5E",
        adminSidebarBg: "#FFFFFF", adminSidebarActive: "#0EA5E9",
      },
      typography: { fontHeading: "Outfit", fontBody: "DM Sans" },
      shape: { radius: 0.875, buttonStyle: "rounded", containerWidth: 1200 },
    }),
  },
];

// ───────────── Apply theme to DOM ─────────────
function setVar(name: string, value: string) {
  document.documentElement.style.setProperty(name, value);
}

export function applyTheme(theme: Theme, resolvedMode: "light" | "dark") {
  const c = resolvedMode === "dark" ? theme.dark : theme.light;
  setVar("--background", c.background);
  setVar("--foreground", c.foreground);
  setVar("--card", c.card);
  setVar("--card-foreground", c.cardForeground);
  setVar("--popover", c.card);
  setVar("--popover-foreground", c.cardForeground);
  setVar("--primary", c.primary);
  setVar("--primary-foreground", c.primaryForeground);
  setVar("--primary-soft", c.primarySoft);
  setVar("--secondary", c.secondary);
  setVar("--secondary-foreground", c.foreground);
  setVar("--accent", c.accent);
  setVar("--accent-foreground", c.foreground);
  setVar("--muted", c.muted);
  setVar("--muted-foreground", c.mutedForeground);
  setVar("--border", c.border);
  setVar("--input", c.border);
  setVar("--ring", c.primary);
  // Surface tokens (custom — used by components below)
  setVar("--header-bg", c.headerBg);
  setVar("--footer-bg", c.footerBg);
  setVar("--footer-fg", c.footerFg);
  setVar("--button-bg", c.buttonBg);
  setVar("--button-fg", c.buttonFg);
  setVar("--card-product-bg", c.cardProductBg);
  setVar("--badge-membership", c.badgeMembership);
  setVar("--badge-flash-sale", c.badgeFlashSale);
  setVar("--admin-sidebar-bg", c.adminSidebarBg);
  setVar("--admin-sidebar-active", c.adminSidebarActive);
  // Typography
  setVar("--font-display", `"${theme.typography.fontHeading}", system-ui, sans-serif`);
  setVar("--font-sans", `"${theme.typography.fontBody}", system-ui, sans-serif`);
  setVar("--size-h1", `${theme.typography.sizeH1}px`);
  setVar("--size-h2", `${theme.typography.sizeH2}px`);
  setVar("--size-h3", `${theme.typography.sizeH3}px`);
  setVar("--size-body", `${theme.typography.sizeBody}px`);
  // Shape
  setVar("--radius", `${theme.shape.radius}rem`);
  const btnRadius = theme.shape.buttonStyle === "pill" ? "9999px"
    : theme.shape.buttonStyle === "square" ? "0"
    : `${theme.shape.radius}rem`;
  setVar("--button-radius", btnRadius);
  setVar("--container-max", `${theme.shape.containerWidth}px`);
  // Background image
  if (theme.branding.backgroundUrl) {
    setVar("--bg-image", `url("${theme.branding.backgroundUrl}")`);
    document.documentElement.classList.add("has-bg-image");
  } else {
    setVar("--bg-image", "none");
    document.documentElement.classList.remove("has-bg-image");
  }
  // Mode class
  if (resolvedMode === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
}

export function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode === "auto") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

export function buildGoogleFontsUrl(fonts: string[]): string {
  const unique = Array.from(new Set(fonts.filter(Boolean)));
  if (!unique.length) return "";
  const families = unique.map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700;800`).join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
