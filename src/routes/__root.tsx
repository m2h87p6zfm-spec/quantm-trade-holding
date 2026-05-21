import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts, useRouter, Link } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DisclaimerBanner } from "@/components/Disclaimer";
import { Toaster } from "@/components/ui/sonner";
import { MarketClock } from "@/components/MarketClock";
import { CommandPalette } from "@/components/CommandPalette";
import { QuickPanel } from "@/components/QuickPanel";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Button } from "@/components/ui/button";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">Seite nicht gefunden.</p>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Etwas ist schiefgelaufen</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Erneut versuchen</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Apex Markets — Statistischer Trading Agent" },
      { name: "description", content: "Datengetriebene Marktanalyse mit Z-Score, RSI, MACD, Bollinger und Wall-Street-Broker-Einschätzungen in Echtzeit." },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background text-foreground">
          <AppSidebar />
          <div className="flex flex-1 flex-col relative">
            <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-card/80 px-3 backdrop-blur-xl">
              <SidebarTrigger />
              <div className="ml-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bull opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-bull tick-glow-bull" />
                </span>
                <span className="font-medium hidden sm:inline">Yahoo Finance</span>
              </div>
              <div className="mx-4 hidden md:block h-5 w-px bg-border/60" />
              <MarketClock />
              <div className="ml-auto flex items-center gap-2">
                <CommandPalette />
              </div>
            </header>
            <main className="flex-1 overflow-x-hidden bg-mesh relative">
              <div className="absolute inset-x-0 top-0 h-64 bg-grid pointer-events-none opacity-40" />
              <div className="relative z-10">
                <Outlet />
              </div>
            </main>
            <DisclaimerBanner />
          </div>
        </div>
        <Toaster />
        <QuickPanel />
      </SidebarProvider>
    </QueryClientProvider>
  );
}
