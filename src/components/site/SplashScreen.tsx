import { useEffect, useState } from "react";
import { useSiteSettings } from "@/lib/site-settings";

const KEY = "serbaku-splash-shown-v1";

/**
 * Lightweight splash overlay shown once per browser session.
 * Uses admin brand logo when available, falls back to /icon-512.png.
 * Hidden automatically on /admin, /auth and on any non-standalone non-mobile
 * context so it never disrupts the desktop web flow.
 */
export function SplashScreen() {
  const { data } = useSiteSettings();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(KEY)) return;
    } catch {}
    const path = window.location.pathname;
    if (path.startsWith("/admin") || path.startsWith("/auth")) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      try { sessionStorage.setItem(KEY, "1"); } catch {}
    }, 1100);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const logo = data?.brand?.logo_url || "/icon-512.png";
  const name = data?.brand?.name || "SERBAKU";

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-background animate-in fade-in duration-300"
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-4">
        <img
          src={logo}
          alt={name}
          width={120}
          height={120}
          className="h-28 w-28 rounded-3xl object-contain shadow-elegant"
        />
        <div className="font-display text-xl font-semibold tracking-wide text-primary">{name}</div>
        <div className="mt-2 h-1 w-24 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
