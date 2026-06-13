import { Heart } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useWishlistIds, useToggleWishlist } from "@/lib/wishlist";
import { cn } from "@/lib/utils";

type Props = {
  productId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "floating" | "inline";
};

export function WishlistButton({ productId, className, size = "md", variant = "floating" }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: ids } = useWishlistIds();
  const toggle = useToggleWishlist();
  const isOn = ids?.has(productId) ?? false;
  const sz = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const ic = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-5 w-5" : "h-4 w-4";

  return (
    <button
      type="button"
      aria-label={isOn ? "Hapus dari wishlist" : "Tambah ke wishlist"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
          navigate({ to: "/auth", search: { redirect: window.location.pathname } as never });
          return;
        }
        toggle.mutate({ productId, isOn });
      }}
      disabled={toggle.isPending}
      className={cn(
        "grid place-items-center rounded-full transition disabled:opacity-50",
        sz,
        variant === "floating"
          ? "bg-background/90 shadow-md backdrop-blur hover:bg-background"
          : "border border-border bg-card hover:bg-accent",
        className,
      )}
    >
      <Heart className={cn(ic, isOn ? "fill-rose-500 stroke-rose-500" : "stroke-foreground/70")} />
    </button>
  );
}
