import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk / Daftar — SERBAKU" },
      { name: "description", content: "Masuk atau daftar akun SERBAKU untuk mulai belanja grosir." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/katalog" });
  }, [user, loading, navigate]);

  return (
    <div className="container-page flex min-h-[80vh] items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 shadow-soft sm:p-8">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Selamat Datang di SERBAKU</h1>
          <p className="mt-1 text-sm text-muted-foreground">Masuk untuk lanjut belanja grosir</p>
        </div>

        <Tabs defaultValue="login" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Masuk</TabsTrigger>
            <TabsTrigger value="signup">Daftar</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <GoogleSection />
            <Divider />
            <LoginForm />
          </TabsContent>
          <TabsContent value="signup">
            <GoogleSection />
            <Divider />
            <SignupForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs uppercase tracking-wider text-muted-foreground">atau</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function GoogleSection() {
  const [loading, setLoading] = useState(false);
  return (
    <div className="mt-5 space-y-2">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-12 w-full gap-3 text-base font-semibold"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          try {
            const result = await lovable.auth.signInWithOAuth("google", {
              redirect_uri: `${window.location.origin}/katalog`,
            });
            if (result.error) {
              toast.error("Gagal masuk dengan Google. Coba lagi.");
              setLoading(false);
            }
          } catch {
            toast.error("Gagal masuk dengan Google. Coba lagi.");
            setLoading(false);
          }
        }}
      >
        <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.2 35.5 24 35.5c-6.3 0-11.5-5.1-11.5-11.5S17.7 12.5 24 12.5c2.9 0 5.5 1.1 7.5 2.9l5.7-5.7C33.6 6.1 29.1 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 12.5 24 12.5c2.9 0 5.5 1.1 7.5 2.9l5.7-5.7C33.6 6.1 29.1 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.1 0 9.7-2 13.1-5.2l-6.1-5c-2 1.4-4.5 2.2-7 2.2-5.2 0-9.6-3.1-11.3-7.6l-6.5 5C9.4 39.6 16.1 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.1 5C40.9 35.4 44 30.1 44 24c0-1.2-.1-2.3-.4-3.5z" />
        </svg>
        {loading ? "Memproses..." : "Lanjutkan dengan Google"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Masuk lebih cepat menggunakan akun Google
      </p>
    </div>
  );
}

function friendlyAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid_credentials") || m.includes("invalid credentials"))
    return "Email atau password tidak sesuai.";
  if (m.includes("already") && (m.includes("registered") || m.includes("exist")))
    return "Tidak dapat membuat akun. Email sudah terdaftar.";
  if (m.includes("user already")) return "Tidak dapat membuat akun. Email sudah terdaftar.";
  if (m.includes("password") && m.includes("6")) return "Password minimal 6 karakter.";
  if (m.includes("rate limit")) return "Terlalu banyak percobaan. Coba lagi beberapa saat.";
  return msg;
}

function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  return (
    <>
      <form
        className="mt-2 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          setLoading(false);
          if (error) {
            toast.error(friendlyAuthError(error.message));
          } else {
            toast.success("Berhasil masuk");
            navigate({ to: "/katalog" });
          }
        }}
      >
        <div>
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            required
            className="h-12"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="login-pwd">Password</Label>
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Lupa Password?
            </button>
          </div>
          <Input
            id="login-pwd"
            type="password"
            required
            className="h-12"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" size="lg" className="h-12 w-full text-base font-semibold" disabled={loading}>
          {loading ? "Masuk..." : "Masuk"}
        </Button>
      </form>
      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} initialEmail={email} />
    </>
  );
}

function SignupForm() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <form
      className="mt-2 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (password.length < 6) {
          toast.error("Password minimal 6 karakter.");
          return;
        }
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/katalog`,
          },
        });
        if (error) {
          setLoading(false);
          toast.error(friendlyAuthError(error.message));
          return;
        }
        // Auto-confirm is enabled — try direct sign-in to ensure session is active
        if (!data.session) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signInErr) {
            setLoading(false);
            toast.success("Pendaftaran berhasil. Selamat datang di SERBAKU.");
            return;
          }
        }
        setLoading(false);
        toast.success("Pendaftaran berhasil. Selamat datang di SERBAKU.");
        navigate({ to: "/katalog" });
      }}
    >
      <div>
        <Label htmlFor="su-name">Nama Lengkap</Label>
        <Input
          id="su-name"
          required
          className="h-12"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
        />
      </div>
      <div>
        <Label htmlFor="su-email">Email</Label>
        <Input
          id="su-email"
          type="email"
          required
          className="h-12"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>
      <div>
        <Label htmlFor="su-pwd">Password</Label>
        <Input
          id="su-pwd"
          type="password"
          required
          minLength={6}
          className="h-12"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <p className="mt-1 text-xs text-muted-foreground">Password minimal 6 karakter.</p>
      </div>
      <Button type="submit" size="lg" className="h-12 w-full text-base font-semibold" disabled={loading}>
        {loading ? "Mendaftar..." : "Daftar Sekarang"}
      </Button>
    </form>
  );
}

function ForgotPasswordDialog({
  open,
  onOpenChange,
  initialEmail,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialEmail: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setEmail(initialEmail);
  }, [open, initialEmail]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Masukkan email akun Anda. Kami akan mengirim link untuk mengatur ulang password.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/reset-password`,
            });
            setLoading(false);
            if (error) {
              toast.error(friendlyAuthError(error.message));
              return;
            }
            toast.success("Link reset password telah dikirim ke email Anda.");
            onOpenChange(false);
          }}
        >
          <div>
            <Label htmlFor="fp-email">Email</Label>
            <Input
              id="fp-email"
              type="email"
              required
              className="h-12"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={loading}>
              {loading ? "Mengirim..." : "Kirim Link Reset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
