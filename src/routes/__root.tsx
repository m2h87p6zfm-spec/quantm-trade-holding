import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts, useRouter, Link, useNavigate } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DisclaimerBanner } from "@/components/Disclaimer";
import { Toaster } from "@/components/ui/sonner";
import { MarketClock } from "@/components/MarketClock";
import { CommandPalette } from "@/components/CommandPalette";
import { QuickPanel } from "@/components/QuickPanel";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { OnboardingGate } from "@/components/OnboardingGate";
import { DunningBanner } from "@/components/DunningBanner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SubscriptionProvider, useSubscription } from "@/hooks/useSubscription";
import { Badge } from "@/components/ui/badge";
import { CreditCard, LogOut, Settings, User as UserIcon, Sparkles } from "lucide-react";

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
      { title: "Apex Trades — Statistischer Trading Agent" },
      { name: "description", content: "Datengetriebene Marktanalyse mit Z-Score, RSI, MACD, Bollinger und Wall-Street-Broker-Einschätzungen in Echtzeit." },
      { property: "og:title", content: "Apex Trades — Statistischer Trading Agent" },
      { name: "twitter:title", content: "Apex Trades — Statistischer Trading Agent" },
      { property: "og:description", content: "Datengetriebene Marktanalyse mit Z-Score, RSI, MACD, Bollinger und Wall-Street-Broker-Einschätzungen in Echtzeit." },
      { name: "twitter:description", content: "Datengetriebene Marktanalyse mit Z-Score, RSI, MACD, Bollinger und Wall-Street-Broker-Einschätzungen in Echtzeit." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e4d1f07b-d89e-4393-a35e-f2dff0a7570d/id-preview-c9e3b082--4a6b9c55-24dc-4de1-a659-a1fd34d4af8e.lovable.app-1779403879423.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e4d1f07b-d89e-4393-a35e-f2dff0a7570d/id-preview-c9e3b082--4a6b9c55-24dc-4de1-a659-a1fd34d4af8e.lovable.app-1779403879423.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
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
      <AuthProvider>
        <SubscriptionProvider>
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-background text-foreground flex-col">
            <PaymentTestModeBanner />
            <DunningBanner />
            <div className="flex flex-1 w-full min-w-0">
              <AppSidebar />
              <div className="flex flex-1 flex-col relative min-w-0">
                <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-card/80 px-3 backdrop-blur-xl overflow-hidden">
                  <SidebarTrigger className="shrink-0" />
                  <div className="ml-2 hidden sm:flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bull opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-bull tick-glow-bull" />
                    </span>
                    <span className="font-medium hidden md:inline">Yahoo Finance</span>
                  </div>
                  <div className="mx-4 hidden xl:block h-5 w-px bg-border/60 shrink-0" />
                  <div className="hidden xl:flex min-w-0 flex-1 overflow-hidden">
                    <MarketClock />
                  </div>
                  <div className="ml-auto flex items-center gap-2 shrink-0">
                    <CommandPalette />
                    <AuthHeaderButton />
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
          </div>
          <Toaster />
          <QuickPanel />
          <OnboardingGate />
        </SidebarProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AuthHeaderButton() {
  const { user, loading, signOut } = useAuth();
  const { tier } = useSubscription();
  const navigate = useNavigate();
  if (loading) return null;
  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <Button asChild size="sm" variant="ghost" className="text-xs"><Link to="/login">Anmelden</Link></Button>
        <Button asChild size="sm" className="text-xs h-8"><Link to="/preise">Upgrade</Link></Button>
      </div>
    );
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const displayName = (meta.full_name as string) || (meta.name as string) || user.email?.split("@")[0] || "Konto";
  const avatarUrl = (meta.avatar_url as string) || (meta.picture as string) || undefined;
  const initials = displayName.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "A";
  const tierLabel = tier === "elite" ? "Apex Elite" : tier === "pro" ? "Apex Pro" : "Free";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-accent/50 transition-colors" aria-label="Profilmenü">
          <Avatar className="h-7 w-7">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="text-[10px] bg-primary/15 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline text-xs font-medium text-foreground/90 max-w-[120px] truncate">{displayName}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3 py-1">
            <Avatar className="h-9 w-9">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="text-xs bg-primary/15 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{displayName}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              <Badge variant={tier === "free" ? "outline" : "default"} className={`mt-1 text-[10px] ${tier === "elite" ? "bg-primary" : ""}`}>
                {tierLabel}
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: "/konto" })}>
          <UserIcon className="h-4 w-4 mr-2" /> Profil & Konto
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate({ to: "/konto" })}>
          <CreditCard className="h-4 w-4 mr-2" /> Abo verwalten
        </DropdownMenuItem>
        {tier === "free" ? (
          <DropdownMenuItem onSelect={() => navigate({ to: "/preise" })}>
            <Sparkles className="h-4 w-4 mr-2 text-primary" /> Auf Pro upgraden
          </DropdownMenuItem>
        ) : tier === "pro" ? (
          <DropdownMenuItem onSelect={() => navigate({ to: "/preise" })}>
            <Sparkles className="h-4 w-4 mr-2 text-primary" /> Auf Elite upgraden
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={() => navigate({ to: "/einstellungen" })}>
          <Settings className="h-4 w-4 mr-2" /> Einstellungen
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" /> Abmelden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
