/**
 * Helpers untuk input numerik (harga, stok, diskon).
 * - Hanya angka 0-9, tidak ada minus, exponent, titik, koma, atau spasi.
 * - Hapus leading zero saat user mengetik.
 * - Kosong/NaN/negatif -> 0 saat normalize untuk simpan.
 */

/**
 * Sanitasi nilai input numerik secara real-time (string in -> string out).
 * - "025000" -> "25000"
 * - "098"    -> "98"
 * - "000"    -> "0"
 * - ""       -> ""  (biarkan kosong supaya placeholder "0" muncul)
 * - "abc12"  -> "12"
 */
export function sanitizeIntInput(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return "";
  const digits = String(input).replace(/[^\d]/g, "");
  if (!digits) return "";
  const stripped = digits.replace(/^0+(?=\d)/, "");
  return stripped === "" ? "0" : stripped;
}

/**
 * Nilai awal untuk field input numerik dari data DB.
 * Nilai 0 / null / undefined dianggap "kosong" supaya placeholder "0" muncul.
 */
export function toIntInputValue(input: string | number | null | undefined): string {
  if (input === null || input === undefined || input === "" || Number(input) === 0) return "";
  return sanitizeIntInput(input);
}

/** Normalisasi final saat simpan: selalu integer >= 0. */
export function normalizeNonNegativeInt(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;
  const raw = String(input).replace(/[^\d]/g, "");
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** onKeyDown handler untuk blokir karakter non-digit. */
export function blockNonNumericKeys(e: React.KeyboardEvent<HTMLInputElement>) {
  if (["e", "E", "+", "-", ".", ",", " "].includes(e.key)) {
    e.preventDefault();
  }
}
