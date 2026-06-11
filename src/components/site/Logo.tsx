import { Link } from "@tanstack/react-router";
import { useSiteSettings } from "@/lib/site-settings";

export function Logo({ className = "" }: { className?: string }) {
  const { data } = useSiteSettings();
  const brand = data?.brand;
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      {brand?.logo_url ? (
        <img src={brand.logo_url} alt={brand.name} className="h-9 w-9 rounded-full object-cover" />
      ) : (
        <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground font-display text-lg font-bold">
          T
        </span>
      )}
      <span className="font-display text-xl font-bold tracking-tight">
        {brand?.name ?? "Toko Serba"}
      </span>
    </Link>
  );
}
