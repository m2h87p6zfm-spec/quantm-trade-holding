import { Fragment, useEffect } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { startSelfHealing } from "@/lib/self-healing-service";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts, useRouter, useRouterState, Link, useNavigate } from "@tanstack/react-router";
import { useSettings } from "@/lib/settings";
import { useT } from "@/lib/i18n";
import { AuthGate } from "@/components/AuthGate";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DisclaimerBanner } from "@/components/Disclaimer";
import { Toaster } from "@/components/ui/sonner";
import { MarketClock } from "@/components/MarketClock";
import { CommandPalette } from "@/components/CommandPalette";
import { QuickPanel } from "@/components/QuickPanel";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { TradingProfileProvider } from "@/hooks/use-trading-profile";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

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
import { BreakingNewsTicker } from "@/components/BreakingNewsTicker";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { UpgradeModal } from "@/components/UpgradeModal";

import { Footer } from "@/components/Footer";
import { ApexLogo } from "@/components/ApexLogo";
import { MarketRegimePill } from "@/components/MarketRegimePill";
import { useAutoTheme } from "@/hooks/use-auto-theme";
import { AutoTranslate } from "@/components/AutoTranslate";


import appCss from "../styles.css?url";

function NotFoundComponent() {
  const t = useT();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">{t("shell.notFound")}</p>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const t = useT();
  console.error(error);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">{t("shell.errorTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">{t("shell.retry")}</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Quantm Trade — Statistischer Trading Agent" },
      { name: "description", content: "Datengetriebene Marktanalyse mit Z-Score, RSI, MACD, Bollinger und Wall-Street-Broker-Einschätzungen in Echtzeit." },
      { property: "og:title", content: "Quantm Trade — Statistischer Trading Agent" },
      { name: "twitter:title", content: "Quantm Trade — Statistischer Trading Agent" },
      { property: "og:description", content: "Datengetriebene Marktanalyse mit Z-Score, RSI, MACD, Bollinger und Wall-Street-Broker-Einschätzungen in Echtzeit." },
      { name: "twitter:description", content: "Datengetriebene Marktanalyse mit Z-Score, RSI, MACD, Bollinger und Wall-Street-Broker-Einschätzungen in Echtzeit." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e4d1f07b-d89e-4393-a35e-f2dff0a7570d/id-preview-c9e3b082--4a6b9c55-24dc-4de1-a659-a1fd34d4af8e.lovable.app-1779403879423.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e4d1f07b-d89e-4393-a35e-f2dff0a7570d/id-preview-c9e3b082--4a6b9c55-24dc-4de1-a659-a1fd34d4af8e.lovable.app-1779403879423.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
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
  // Canonical host redirect: www.quantmtrade.com → quantmtrade.com.
  // Without this, the Supabase session stored in localStorage on one
  // host is invisible on the other, forcing users to log in again.
  if (typeof window !== "undefined" && window.location.hostname === "www.quantmtrade.com") {
    window.location.replace(
      window.location.protocol + "//quantmtrade.com" + window.location.pathname + window.location.search + window.location.hash,
    );
  }
  const { settings: rootSettings } = useSettings();
  useAutoTheme(rootSettings.theme === "auto");
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TradingProfileProvider>
          <SubscriptionProvider>
            <AuthGate>
              <AppShell />
            </AuthGate>
            <Toaster />
          </SubscriptionProvider>
        </TradingProfileProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AppShell() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuthScreen =
    pathname === "/login" ||
    pathname === "/passwort-vergessen" ||
    pathname === "/passwort-zuruecksetzen" ||
    pathname === "/auth/confirm" ||
    pathname === "/onboarding";

  // Keep <html lang> in sync with the user's chosen language so screen
  // readers, browser translation, and SEO see the right locale.
  const { settings } = useSettings();
  const lang = settings?.language || "en";
  useEffect(() => {
    if (typeof document !== "undefined" && lang) {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  // Self-Healing Service starten (läuft im Hintergrund, pausiert bei inaktivem Tab)
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!user) return;
    const stop = startSelfHealing({
      queryClient,
      getUserId: () => user?.id ?? null,
    });
    return stop;
  }, [queryClient, user]);

  // Auth + onboarding screens render standalone — no sidebar, header, or app chrome.
  // The `key={lang}` on the Fragment forces a full remount of the entire
  // subtree whenever the user switches language. This guarantees every
  // component (including memoized children, loaders and locale-derived
  // state captured at mount time) re-evaluates strings in the new locale.
  if (!user || isAuthScreen) {
    return (
      <Fragment key={lang}>
        <Outlet />
      </Fragment>
    );
  }

  return (
    <Fragment key={lang}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background text-foreground flex-col">
          <PaymentTestModeBanner />
          <DunningBanner />
          <BreakingNewsTicker />

          <div className="flex flex-1 w-full min-w-0">
            <AppSidebar />
            <div className="flex flex-1 flex-col relative min-w-0 pb-[calc(64px+env(safe-area-inset-bottom))] lg:pb-0">
              <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-card/80 px-3 backdrop-blur-xl overflow-hidden">
                <SidebarTrigger className="shrink-0 hidden lg:flex" />
                <div className="h-5 w-px bg-border/60 shrink-0 hidden sm:block" />
                <div className="ml-2 hidden sm:flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bull opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-bull tick-glow-bull" />
                  </span>
                  <span className="font-medium hidden md:inline">Yahoo Finance</span>
                </div>
                <div className="mx-4 hidden 2xl:block h-5 w-px bg-border/60 shrink-0" />
                <div className="hidden 2xl:flex min-w-0 flex-1 overflow-hidden">
                  <MarketClock />
                </div>
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  <MarketRegimePill />
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
              <Footer />
            </div>

          </div>
          <MobileBottomNav />
        </div>
        <QuickPanel />
        <UpgradeModal />
        <AutoTranslate />
        
      </SidebarProvider>
    </Fragment>
  );
}

