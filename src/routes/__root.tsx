import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { WhatsAppFloat } from "@/components/site/WhatsAppFloat";
import { Toaster } from "@/components/ui/sonner";
import { AdsPixels } from "@/components/site/AdsPixels";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="font-display text-7xl font-bold text-primary">404</h1>
      <h2 className="mt-4 font-display text-xl font-semibold">Halaman tidak ditemukan</h2>
      <p className="mt-2 text-sm text-muted-foreground">Halaman yang Anda cari tidak tersedia.</p>
      <Link to="/" className="btn-hero mt-6">Kembali ke Beranda</Link>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="font-display text-xl font-semibold">Terjadi gangguan</h1>
      <p className="mt-2 text-sm text-muted-foreground">Coba muat ulang halaman.</p>
      <button onClick={() => { router.invalidate(); reset(); }} className="btn-hero mt-6">Coba lagi</button>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Toko Serba — Supplier Grosir Serba 35 & Serba 75" },
      { name: "description", content: "Toko Serba adalah supplier grosir produk Serba 35 dan Serba 75 untuk reseller, toko serba harga, dan pedagang online di Indonesia." },
      { name: "keywords", content: "supplier serba 35, supplier serba 75, grosir produk murah, supplier reseller, toko serba harga, grosir fashion wanita" },
      { property: "og:title", content: "Toko Serba — Supplier Grosir Serba 35 & Serba 75" },
      { property: "og:description", content: "Toko Serba adalah supplier grosir produk Serba 35 dan Serba 75 untuk reseller, toko serba harga, dan pedagang online di Indonesia." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Toko Serba" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Toko Serba — Supplier Grosir Serba 35 & Serba 75" },
      { name: "twitter:description", content: "Toko Serba adalah supplier grosir produk Serba 35 dan Serba 75 untuk reseller, toko serba harga, dan pedagang online di Indonesia." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5f2a98cc-2a16-428f-ae55-e844a7e8e34a/id-preview-6772c377--6fe7d73d-8cdc-422c-807a-caf165aac9de.lovable.app-1781152383245.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5f2a98cc-2a16-428f-ae55-e844a7e8e34a/id-preview-6772c377--6fe7d73d-8cdc-422c-807a-caf165aac9de.lovable.app-1781152383245.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&family=Poppins:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              <Outlet />
            </main>
            <Footer />
            <WhatsAppFloat />
          </div>
          <Toaster richColors position="top-center" />
          <AdsPixels />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
