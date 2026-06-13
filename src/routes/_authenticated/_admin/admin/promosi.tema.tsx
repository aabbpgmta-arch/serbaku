import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_THEME, BUILT_IN_PRESETS, FONT_OPTIONS,
  type Theme, type ThemeColorSet, type ThemePreset,
} from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/_admin/admin/promosi/tema")({
  component: ThemeEditor,
});

const COLOR_FIELDS: { key: keyof ThemeColorSet; label: string }[] = [
  { key: "background", label: "Background" },
  { key: "foreground", label: "Teks utama" },
  { key: "card", label: "Card BG" },
  { key: "cardForeground", label: "Card teks" },
  { key: "primary", label: "Primary" },
  { key: "primaryForeground", label: "Primary teks" },
  { key: "primarySoft", label: "Primary soft" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "muted", label: "Muted" },
  { key: "mutedForeground", label: "Muted teks" },
  { key: "border", label: "Border" },
  { key: "headerBg", label: "Header BG" },
  { key: "footerBg", label: "Footer BG" },
  { key: "footerFg", label: "Footer teks" },
  { key: "buttonBg", label: "Tombol BG" },
  { key: "buttonFg", label: "Tombol teks" },
  { key: "cardProductBg", label: "Card produk" },
  { key: "badgeMembership", label: "Badge membership" },
  { key: "badgeFlashSale", label: "Badge flash sale" },
  { key: "adminSidebarBg", label: "Admin sidebar" },
  { key: "adminSidebarActive", label: "Admin sidebar aktif" },
];

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 flex-1 font-mono text-xs" />
      <span className="w-32 shrink-0 text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function ColorSetEditor({ set, onChange }: { set: ThemeColorSet; onChange: (v: ThemeColorSet) => void }) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {COLOR_FIELDS.map((f) => (
        <ColorRow key={f.key} label={f.label} value={set[f.key]}
          onChange={(v) => onChange({ ...set, [f.key]: v })} />
      ))}
    </div>
  );
}

