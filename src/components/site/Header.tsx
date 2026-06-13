import { Link } from "@tanstack/react-router";
import { ShoppingBag, User as UserIcon, Menu, X, LayoutDashboard, LogOut, Sun, Moon, Monitor } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { useThemeMode } from "@/components/site/ThemeProvider";

const nav = [
  { to: "/", label: "Beranda" },
  { to: "/katalog", label: "Katalog" },
  { to: "/flash-sale", label: "Flash Sale" },
  { to: "/katalog?cat=serba_35", label: "Serba 35" },
  { to: "/katalog?cat=serba_75", label: "Serba 75" },
];

export function Header() {
  const { totalQty } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-sm font-medium text-foreground/75 transition hover:text-primary"
              activeProps={{ className: "text-primary" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link to="/admin" className="hidden md:inline-flex">
              <Button variant="outline" size="sm" className="gap-1.5">
                <LayoutDashboard className="h-4 w-4" /> Admin
              </Button>
            </Link>
          )}
          <Link to="/keranjang" className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-accent">
            <ShoppingBag className="h-5 w-5" />
            {totalQty > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {totalQty}
              </span>
            )}
          </Link>
          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/akun/pesanan">
                <Button variant="ghost" size="sm" className="gap-1.5"><UserIcon className="h-4 w-4" /> Akun</Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => signOut()} aria-label="Keluar">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Link to="/auth" className="hidden md:inline-flex">
              <Button size="sm">Masuk</Button>
            </Link>
          )}

          <button className="grid h-10 w-10 place-items-center rounded-full hover:bg-accent md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-accent">
                {n.label}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-semibold text-primary hover:bg-accent">
                Dashboard Admin
              </Link>
            )}
            {user ? (
              <>
                <Link to="/akun/pesanan" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-accent">Akun Saya</Link>
                <button onClick={() => { signOut(); setOpen(false); }} className="rounded-md px-3 py-2 text-left text-sm hover:bg-accent">Keluar</button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-semibold text-primary hover:bg-accent">Masuk / Daftar</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
