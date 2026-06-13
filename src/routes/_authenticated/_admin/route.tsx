import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_admin")({
  beforeLoad: async ({ context }) => {
    const userId = (context as { user?: { id: string } }).user?.id;
    if (!userId) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!data) throw redirect({ to: "/" });
  },
  component: AdminShell,
});

import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Package, ShoppingBag, Users, Settings, Tag } from "lucide-react";

const items = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/produk", label: "Produk", icon: Package },
  { to: "/admin/pesanan", label: "Pesanan", icon: ShoppingBag },
  { to: "/admin/pelanggan", label: "Pelanggan", icon: Users },
  { to: "/admin/voucher", label: "Voucher", icon: Tag },
  { to: "/admin/pengaturan", label: "Pengaturan", icon: Settings },
];

function AdminShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="container-page py-8">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit rounded-2xl border border-border/60 bg-card p-3">
          <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin</p>
          {items.map((i) => {
            const active = i.exact ? path === i.to : path.startsWith(i.to);
            const Icon = i.icon;
            return (
              <Link key={i.to} to={i.to} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${active ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                <Icon className="h-4 w-4" /> {i.label}
              </Link>
            );
          })}
        </aside>
        <div className="min-w-0"><Outlet /></div>
      </div>
    </div>
  );
}