function AuthHeaderButton() {
  const t = useT();
  const { user, loading, signOut } = useAuth();
  const { tier } = useSubscription();
  const navigate = useNavigate();
  if (loading) return null;
  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <Button asChild size="sm" variant="ghost" className="text-xs"><Link to="/login">{t("common.signIn")}</Link></Button>
        <Button asChild size="sm" className="text-xs h-8"><Link to="/preise">{t("common.upgrade")}</Link></Button>
      </div>
    );
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const displayName = (meta.full_name as string) || (meta.name as string) || user.email?.split("@")[0] || t("shell.accountFallback");
  const avatarUrl = (meta.avatar_url as string) || (meta.picture as string) || undefined;
  const initials = displayName.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "A";
  const tierLabel = tier === "elite" ? "Quantm Elite" : tier === "pro" ? "Quantm Pro" : "Free";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-accent/50 transition-colors" aria-label={t("shell.profileMenu")}>
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
          <UserIcon className="h-4 w-4 mr-2" /> {t("shell.profileAccount")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate({ to: "/konto" })}>
          <CreditCard className="h-4 w-4 mr-2" /> {t("shell.manageSubscription")}
        </DropdownMenuItem>
        {tier === "free" ? (
          <DropdownMenuItem onSelect={() => navigate({ to: "/preise" })}>
            <Sparkles className="h-4 w-4 mr-2 text-primary" /> {t("shell.upgradePro")}
          </DropdownMenuItem>
        ) : tier === "pro" ? (
          <DropdownMenuItem onSelect={() => navigate({ to: "/preise" })}>
            <Sparkles className="h-4 w-4 mr-2 text-primary" /> {t("shell.upgradeElite")}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={() => navigate({ to: "/einstellungen" })}>
          <Settings className="h-4 w-4 mr-2" /> {t("nav.settings")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate({ to: "/handelsprofil" })}>
          <Sparkles className="h-4 w-4 mr-2" /> {t("shell.tradingProfile")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: "/impressum" })}>
          Impressum
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate({ to: "/agb" })}>
          AGB
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate({ to: "/datenschutz" })}>
          Datenschutz
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" /> {t("shell.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