function ThemeEditor() {
  const qc = useQueryClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");
  const [presetName, setPresetName] = useState("");

  // Load active + presets
  const { data: loaded } = useQuery({
    queryKey: ["theme_admin"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key,value")
        .in("key", ["theme_active", "theme_presets"]);
      const m = new Map((data ?? []).map((r) => [r.key, r.value as unknown]));
      const active = (m.get("theme_active") as Partial<Theme> | undefined) ?? null;
      const presets = (m.get("theme_presets") as ThemePreset[] | undefined) ?? [];
      return { active, presets };
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (loaded?.active) {
      setTheme({
        light: { ...DEFAULT_THEME.light, ...(loaded.active.light ?? {}) },
        dark: { ...DEFAULT_THEME.dark, ...(loaded.active.dark ?? {}) },
        typography: { ...DEFAULT_THEME.typography, ...(loaded.active.typography ?? {}) },
        shape: { ...DEFAULT_THEME.shape, ...(loaded.active.shape ?? {}) },
        branding: { ...DEFAULT_THEME.branding, ...(loaded.active.branding ?? {}) },
      });
    }
  }, [loaded?.active]);

  // Push preview to iframe
  useEffect(() => {
    const i = iframeRef.current;
    if (!i?.contentWindow) return;
    i.contentWindow.postMessage(
      { type: "serbaku:theme-preview", theme, mode: previewMode },
      window.location.origin,
    );
  }, [theme, previewMode]);

  const customPresets = loaded?.presets ?? [];
  const allPresets = useMemo<ThemePreset[]>(
    () => [...BUILT_IN_PRESETS, ...customPresets], [customPresets],
  );

  async function save() {
    const { error } = await supabase.from("site_settings")
      .upsert({ key: "theme_active", value: theme as never }, { onConflict: "key" });
    if (error) return toast.error(error.message);
    toast.success("Tema disimpan & diterapkan ke seluruh website");
    qc.invalidateQueries({ queryKey: ["theme_active"] });
    qc.invalidateQueries({ queryKey: ["theme_admin"] });
  }

  async function savePreset() {
    if (!presetName.trim()) return toast.error("Beri nama preset");
    const next: ThemePreset[] = [
      ...customPresets,
      { id: `custom-${Date.now()}`, name: presetName.trim(), theme },
    ];
    const { error } = await supabase.from("site_settings")
      .upsert({ key: "theme_presets", value: next as never }, { onConflict: "key" });
    if (error) return toast.error(error.message);
    toast.success(`Preset "${presetName}" tersimpan`);
    setPresetName("");
    qc.invalidateQueries({ queryKey: ["theme_admin"] });
  }

  async function deletePreset(id: string) {
    if (!id.startsWith("custom-")) return;
    const next = customPresets.filter((p) => p.id !== id);
    const { error } = await supabase.from("site_settings")
      .upsert({ key: "theme_presets", value: next as never }, { onConflict: "key" });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["theme_admin"] });
  }

  function reset() {
    setTheme(DEFAULT_THEME);
    toast.message("Direset ke default — klik Simpan untuk publish");
  }

  function applyPreset(id: string) {
    const p = allPresets.find((x) => x.id === id);
    if (p) {
      setTheme(p.theme);
      toast.message(`Preset "${p.name}" dimuat — klik Simpan untuk publish`);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl font-bold">Theme Editor</h1>
            <p className="text-xs text-muted-foreground">Warna, font, layout — preview langsung di kanan.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reset}>Reset Default</Button>
            <Button size="sm" onClick={save}>Simpan & Publish</Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <Label>Preset Tema</Label>
          <div className="flex flex-wrap gap-2">
            {allPresets.map((p) => (
              <div key={p.id} className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => applyPreset(p.id)}>{p.name}</Button>
                {p.id.startsWith("custom-") && (
                  <button onClick={() => deletePreset(p.id)} className="text-xs text-destructive">×</button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2 border-t border-border/60">
            <Input placeholder="Nama preset baru…" value={presetName}
              onChange={(e) => setPresetName(e.target.value)} className="h-9" />
            <Button size="sm" variant="secondary" onClick={savePreset}>Simpan preset</Button>
          </div>
        </div>

        <Tabs defaultValue="colors">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="colors">Warna</TabsTrigger>
            <TabsTrigger value="typography">Tipografi</TabsTrigger>
            <TabsTrigger value="shape">Bentuk & Layout</TabsTrigger>
            <TabsTrigger value="branding">Logo & Background</TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-3 pt-3">
            <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as "light" | "dark")}>
              <TabsList>
                <TabsTrigger value="light">☀ Light Mode</TabsTrigger>
                <TabsTrigger value="dark">🌙 Dark Mode</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="rounded-2xl border border-border bg-card p-4">
              {previewMode === "light" ? (
                <ColorSetEditor set={theme.light}
                  onChange={(light) => setTheme({ ...theme, light })} />
              ) : (
                <ColorSetEditor set={theme.dark}
                  onChange={(dark) => setTheme({ ...theme, dark })} />
              )}
            </div>
          </TabsContent>

          <TabsContent value="typography" className="space-y-3 pt-3">
            <div className="rounded-2xl border border-border bg-card p-4 grid gap-3 md:grid-cols-2">
              <div>
                <Label>Font Heading</Label>
                <Select value={theme.typography.fontHeading}
                  onValueChange={(v) => setTheme({ ...theme, typography: { ...theme.typography, fontHeading: v } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Font Body</Label>
                <Select value={theme.typography.fontBody}
                  onValueChange={(v) => setTheme({ ...theme, typography: { ...theme.typography, fontBody: v } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {(["sizeH1", "sizeH2", "sizeH3", "sizeBody"] as const).map((k) => (
                <div key={k}>
                  <Label>{k} (px)</Label>
                  <Input type="number" value={theme.typography[k]}
                    onChange={(e) => setTheme({ ...theme, typography: { ...theme.typography, [k]: Number(e.target.value) } })} />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="shape" className="space-y-3 pt-3">
            <div className="rounded-2xl border border-border bg-card p-4 grid gap-3 md:grid-cols-2">
              <div>
                <Label>Radius sudut (rem)</Label>
                <Input type="number" step="0.125" value={theme.shape.radius}
                  onChange={(e) => setTheme({ ...theme, shape: { ...theme.shape, radius: Number(e.target.value) } })} />
              </div>
              <div>
                <Label>Style tombol</Label>
                <Select value={theme.shape.buttonStyle}
                  onValueChange={(v) => setTheme({ ...theme, shape: { ...theme.shape, buttonStyle: v as "rounded" | "pill" | "square" } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rounded">Rounded</SelectItem>
                    <SelectItem value="pill">Pill</SelectItem>
                    <SelectItem value="square">Square</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lebar container (px)</Label>
                <Input type="number" step="40" value={theme.shape.containerWidth}
                  onChange={(e) => setTheme({ ...theme, shape: { ...theme.shape, containerWidth: Number(e.target.value) } })} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="branding" className="space-y-3 pt-3">
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div>
                <Label>Logo URL</Label>
                <Input value={theme.branding.logoUrl}
                  onChange={(e) => setTheme({ ...theme, branding: { ...theme.branding, logoUrl: e.target.value } })}
                  placeholder="https://…/logo.png" />
              </div>
              <div>
                <Label>Favicon URL</Label>
                <Input value={theme.branding.faviconUrl}
                  onChange={(e) => setTheme({ ...theme, branding: { ...theme.branding, faviconUrl: e.target.value } })}
                  placeholder="https://…/favicon.ico" />
              </div>
              <div>
                <Label>Background Image URL</Label>
                <Input value={theme.branding.backgroundUrl}
                  onChange={(e) => setTheme({ ...theme, branding: { ...theme.branding, backgroundUrl: e.target.value } })}
                  placeholder="https://…/bg.jpg (kosongkan untuk solid color)" />
              </div>
              <p className="text-xs text-muted-foreground">
                Tip: Upload gambar ke Imgbb / Cloudinary lalu tempel URL-nya di sini.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Live Preview</Label>
          <span className="text-xs text-muted-foreground">Mode: {previewMode}</span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <iframe
            ref={iframeRef}
            src="/"
            className="block h-[700px] w-full"
            title="Preview"
            onLoad={() => {
              iframeRef.current?.contentWindow?.postMessage(
                { type: "serbaku:theme-preview", theme, mode: previewMode },
                window.location.origin,
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}
