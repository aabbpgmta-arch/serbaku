import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BrandSettings = { name: string; logo_url: string | null; favicon_url: string | null };
export type ContactSettings = {
  whatsapp: string;
  email: string;
  address: string;
  instagram?: string;
  tiktok?: string;
  shopee?: string;
};
export type HeroSettings = {
  headline: string;
  subheadline: string;
  cta_text: string;
  cta_link: string;
  image_url: string | null;
  image_url_2: string | null;
  image_url_3: string | null;
  image_url_4: string | null;
};
export type FooterSettings = { description: string; copyright: string };
export type ThemeSettings = { primary: string; accent: string; background: string; foreground: string };
export type PaymentSettings = {
  bank_name: string;
  account_holder: string;
  account_number: string;
  bank_logo_url: string;
};

export type SiteSettings = {
  brand: BrandSettings;
  contact: ContactSettings;
  hero: HeroSettings;
  footer: FooterSettings;
  theme: ThemeSettings;
  payment: PaymentSettings;
};

const DEFAULTS: SiteSettings = {
  brand: { name: "Toko Serba", logo_url: null, favicon_url: null },
  contact: {
    whatsapp: "6282130007881",
    email: "halo@tokoserba.id",
    address: "Indonesia",
  },
  hero: {
    headline: "Supplier Produk Serba 35 & Serba 75",
    subheadline: "Modal Kecil, Untung Lebih Besar",
    cta_text: "Lihat Katalog",
    cta_link: "/katalog",
    image_url: null,
    image_url_2: null,
    image_url_3: null,
    image_url_4: null,
  },
  footer: {
    description: "Toko Serba — supplier grosir produk Serba 35 & Serba 75 untuk reseller di seluruh Indonesia.",
    copyright: "© 2026 Toko Serba",
  },
  theme: { primary: "#D96C9F", accent: "#F8BBD9", background: "#FFF7F0", foreground: "#1F1F1F" },
};

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site_settings"],
    queryFn: async (): Promise<SiteSettings> => {
      const { data } = await supabase.from("site_settings").select("key,value");
      const map = new Map((data ?? []).map((r) => [r.key, r.value as unknown]));
      return {
        brand: { ...DEFAULTS.brand, ...(map.get("brand") as object | undefined) } as BrandSettings,
        contact: { ...DEFAULTS.contact, ...(map.get("contact") as object | undefined) } as ContactSettings,
        hero: { ...DEFAULTS.hero, ...(map.get("hero") as object | undefined) } as HeroSettings,
        footer: { ...DEFAULTS.footer, ...(map.get("footer") as object | undefined) } as FooterSettings,
        theme: { ...DEFAULTS.theme, ...(map.get("theme") as object | undefined) } as ThemeSettings,
      };
    },
    staleTime: 60_000,
  });
}

export function siteSettingsDefaults(): SiteSettings {
  return DEFAULTS;
}
