/**
 * Helpers untuk input numerik (harga & stok).
 * - Hanya angka, tidak ada minus, tidak ada exponent.
 * - Hapus leading zero.
 * - NaN / kosong -> 0.
 */
export function normalizeNonNegativeInt(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;
  const raw = String(input).replace(/[^\d]/g, "");
  if (!raw) return 0;
  const stripped = raw.replace(/^0+(?=\d)/, "");
  const n = parseInt(stripped || "0", 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** onKeyDown handler untuk blokir karakter non-digit. */
export function blockNonNumericKeys(e: React.KeyboardEvent<HTMLInputElement>) {
  if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
    e.preventDefault();
  }
}
