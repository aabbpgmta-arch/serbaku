import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/favicon.ico")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { data: brandRow } = await supabase
            .from("site_settings").select("value").eq("key", "brand").maybeSingle();
          const { data: themeRow } = await supabase
            .from("site_settings").select("value").eq("key", "theme_active").maybeSingle();

          const brand = brandRow?.value as { favicon_url?: string | null } | null;
          const theme = themeRow?.value as { branding?: { faviconUrl?: string | null } } | null;
          const url = brand?.favicon_url || theme?.branding?.faviconUrl;

          if (url) {
            return new Response(null, {
              status: 302,
              headers: {
                Location: url,
                "Cache-Control": "public, max-age=3600",
              },
            });
          }
        } catch (e) {
          console.error("[favicon.ico] lookup failed", e);
        }
        return new Response(null, { status: 404 });
      },
    },
  },
});
