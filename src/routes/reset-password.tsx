import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — SERBAKU" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash and sets a session via onAuthStateChange (PASSWORD_RECOVERY)
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="container-page flex min-h-[80vh] items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 shadow-soft sm:p-8">
        <h1 className="font-display text-2xl font-bold">Atur Password Baru</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Masukkan password baru untuk akun SERBAKU Anda.
        </p>

        {!ready ? (
          <p className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            Memvalidasi link reset... Jika halaman ini tidak berubah, link mungkin sudah kadaluarsa. Silakan minta link baru.
          </p>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (password.length < 6) {
                toast.error("Password minimal 6 karakter.");
                return;
              }
              if (password !== confirm) {
                toast.error("Konfirmasi password tidak cocok.");
                return;
              }
              setLoading(true);
              const { error } = await supabase.auth.updateUser({ password });
              setLoading(false);
              if (error) {
                toast.error(error.message);
                return;
              }
              toast.success("Password berhasil diperbarui. Silakan login kembali.");
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            <div>
              <Label htmlFor="rp-pwd">Password Baru</Label>
              <Input
                id="rp-pwd"
                type="password"
                required
                minLength={6}
                className="h-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label htmlFor="rp-confirm">Konfirmasi Password</Label>
              <Input
                id="rp-confirm"
                type="password"
                required
                minLength={6}
                className="h-12"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 w-full text-base font-semibold" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Password Baru"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
