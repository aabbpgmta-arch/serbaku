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
  dibatalkan: "bg-rose-100 text-rose-800",
};

export const STATUS_ORDER = ["menunggu_pembayaran", "diproses", "dikirim", "selesai", "dibatalkan"] as const;
