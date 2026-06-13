import { useEffect, useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import { useSalesTicker } from "@/lib/homepage-stats";

function timeAgo(iso: string): string {
  const sec = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec} dtk lalu`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return `${d} hari lalu`;
}

export function SocialProofTicker() {
  const { data: items } = useSalesTicker(12);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (!items || items.length === 0) return;
    setVisible(true);
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % items.length);
        setVisible(true);
      }, 350);
    }, 5000);
    return () => clearInterval(cycle);
  }, [items]);

  if (closed || !items || items.length === 0) return null;
  const it = items[idx];
  if (!it) return null;
  const productLabel = it.product_name ? `${it.qty} pcs ${it.product_name}` : `${it.qty} pcs`;

  return (
    <div
      className={`pointer-events-auto fixed bottom-4 left-4 z-40 max-w-[92vw] sm:max-w-sm transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/95 p-3 pr-2 shadow-elegant backdrop-blur">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft/60 text-primary">
          <ShoppingBag className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 text-sm">
          <div className="font-medium leading-tight">
            Reseller {it.city || "Indonesia"}
          </div>
          <div className="truncate text-muted-foreground">
            membeli {productLabel}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground/80">{timeAgo(it.created_at)}</div>
        </div>
        <button
          onClick={() => setClosed(true)}
          aria-label="Tutup"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
