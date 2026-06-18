import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type TablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  itemLabel?: string; // e.g. "produk"
};

export function TablePagination({ page, pageSize, total, onPageChange, onPageSizeChange, itemLabel = "data" }: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(total, safePage * pageSize);

  // Build compact page numbers: 1 ... (p-1) p (p+1) ... last
  const pages: (number | "…")[] = [];
  const push = (n: number | "…") => pages.push(n);
  const window = new Set<number>([1, totalPages, safePage - 1, safePage, safePage + 1]);
  const sorted = Array.from(window).filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  let prev = 0;
  for (const n of sorted) {
    if (prev && n - prev > 1) push("…");
    push(n);
    prev = n;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3 text-xs">
      <div className="text-muted-foreground">
        {total === 0 ? `Tidak ada ${itemLabel}` : <>Menampilkan <b>{from}</b>–<b>{to}</b> dari <b>{total}</b> {itemLabel}</>}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Per halaman</span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-2 flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-8 gap-1 px-2" disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)}>
            <ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya
          </Button>
          {pages.map((p, i) =>
            p === "…" ? (
              <span key={`e${i}`} className="px-1 text-muted-foreground">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`h-8 min-w-8 rounded-md px-2 text-xs font-semibold transition ${p === safePage ? "bg-primary text-primary-foreground" : "border border-border bg-card hover:bg-muted"}`}
              >
                {p}
              </button>
            ),
          )}
          <Button variant="outline" size="sm" className="h-8 gap-1 px-2" disabled={safePage >= totalPages} onClick={() => onPageChange(safePage + 1)}>
            Berikutnya <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
