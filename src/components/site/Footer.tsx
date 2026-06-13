import { Link } from "@tanstack/react-router";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { Logo } from "./Logo";
import { SocialLinks } from "./SocialLinks";
import { useSiteSettings } from "@/lib/site-settings";

export function Footer() {
  const { data } = useSiteSettings();
  const c = data?.contact;
  const f = data?.footer;
  return (
    <footer className="mt-24 border-t border-border/60 bg-card/60">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-md text-sm text-muted-foreground">{f?.description}</p>

        </div>
        <div>
          <h3 className="font-display text-base font-semibold">Menu</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-primary">Beranda</Link></li>
            <li><Link to="/katalog" className="hover:text-primary">Katalog</Link></li>
            <li><Link to="/keranjang" className="hover:text-primary">Keranjang</Link></li>
            <li><Link to="/akun/pesanan" className="hover:text-primary">Akun</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-display text-base font-semibold">Kontak</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {c?.whatsapp && (
              <li className="flex items-start gap-2"><MessageCircle className="mt-0.5 h-4 w-4" />{c.whatsapp}</li>
            )}
            {c?.email && (
              <li className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4" />{c.email}</li>
            )}
            {c?.address && (
              <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4" />{c.address}</li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="container-page py-4 text-center text-xs text-muted-foreground">{f?.copyright}</div>
      </div>
    </footer>
  );
}
