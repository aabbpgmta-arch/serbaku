import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, Heart, ClipboardList, User } from "lucide-react";

const items = [
  { to: "/" as const, label: "Home", icon: Home, exact: true },
  { to: "/katalog" as const, label: "Katalog", icon: LayoutGrid },
  { to: "/akun/wishlist" as const, label: "Wishlist", icon: Heart },
  { to: "/akun/pesanan" as const, label: "Pesanan", icon: ClipboardList },
  { to: "/auth" as const, label: "Akun", icon: User },
];

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Hide on admin, auth, checkout — keep customer flow surfaces only.
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/reseller") ||
    pathname.startsWith("/checkout")
  ) {
    return null;
  }

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
          return (
            <li key={to}>
              <Link
                to={to}
                className={
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition " +
                  (active ? "text-primary" : "text-muted-foreground hover:text-foreground")
                }
              >
                <Icon className={"h-5 w-5 " + (active ? "fill-primary/10" : "")} strokeWidth={active ? 2.4 : 1.8} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
