import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { siteSettingsDefaults } from "@/lib/site-settings";

export const Route = createFileRoute("/_authenticated/_admin/admin/pengaturan")({
  head: () => ({ meta: [{ title: "Pengaturan Website — Toko Serba" }, { name: "robots", content: "noindex" }] }),
  component: AdminSettings,
});

function AdminSettings() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Pengaturan Website</h1>
      <p className="mt-1 text-sm text-muted-foreground">Atur tampilan homepage tanpa edit kode.</p>

      <Tabs defaultValue="brand" className="mt-6">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="brand">Brand</TabsTrigger>
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="contact">Kontak</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
          <TabsTrigger value="sections">Keunggulan</TabsTrigger>
          <TabsTrigger value="categories">Kategori</TabsTrigger>
          <TabsTrigger value="testimonials">Testimoni</TabsTrigger>
        </TabsList>
        <TabsContent value="brand"><SettingForm settingKey="brand" fields={["name", "logo_url", "favicon_url"]} /></TabsContent>
        <TabsContent value="hero"><SettingForm settingKey="hero" fields={["headline", "subheadline", "cta_text", "cta_link", "image_url", "image_url_2", "image_url_3", "image_url_4"]} multiline={["headline","subheadline"]} /></TabsContent>
        <TabsContent value="contact"><SettingForm settingKey="contact" fields={["whatsapp", "email", "address", "instagram", "tiktok", "shopee"]} /></TabsContent>
        <TabsContent value="footer"><SettingForm settingKey="footer" fields={["description", "copyright"]} multiline={["description"]} /></TabsContent>
        <TabsContent value="sections"><SectionsEditor /></TabsContent>
        <TabsContent value="categories"><CategoriesEditor /></TabsContent>
        <TabsContent value="testimonials"><TestimonialsEditor /></TabsContent>
      </Tabs>
    </div>
  );
}

function SettingForm({ settingKey, fields, multiline = [] }: { settingKey: string; fields: string[]; multiline?: string[] }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["setting", settingKey],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", settingKey).maybeSingle();
      const defaults = (siteSettingsDefaults() as unknown as Record<string, Record<string, string>>)[settingKey] ?? {};
      return { ...defaults, ...((data?.value as Record<string, string>) ?? {}) };
    },
  });
  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => { if (data) setForm(data); }, [data]);

  async function save() {
    const { error } = await supabase.from("site_settings").upsert({ key: settingKey, value: form });
    if (error) toast.error(error.message); else { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["site_settings"] }); qc.invalidateQueries({ queryKey: ["setting", settingKey] }); }
  }

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-border/60 bg-card p-5">
      {fields.map((f) => (
        <div key={f}>
          <Label className="capitalize">{f.replace(/_/g, " ")}</Label>
          {multiline.includes(f)
            ? <Textarea rows={3} value={form[f] ?? ""} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
            : <Input value={form[f] ?? ""} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />}
        </div>
      ))}
      <Button onClick={save}>Simpan</Button>
    </div>
  );
}

function SectionsEditor() {
  return <CrudList table="homepage_sections" fields={[
    { name: "title", label: "Judul" },
    { name: "description", label: "Deskripsi", multiline: true },
    { name: "icon", label: "Icon (tag, package, users, truck, sparkles, star)" },
    { name: "sort_order", label: "Urutan", type: "number" },
  ]} />;
}
function CategoriesEditor() {
  return <CrudList table="website_categories" fields={[
    { name: "name", label: "Nama" },
    { name: "description", label: "Deskripsi", multiline: true },
    { name: "image_url", label: "Gambar URL" },
    { name: "link", label: "Link" },
    { name: "sort_order", label: "Urutan", type: "number" },
  ]} />;
}
function TestimonialsEditor() {
  return <CrudList table="testimonials" fields={[
    { name: "name", label: "Nama" },
    { name: "role", label: "Peran" },
    { name: "message", label: "Pesan", multiline: true },
    { name: "avatar_url", label: "Avatar URL" },
    { name: "rating", label: "Rating (1-5)", type: "number" },
    { name: "sort_order", label: "Urutan", type: "number" },
  ]} />;
}

type FieldDef = { name: string; label: string; multiline?: boolean; type?: string };
function CrudList({ table, fields }: { table: "homepage_sections" | "website_categories" | "testimonials"; fields: FieldDef[] }) {
  const qc = useQueryClient();
  const { data: rows } = useQuery({
    queryKey: ["cms", table],
    queryFn: async () => {
      const { data } = await supabase.from(table).select("*").order("sort_order");
      return (data ?? []) as Array<Record<string, unknown>>;
    },
  });
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [open, setOpen] = useState(false);

  async function del(id: string) {
    if (!confirm("Hapus item?")) return;
    await supabase.from(table).delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["cms", table] });
  }
  async function toggle(id: string, current: boolean) {
    await supabase.from(table).update({ is_active: !current }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["cms", table] });
  }

  return (
    <div className="mt-4">
      <div className="mb-3 flex justify-end">
        <Button size="sm" className="gap-1" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-3.5 w-3.5" /> Tambah</Button>
      </div>
      <div className="space-y-2">
        {(rows ?? []).map((r) => (
          <div key={r.id as string} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
            <div className="flex-1">
              <p className="text-sm font-medium">{(r.title as string) ?? (r.name as string) ?? (r.message as string)?.slice(0, 60)}</p>
              <p className="text-xs text-muted-foreground">Urutan {r.sort_order as number} · {r.is_active ? "Aktif" : "Nonaktif"}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => toggle(r.id as string, r.is_active as boolean)}>{r.is_active ? "Nonaktifkan" : "Aktifkan"}</Button>
            <Button variant="ghost" size="sm" onClick={() => { setEditing(r); setOpen(true); }}>Edit</Button>
            <Button variant="ghost" size="icon" onClick={() => del(r.id as string)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
        {(rows ?? []).length === 0 && <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">Belum ada item.</p>}
      </div>

      {open && <CrudDialog table={table} fields={fields} initial={editing} onClose={() => setOpen(false)} />}
    </div>
  );
}

function CrudDialog({ table, fields, initial, onClose }: { table: "homepage_sections" | "website_categories" | "testimonials"; fields: FieldDef[]; initial: Record<string, unknown> | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string | number>>(() => {
    const init: Record<string, string | number> = {};
    fields.forEach((f) => { init[f.name] = (initial?.[f.name] as string | number) ?? (f.type === "number" ? 0 : ""); });
    return init;
  });

  async function save() {
    const payload = { ...form, is_active: (initial?.is_active as boolean | undefined) ?? true } as Record<string, unknown>;
    const client = supabase.from(table) as unknown as {
      update: (p: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<unknown> };
      insert: (p: Record<string, unknown>) => Promise<unknown>;
    };
    if (initial?.id) {
      await client.update(payload).eq("id", initial.id as string);
    } else {
      await client.insert(payload);
    }
    toast.success("Tersimpan");
    qc.invalidateQueries({ queryKey: ["cms", table] });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-elegant" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-semibold">{initial ? "Edit" : "Tambah"}</h3>
        <div className="mt-4 space-y-3">
          {fields.map((f) => (
            <div key={f.name}>
              <Label>{f.label}</Label>
              {f.multiline
                ? <Textarea rows={3} value={String(form[f.name] ?? "")} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
                : <Input type={f.type ?? "text"} value={String(form[f.name] ?? "")} onChange={(e) => setForm({ ...form, [f.name]: f.type === "number" ? Number(e.target.value) : e.target.value })} />}
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save}>Simpan</Button>
        </div>
      </div>
    </div>
  );
}
