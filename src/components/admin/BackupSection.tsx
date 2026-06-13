import { useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Download, Database, Users, ShoppingBag, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { logAction } from "@/lib/audit";

type Kind = "produk" | "pelanggan" | "pesanan" | "all";

export function BackupSection() {
  const [busy, setBusy] = useState<Kind | null>(null);

  async function exportData(kind: Kind) {
    setBusy(kind);
    try {
      const wb = XLSX.utils.book_new();
      const stamp = new Date().toISOString().slice(0, 10);

      if (kind === "produk" || kind === "all") {
        const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data ?? []), "Produk");
      }
      if (kind === "pelanggan" || kind === "all") {
        const { data } = await supabase.from("profiles").select("id, email, full_name, whatsapp, city, membership_tier, lifetime_spend, created_at").order("created_at", { ascending: false });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data ?? []), "Pelanggan");
      }
      if (kind === "pesanan" || kind === "all") {
        const { data: orders } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orders ?? []), "Pesanan");
        const { data: items } = await supabase.from("order_items").select("*");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(items ?? []), "Item Pesanan");
      }

      XLSX.writeFile(wb, `backup-${kind}-${stamp}.xlsx`);
      await logAction("backup_export", "backup", null, { kind });
      toast.success("Backup berhasil diunduh");
    } catch (e) {
      toast.error("Gagal membuat backup");
      console.error(e);
    } finally {
      setBusy(null);
    }
  }

  const items: Array<{ kind: Kind; label: string; desc: string; icon: typeof Package }> = [
    { kind: "produk", label: "Produk", desc: "Semua data produk, harga, stok, dan badge.", icon: Package },
    { kind: "pelanggan", label: "Pelanggan", desc: "Profil pelanggan, membership tier, dan lifetime spend.", icon: Users },
    { kind: "pesanan", label: "Pesanan", desc: "Semua pesanan beserta item pesanannya.", icon: ShoppingBag },
    { kind: "all", label: "Backup Lengkap", desc: "Produk, pelanggan, pesanan dalam satu file.", icon: Database },
  ];

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-muted-foreground">
        Unduh data toko dalam format XLSX. Simpan rutin sebagai cadangan offline.
      </p>
      {items.map(({ kind, label, desc, icon: Icon }) => (
        <div key={kind} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
          <Icon className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
          <Button size="sm" disabled={busy !== null} onClick={() => exportData(kind)} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            {busy === kind ? "Mengunduh..." : "Unduh"}
          </Button>
        </div>
      ))}
    </div>
  );
}
