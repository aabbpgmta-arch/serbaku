import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/datetime-id";

interface Props {
  target: string | Date | null | undefined;
  prefix?: string;
  className?: string;
}

/** Live-updating countdown text "Berakhir dalam: X Hari Y Jam". */
export function VoucherCountdown({ target, prefix = "Berakhir dalam:", className }: Props) {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!target) return null;
  const text = formatCountdown(target, now);
  return <span className={className}>{prefix} <strong>{text}</strong></span>;
}
