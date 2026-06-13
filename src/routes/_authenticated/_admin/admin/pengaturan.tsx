import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Star, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { siteSettingsDefaults } from "@/lib/site-settings";
import { ImageUpload, MultiImageUpload, type ResizePreset } from "@/components/admin/ImageUpload";
import type { Json } from "@/integrations/supabase/types";
import { BackupSection } from "@/components/admin/BackupSection";

export const Route = createFileRoute("/_authenticated/_admin/admin/pengaturan")({
  head: () => ({ meta: [{ title: "Pengaturan Website — Toko Serba" }, { name: "robots", content: "noindex" }] }),
  component: AdminSettings,
});

// Field config: which fields are images, with preset + folder
type ImgFieldCfg = { preset: ResizePreset; folder: string };
const IMAGE_FIELDS: Record<string, ImgFieldCfg> = {
  logo_url: { preset: "logo", folder: "brand" },
  favicon_url: { preset: "favicon", folder: "brand" },
  image_url: { preset: "hero", folder: "hero" },
  image_url_2: { preset: "hero", folder: "hero" },
  image_url_3: { preset: "hero", folder: "hero" },
  image_url_4: { preset: "hero", folder: "hero" },
  bank_logo_url: { preset: "logo", folder: "payment" },
};

function fieldLabel(name: string) {
  const map: Record<string, string> = {
    logo_url: "Logo",
    favicon_url: "Favicon",
    image_url: "Hero Banner 1",
    image_url_2: "Hero Banner 2",
    image_url_3: "Hero Banner 3",
    image_url_4: "Hero Banner 4",
    bank_logo_url: "Logo Bank",
    whatsapp: "WhatsApp",
    name: "Nama",
    headline: "Headline",
    subheadline: "Subheadline",
    cta_text: "Teks Tombol",
    cta_link: "Link Tombol",
    bank_name: "Nama Bank",
    account_holder: "Atas Nama",
    account_number: "Nomor Rekening",
  };
  return map[name] ?? name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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
          <TabsTrigger value="payment">Pembayaran</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
          <TabsTrigger value="sections">Keunggulan</TabsTrigger>
          <TabsTrigger value="categories">Kategori</TabsTrigger>
          <TabsTrigger value="testimonials">Testimoni</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
        </TabsList>
        <TabsContent value="brand"><SettingForm settingKey="brand" fields={["name", "logo_url", "favicon_url"]} /></TabsContent>
        <TabsContent value="hero"><SettingForm settingKey="hero" fields={["headline", "subheadline", "cta_text", "cta_link", "image_url", "image_url_2", "image_url_3", "image_url_4"]} multiline={["headline","subheadline"]} /></TabsContent>
        <TabsContent value="contact"><ContactSettingsForm /></TabsContent>
        <TabsContent value="payment"><SettingForm settingKey="payment" fields={["bank_name", "account_holder", "account_number", "bank_logo_url"]} /></TabsContent>
        <TabsContent value="footer"><SettingForm settingKey="footer" fields={["description", "copyright"]} multiline={["description"]} /></TabsContent>
        <TabsContent value="sections"><SectionsEditor /></TabsContent>
        <TabsContent value="categories"><CategoriesEditor /></TabsContent>
        <TabsContent value="testimonials"><TestimonialsEditor /></TabsContent>
        <TabsContent value="backup"><BackupSection /></TabsContent>
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
    if (error) toast.error(error.message);
    else {
      toast.success("Tersimpan");
      qc.invalidateQueries({ queryKey: ["site_settings"] });
      qc.invalidateQueries({ queryKey: ["setting", settingKey] });
    }
  }

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-border/60 bg-card p-5">
      {fields.map((f) => {
        const imgCfg = IMAGE_FIELDS[f];
        if (imgCfg) {
          return (
            <ImageUpload
              key={f}
              label={fieldLabel(f)}
              value={form[f] ?? ""}
              onChange={(url) => setForm({ ...form, [f]: url ?? "" })}
              preset={imgCfg.preset}
              folder={imgCfg.folder}
            />
          );
        }
        return (
          <div key={f}>
            <Label>{fieldLabel(f)}</Label>
            {multiline.includes(f)
              ? <Textarea rows={3} value={form[f] ?? ""} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
              : <Input value={form[f] ?? ""} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />}
          </div>
        );
      })}
      <Button onClick={save}>Simpan</Button>
    </div>
  );
}

// ─── Sections / Categories editors ───
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
    { name: "image_url", label: "Gambar", image: { preset: "category", folder: "category" } },
    { name: "link", label: "Link" },
    { name: "sort_order", label: "Urutan", type: "number" },
  ]} />;
}

