import { useCallback, useRef, useState } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const BUCKET = "website-assets";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export type ResizePreset = "logo" | "favicon" | "hero" | "category" | "avatar" | "photo" | "banner";

const PRESET_DIMS: Record<ResizePreset, { w: number; h: number; mime?: string }> = {
  logo: { w: 256, h: 256 },
  favicon: { w: 64, h: 64, mime: "image/png" },
  avatar: { w: 256, h: 256 },
  category: { w: 600, h: 600 },
  photo: { w: 800, h: 800 },
  hero: { w: 1600, h: 1200 },
  banner: { w: 1920, h: 800 },
};

async function resizeImage(file: File, preset: ResizePreset): Promise<Blob> {
  const { w: maxW, h: maxH, mime } = PRESET_DIMS[preset];
  const outMime = mime ?? (file.type === "image/png" ? "image/png" : "image/jpeg");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
    const w = Math.round(img.width * ratio);
    const h = Math.round(img.height * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("blob"))), outMime, 0.9),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

function extractPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/object\/(?:sign|public)\/website-assets\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function deleteByUrl(url: string | null | undefined) {
  const path = extractPath(url);
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}

async function uploadAndSign(file: File, preset: ResizePreset, folder: string): Promise<string> {
  const blob = await resizeImage(file, preset);
  const ext = blob.type === "image/png" ? "png" : "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (upErr) throw upErr;
  const { data, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, TEN_YEARS);
  if (signErr || !data) throw signErr ?? new Error("sign");
  return data.signedUrl;
}

export function ImageUpload({
  value,
  onChange,
  preset = "photo",
  folder = "uploads",
  label,
  className = "",
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  preset?: ResizePreset;
  folder?: string;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("File harus berupa gambar");
        return;
      }
      setBusy(true);
      try {
        const prevUrl = value;
        const url = await uploadAndSign(file, preset, folder);
        onChange(url);
        // Best-effort cleanup of previous file
        if (prevUrl) await deleteByUrl(prevUrl).catch(() => {});
      } catch (e) {
        toast.error((e as Error).message ?? "Upload gagal");
      } finally {
        setBusy(false);
      }
    },
    [onChange, preset, folder, value],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  const removeImage = async () => {
    const prev = value;
    onChange(null);
    if (prev) await deleteByUrl(prev).catch(() => {});
  };

  return (
    <div className={className}>
      {label && <p className="mb-1.5 text-sm font-medium">{label}</p>}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`relative flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition ${
          drag ? "border-primary bg-primary-soft/30" : "border-border bg-muted/30"
        }`}
      >
        {value ? (
          <div className="relative w-full">
            <img
              src={value}
              alt="Preview"
              className="mx-auto max-h-48 rounded-lg object-contain"
            />
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
              >
                {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1 h-3.5 w-3.5" />}
                Ganti
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={removeImage}
                disabled={busy}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Hapus
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Tarik & lepas foto, atau</p>
            <Button
              type="button"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1 h-3.5 w-3.5" />}
              Pilih Foto
            </Button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

export function MultiImageUpload({
  values,
  onChange,
  preset = "photo",
  folder = "uploads",
  max = 5,
  label,
}: {
  values: string[];
  onChange: (urls: string[]) => void;
  preset?: ResizePreset;
  folder?: string;
  max?: number;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    setBusy(true);
    try {
      const remaining = max - values.length;
      const list = Array.from(files).slice(0, remaining);
      const uploaded: string[] = [];
      for (const f of list) {
        if (!f.type.startsWith("image/")) continue;
        try {
          uploaded.push(await uploadAndSign(f, preset, folder));
        } catch (e) {
          toast.error((e as Error).message ?? "Upload gagal");
        }
      }
      if (uploaded.length) onChange([...values, ...uploaded]);
    } finally {
      setBusy(false);
    }
  };

  const removeAt = async (i: number) => {
    const removed = values[i];
    onChange(values.filter((_, idx) => idx !== i));
    if (removed) await deleteByUrl(removed).catch(() => {});
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= values.length) return;
    const next = [...values];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      {label && <p className="mb-1.5 text-sm font-medium">{label}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {values.map((url, i) => (
          <div key={url} className="group relative overflow-hidden rounded-lg border border-border bg-muted/30">
            <img src={url} alt="" className="aspect-square w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 p-1 opacity-0 transition group-hover:opacity-100">
              <div className="flex gap-1">
                <button type="button" onClick={() => move(i, -1)} className="rounded bg-white/20 px-2 text-xs text-white">←</button>
                <button type="button" onClick={() => move(i, 1)} className="rounded bg-white/20 px-2 text-xs text-white">→</button>
              </div>
              <button type="button" onClick={() => removeAt(i)} className="rounded bg-destructive/80 p-1 text-white">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
        {values.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-muted/30 text-sm text-muted-foreground hover:bg-muted/50"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            <span>Tambah ({values.length}/{max})</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
