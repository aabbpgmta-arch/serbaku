import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatIdDateTime, parseIdDateTime, addMinutesId, nowId } from "@/lib/datetime-id";
import { Clock } from "lucide-react";

interface Props {
  label: string;
  value: string; // "DD/MM/YYYY HH:mm"
  onChange: (v: string) => void;
  error?: string;
  showNow?: boolean;
  quickDurations?: Array<{ label: string; minutes: number }>;
  /** When durations are clicked, they offset from this base value. */
  durationBase?: string;
  hint?: string;
}

export const DEFAULT_QUICK_DURATIONS = [
  { label: "30 Menit", minutes: 30 },
  { label: "1 Jam", minutes: 60 },
  { label: "6 Jam", minutes: 60 * 6 },
  { label: "12 Jam", minutes: 60 * 12 },
  { label: "1 Hari", minutes: 60 * 24 },
  { label: "3 Hari", minutes: 60 * 24 * 3 },
  { label: "7 Hari", minutes: 60 * 24 * 7 },
  { label: "30 Hari", minutes: 60 * 24 * 30 },
];

export function IdDateTimeInput({ label, value, onChange, error, showNow, quickDurations, durationBase, hint }: Props) {
  const parsed = parseIdDateTime(value);
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-1.5">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="DD/MM/YYYY HH:mm"
          className="font-mono"
        />
        {showNow && (
          <Button type="button" variant="outline" size="sm" onClick={() => onChange(nowId())} className="shrink-0 gap-1">
            <Clock className="h-3.5 w-3.5" /> Sekarang
          </Button>
        )}
      </div>
      {value && !parsed && (
        <p className="mt-1 text-xs text-destructive">Format harus DD/MM/YYYY HH:mm</p>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      {!error && parsed && (
        <p className="mt-1 text-xs text-muted-foreground">{formatIdDateTime(parsed)}</p>
      )}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {quickDurations && quickDurations.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {quickDurations.map((q) => (
            <Button
              key={q.label}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onChange(addMinutesId(durationBase ?? nowId(), q.minutes))}
            >
              +{q.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