type FieldDef = { name: string; label: string; multiline?: boolean; type?: string; image?: ImgFieldCfg };
function CrudList({ table, fields }: { table: "homepage_sections" | "website_categories"; fields: FieldDef[] }) {
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
            {typeof r.image_url === "string" && r.image_url && (
              <img src={r.image_url as string} alt="" className="h-10 w-10 rounded-lg object-cover" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">{(r.title as string) ?? (r.name as string)}</p>
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

function CrudDialog({ table, fields, initial, onClose }: { table: "homepage_sections" | "website_categories"; fields: FieldDef[]; initial: Record<string, unknown> | null; onClose: () => void }) {
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
    if (initial?.id) await client.update(payload).eq("id", initial.id as string);
    else await client.insert(payload);
    toast.success("Tersimpan");
    qc.invalidateQueries({ queryKey: ["cms", table] });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-elegant max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-semibold">{initial ? "Edit" : "Tambah"}</h3>
        <div className="mt-4 space-y-3">
          {fields.map((f) => (
            <div key={f.name}>
              {f.image ? (
                <ImageUpload
                  label={f.label}
                  value={String(form[f.name] ?? "")}
                  onChange={(url) => setForm({ ...form, [f.name]: url ?? "" })}
                  preset={f.image.preset}
                  folder={f.image.folder}
                />
              ) : (
                <>
                  <Label>{f.label}</Label>
                  {f.multiline
                    ? <Textarea rows={3} value={String(form[f.name] ?? "")} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
                    : <Input type={f.type ?? "text"} value={String(form[f.name] ?? "")} onChange={(e) => setForm({ ...form, [f.name]: f.type === "number" ? Number(e.target.value) : e.target.value })} />}
                </>
              )}
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

// ─── Testimonials editor (custom UI) ───

type Testimonial = {
  id: string;
  name: string;
  city: string | null;
  role: string | null;
  message: string;
  avatar_url: string | null;
  photos: string[];
  rating: number;
  verified: boolean;
  is_active: boolean;
  sort_order: number;
};

function TestimonialsEditor() {
  const qc = useQueryClient();
  const { data: rows } = useQuery({
    queryKey: ["cms", "testimonials"],
    queryFn: async () => {
      const { data } = await supabase.from("testimonials").select("*").order("sort_order");
      return (data ?? []).map((r) => ({
        ...r,
        photos: Array.isArray(r.photos) ? (r.photos as string[]) : [],
      })) as Testimonial[];
    },
  });

  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [open, setOpen] = useState(false);

  async function del(t: Testimonial) {
    if (!confirm("Hapus testimoni?")) return;
    await supabase.from("testimonials").delete().eq("id", t.id);
    // cleanup storage
    const urls = [t.avatar_url, ...(t.photos ?? [])].filter(Boolean) as string[];
    for (const u of urls) {
      const m = u.match(/\/object\/(?:sign|public)\/website-assets\/([^?]+)/);
      if (m) await supabase.storage.from("website-assets").remove([decodeURIComponent(m[1])]).catch(() => {});
    }
    qc.invalidateQueries({ queryKey: ["cms", "testimonials"] });
  }
  async function toggle(t: Testimonial) {
    await supabase.from("testimonials").update({ is_active: !t.is_active }).eq("id", t.id);
    qc.invalidateQueries({ queryKey: ["cms", "testimonials"] });
  }

  return (
    <div className="mt-4">
      <div className="mb-3 flex justify-end">
        <Button size="sm" className="gap-1" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-3.5 w-3.5" /> Tambah Testimoni
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(rows ?? []).map((t) => (
          <div key={t.id} className="rounded-xl border border-border/60 bg-card p-4">
            <div className="flex items-start gap-3">
              {t.avatar_url ? (
                <img src={t.avatar_url} alt={t.name} className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary font-bold">
                  {t.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="truncate font-medium">{t.name}</p>
                  {t.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                </div>
                {t.city && <p className="text-xs text-muted-foreground">{t.city}</p>}
                <div className="mt-1 flex gap-0.5 text-primary">
                  {Array.from({ length: t.rating ?? 5 }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-current" />
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">"{t.message}"</p>
            <div className="mt-3 flex justify-end gap-1">
              <Button variant="ghost" size="sm" onClick={() => toggle(t)}>{t.is_active ? "Nonaktifkan" : "Aktifkan"}</Button>
              <Button variant="ghost" size="sm" onClick={() => { setEditing(t); setOpen(true); }}>Edit</Button>
              <Button variant="ghost" size="icon" onClick={() => del(t)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {(rows ?? []).length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground sm:col-span-2">
            Belum ada testimoni.
          </p>
        )}
      </div>

      {open && <TestimonialDialog initial={editing} onClose={() => setOpen(false)} />}
    </div>
  );
}

function TestimonialDialog({ initial, onClose }: { initial: Testimonial | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(initial?.name ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [message, setMessage] = useState(initial?.message ?? "");
  const [rating, setRating] = useState(initial?.rating ?? 5);
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [verified, setVerified] = useState(initial?.verified ?? false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial?.avatar_url ?? null);
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);

  async function save() {
    if (!name.trim() || !message.trim()) {
      toast.error("Nama dan pesan wajib diisi");
      return;
    }
    const payload = {
      name: name.trim(),
      city: city.trim() || null,
      message: message.trim(),
      avatar_url: avatarUrl,
      photos,
      rating,
      sort_order: sortOrder,
      verified,
      is_active: initial?.is_active ?? true,
    };
    const { error } = initial?.id
      ? await supabase.from("testimonials").update(payload).eq("id", initial.id)
      : await supabase.from("testimonials").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success("Tersimpan");
      qc.invalidateQueries({ queryKey: ["cms", "testimonials"] });
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-elegant" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-semibold">{initial ? "Edit Testimoni" : "Tambah Testimoni"}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Nama Customer</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Kota</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Jakarta" />
          </div>
          <div className="sm:col-span-2">
            <Label>Isi Testimoni</Label>
            <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <div>
            <Label>Rating</Label>
            <div className="mt-1 flex gap-1">
              {[1,2,3,4,5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)}>
                  <Star className={`h-6 w-6 ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Urutan</Label>
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Pembeli Terverifikasi</p>
              <p className="text-xs text-muted-foreground">Tampilkan badge ✔ di testimoni</p>
            </div>
            <Switch checked={verified} onCheckedChange={setVerified} />
          </div>
          <div className="sm:col-span-2">
            <ImageUpload label="Foto Customer" value={avatarUrl} onChange={setAvatarUrl} preset="avatar" folder="testimonials" />
          </div>
          <div className="sm:col-span-2">
            <MultiImageUpload label="Foto Pendukung (produk / chat / unboxing, maks. 5)" values={photos} onChange={setPhotos} preset="photo" folder="testimonials" max={5} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save}>Simpan</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Custom Contact Settings Form with toggles ───

const CONTACT_FIELDS: { key: string; label: string; isSocial: boolean }[] = [
  { key: "whatsapp", label: "WhatsApp", isSocial: true },
  { key: "email", label: "Email", isSocial: false },
  { key: "address", label: "Alamat", isSocial: false },
  { key: "instagram", label: "Instagram", isSocial: true },
  { key: "tiktok", label: "TikTok", isSocial: true },
  { key: "shopee", label: "Shopee", isSocial: true },
  { key: "facebook", label: "Facebook", isSocial: true },
  { key: "youtube", label: "YouTube", isSocial: true },
  { key: "tokopedia", label: "Tokopedia", isSocial: true },
];

function ContactSettingsForm() {
  const qc = useQueryClient();
  const settingKey = "contact";
  const { data } = useQuery({
    queryKey: ["setting", settingKey],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", settingKey).maybeSingle();
      const defaults = (siteSettingsDefaults() as unknown as Record<string, Record<string, Json>>)[settingKey] ?? {};
      return { ...defaults, ...((data?.value as Record<string, Json> | null) ?? {}) };
    },
  });
  const [form, setForm] = useState<Record<string, Json>>({});
  useEffect(() => { if (data) setForm(data); }, [data]);

  async function save() {
    const { error } = await supabase.from("site_settings").upsert({ key: settingKey, value: form as Record<string, Json> });
    if (error) toast.error(error.message);
    else {
      toast.success("Tersimpan");
      qc.invalidateQueries({ queryKey: ["site_settings"] });
      qc.invalidateQueries({ queryKey: ["setting", settingKey] });
    }
  }

  const socials = CONTACT_FIELDS.filter((f) => f.isSocial);
  const basics = CONTACT_FIELDS.filter((f) => !f.isSocial);

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-border/60 bg-card p-5">
      {basics.map((f) => (
        <div key={f.key}>
          <Label>{f.label}</Label>
          <Input value={String(form[f.key] ?? "")} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
        </div>
      ))}

      <div className="pt-2">
        <h4 className="font-display text-sm font-semibold text-foreground">Sosial Media & Marketplace</h4>
        <p className="text-xs text-muted-foreground">Isi link dan aktifkan platform yang ingin ditampilkan di website.</p>
      </div>

      <div className="space-y-3">
        {socials.map((f) => {
          const activeKey = `${f.key}_active`;
          const isActive = !!(form[activeKey] ?? false);
          return (
            <div key={f.key} className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 p-3">
              <div className="flex-1">
                <Label className="text-xs font-medium">{f.label}</Label>
                <Input
                  className="mt-1"
                  placeholder={`https://...`}
                  value={String(form[f.key] ?? "")}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              </div>
              <div className="flex flex-col items-center gap-1 pt-5">
                <Switch
                  checked={isActive}
                  onCheckedChange={(checked) => setForm({ ...form, [activeKey]: checked })}
                />
                <span className="text-[10px] text-muted-foreground">{isActive ? "Aktif" : "Nonaktif"}</span>
              </div>
            </div>
          );
        })}
      </div>

      <Button onClick={save}>Simpan</Button>
    </div>
  );
}
