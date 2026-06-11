import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { roundToSix } from "./format";

export type CartItem = {
  productId: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  qty: number;
  stock: number;
};

type CartCtx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  totalQty: number;
  subtotal: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "toko-serba-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      add: (it, qty = 6) => {
        const q = roundToSix(qty);
        setItems((prev) => {
          const exist = prev.find((p) => p.productId === it.productId);
          if (exist) {
            return prev.map((p) =>
              p.productId === it.productId
                ? { ...p, qty: Math.min(roundToSix(p.qty + q), Math.max(6, p.stock - (p.stock % 6) || p.stock)) }
                : p,
            );
          }
          return [...prev, { ...it, qty: q }];
        });
      },
      setQty: (productId, qty) =>
        setItems((prev) =>
          prev.map((p) => (p.productId === productId ? { ...p, qty: roundToSix(qty) } : p)),
        ),
      remove: (productId) => setItems((prev) => prev.filter((p) => p.productId !== productId)),
      clear: () => setItems([]),
      totalQty: items.reduce((s, i) => s + i.qty, 0),
      subtotal: items.reduce((s, i) => s + i.qty * i.price, 0),
    }),
    [items],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used within CartProvider");
  return v;
}
