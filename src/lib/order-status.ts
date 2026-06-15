export const STATUS_LABEL: Record<string, string> = {
  menunggu_pembayaran: "Menunggu Pembayaran",
  diproses: "Diproses",
  dikirim: "Dikirim",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export const STATUS_COLOR: Record<string, string> = {
  menunggu_pembayaran: "bg-amber-100 text-amber-800",
  diproses: "bg-blue-100 text-blue-800",
  dikirim: "bg-indigo-100 text-indigo-800",
  selesai: "bg-emerald-100 text-emerald-800",
  dibatalkan: "bg-red-100 text-red-800",
};

export const STATUS_ORDER = [
  "menunggu_pembayaran",
  "diproses",
  "dikirim",
  "selesai",
  "dibatalkan",
] as const;

export type OrderStatus = (typeof STATUS_ORDER)[number];

/**
 * Allowed forward transitions. Mirrors the DB trigger
 * `tg_orders_validate_status_transition` so the UI never offers an option
 * the server will reject.
 */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  menunggu_pembayaran: ["diproses", "dibatalkan"],
  diproses: ["dikirim", "dibatalkan"],
  dikirim: ["selesai"],
  selesai: [],
  dibatalkan: [],
};

export function nextStatuses(current: string): OrderStatus[] {
  return TRANSITIONS[current as OrderStatus] ?? [];
}

export function isFinalStatus(s: string): boolean {
  return s === "selesai" || s === "dibatalkan";
}
