// Helpers for Indonesian date/time UX (DD/MM/YYYY HH:mm)

const pad = (n: number) => String(n).padStart(2, "0");

/** Format a Date or ISO string as "DD/MM/YYYY HH:mm" in local time. */
export function formatIdDateTime(input: Date | string | null | undefined): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse "DD/MM/YYYY HH:mm" (or "DD/MM/YYYY") into a Date. Returns null on invalid. */
export function parseIdDateTime(value: string): Date | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, mi] = m;
  const d = new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    hh ? Number(hh) : 0,
    mi ? Number(mi) : 0,
    0,
    0,
  );
  if (
    d.getFullYear() !== Number(yyyy) ||
    d.getMonth() !== Number(mm) - 1 ||
    d.getDate() !== Number(dd)
  ) return null;
  return d;
}

/** Parse to ISO string for DB storage. */
export function idToIso(value: string): string | null {
  const d = parseIdDateTime(value);
  return d ? d.toISOString() : null;
}

/** Add minutes to a base date (or now) and return formatted Indonesian string. */
export function addMinutesId(baseValue: string, minutes: number): string {
  const base = parseIdDateTime(baseValue) ?? new Date();
  return formatIdDateTime(new Date(base.getTime() + minutes * 60_000));
}

export function nowId(): string {
  return formatIdDateTime(new Date());
}

/** Long Indonesian date e.g. "16 Juni 2026". */
const ID_MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
export function formatIdLongDate(input: Date | string | null | undefined): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${ID_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Countdown like "2 Hari 5 Jam" or "5 Jam 12 Menit" or "12 Menit". */
export function formatCountdown(target: Date | string | null | undefined, now: Date = new Date()): string {
  if (!target) return "";
  const t = typeof target === "string" ? new Date(target) : target;
  if (Number.isNaN(t.getTime())) return "";
  let diff = Math.max(0, Math.floor((t.getTime() - now.getTime()) / 1000));
  if (diff <= 0) return "Berakhir";
  const days = Math.floor(diff / 86400); diff -= days * 86400;
  const hours = Math.floor(diff / 3600); diff -= hours * 3600;
  const minutes = Math.floor(diff / 60);
  if (days > 0) return `${days} Hari ${hours} Jam`;
  if (hours > 0) return `${hours} Jam ${minutes} Menit`;
  if (minutes > 0) return `${minutes} Menit`;
  return "<1 Menit";
}

/** Voucher status derived from current time. */
export type VoucherStatus = "active" | "scheduled" | "expired" | "inactive";
export function deriveVoucherStatus(opts: {
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  now?: Date;
}): VoucherStatus {
  const now = opts.now ?? new Date();
  if (!opts.is_active) return "inactive";
  if (opts.starts_at && new Date(opts.starts_at) > now) return "scheduled";
  if (opts.expires_at && new Date(opts.expires_at) <= now) return "expired";
  return "active";
}
