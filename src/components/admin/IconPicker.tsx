import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ICON_NAMES, getIcon } from "@/lib/icon-map";
import { cn } from "@/lib/utils";

interface IconPickerProps {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
}

export function IconPicker({ value, onChange, placeholder = "Pilih icon..." }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const SelectedIcon = getIcon(value);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return ICON_NAMES;
    return ICON_NAMES.filter((n) => n.includes(needle));
  }, [q]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" className="w-full justify-between font-normal">
          <span className="flex items-center gap-2 truncate">
            <SelectedIcon className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{value || placeholder}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari icon..."
            className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
            autoFocus
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">Tidak ditemukan</p>
          )}
          <div className="grid grid-cols-1 gap-0.5">
            {filtered.map((name) => {
              const Icon = getIcon(name);
              const selected = name === value;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => { onChange(name); setOpen(false); setQ(""); }}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                    selected && "bg-accent",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="flex-1 truncate font-mono text-xs">{name}</span>
                  {selected && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
