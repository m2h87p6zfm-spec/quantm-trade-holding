import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, BookOpen, Bot, Brain, Calendar, CreditCard, Globe2, Info, LineChart, ListOrdered, Lock, LogIn, LogOut, Microscope, Newspaper, Radar, Settings as SettingsIcon, ShieldCheck, Sigma, Sparkles, TrendingUp, User as UserIcon, Wallet } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { ApexLogo, ApexWordmark } from "@/components/ApexLogo";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { FEATURE_TIERS, tierAllows, type Feature } from "@/lib/featureGate";
import { useT } from "@/lib/i18n";
import { LegalLinks } from "@/components/LegalLinks";

type NavItem = { titleKey: string; url: string; icon: typeof Bell; descKey?: string; feature?: Feature };

const TOUR_KEYS: Record<string, string> = {
  "/": "watchlist",
  "/picks": "picks",
  "/analyse": "analyse",
  "/track-record": "trackrecord",
  "/portfolio": "portfolio",
  "/alerts": "alerts",
  "/markt-radar": "radar",
  "/news": "news",
  "/kalender": "calendar",
  "/explain-trade": "explain",
  "/global-intel": "global",
  "/produkte": "catalog",
  "/methodology": "methodology",
  "/einstellungen": "settings",
};
const tourKeyFor = (url: string) => TOUR_KEYS[url];

// Quant Core — the daily-use AI tools (4)
const quantCore: NavItem[] = [
  { titleKey: "nav.picks", url: "/picks", icon: Sparkles, descKey: "nav.picks.desc" },
  { titleKey: "nav.analyse", url: "/analyse", icon: Sigma, descKey: "nav.analyse.desc" },
  { titleKey: "nav.trackRecord", url: "/track-record", icon: ShieldCheck, descKey: "nav.trackRecord.desc" },
];

// Markets — what's moving (4)
const markets: NavItem[] = [
  { titleKey: "nav.watchlist", url: "/", icon: ListOrdered },
  { titleKey: "nav.marktRadar", url: "/markt-radar", icon: Radar },
  { titleKey: "nav.news", url: "/news", icon: Newspaper, feature: "news_sentiment" },
  { titleKey: "nav.calendar", url: "/kalender", icon: Calendar, feature: "calendar" },
];

// Portfolio & Risk — your positions (2)
const trading: NavItem[] = [
  { titleKey: "nav.portfolio", url: "/portfolio", icon: Wallet, feature: "portfolio" },
  { titleKey: "nav.alerts", url: "/alerts", icon: Bell },
];

// More Tools — power features used less often (4)
const moreTools: NavItem[] = [
  { titleKey: "nav.explain", url: "/explain-trade", icon: Microscope, feature: "risk_analytics" },
  
  { titleKey: "nav.global", url: "/global-intel", icon: Globe2 },
  { titleKey: "nav.catalog", url: "/produkte", icon: LineChart },
];

// Account & Help — settings, billing, info (4)
const system: NavItem[] = [
  { titleKey: "nav.pricing", url: "/preise", icon: CreditCard },
  { titleKey: "nav.methodology", url: "/methodology", icon: BookOpen },
  { titleKey: "nav.about", url: "/about", icon: Info },
  { titleKey: "nav.settings", url: "/einstellungen", icon: SettingsIcon },
];

export function AppSidebar() {
  const t = useT();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { tier } = useSubscription();
  const isActive = (url: string) => (url === "/" ? path === "/" : path.startsWith(url));
  const isLocked = (item: NavItem) => !!item.feature && !tierAllows(tier, FEATURE_TIERS[item.feature]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center px-0 py-2" : "px-2 py-3.5"}`}>
          <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-zinc-200/10 via-background to-zinc-400/10 ring-1 ring-zinc-300/20 shadow-[0_0_22px_-4px_rgba(192,192,192,0.35)] ${collapsed ? "h-10 w-10" : "h-12 w-12"}`}>
            <ApexLogo className={collapsed ? "h-8 w-8" : "h-10 w-10"} />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight gap-1">
              <ApexWordmark className="h-4 w-auto" />
              <span className="text-[10px] text-muted-foreground">{t("side.tagline")}</span>
            </div>
          )}
        </div>

      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/80">
            <TrendingUp className="mr-1.5 h-3 w-3" /> {t("side.quantCore")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className={collapsed ? "" : "mx-1 rounded-lg border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-transparent to-violet-accent/[0.05] p-1"}>
              <SidebarMenu>
                {quantCore.map((item) => {
                  const active = isActive(item.url);
                  const locked = isLocked(item);
                  const title = t(item.titleKey);
                  return (
                    <SidebarMenuItem key={item.url} data-tour={tourKeyFor(item.url)}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={locked ? `${title} (${t("side.upgradeRequired")})` : title}
                        className={active ? "bg-primary/15 text-primary hover:bg-primary/20 data-[active=true]:bg-primary/15" : "hover:bg-primary/[0.08]"}
                      >
                        <Link to={item.url} className="flex items-center gap-2.5">
                          <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-primary/70"}`} />
                          {!collapsed && (
                            <div className="flex min-w-0 flex-1 flex-col leading-tight">
                              <span className="truncate text-sm font-medium flex items-center gap-1.5">
                                {title}
                                {locked && <Lock className="h-3 w-3 text-gold/80" />}
                              </span>
                              {item.descKey && <span className="truncate text-[10px] text-muted-foreground">{t(item.descKey)}</span>}
                            </div>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("side.markets")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {markets.map((item) => {
                const locked = isLocked(item);
                const title = t(item.titleKey);
                return (
                  <SidebarMenuItem key={item.url} data-tour={tourKeyFor(item.url)}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={locked ? `${title} (${t("side.upgradeRequired")})` : title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{title}</span>
                        {locked && <Lock className="h-3 w-3 text-gold/80" />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("side.trading")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {trading.map((item) => {
                const locked = isLocked(item);
                const title = t(item.titleKey);
                return (
                  <SidebarMenuItem key={item.url} data-tour={tourKeyFor(item.url)}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={locked ? `${title} (${t("side.upgradeRequired")})` : title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{title}</span>
                        {locked && <Lock className="h-3 w-3 text-gold/80" />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("side.more")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {moreTools.map((item) => {
                const locked = isLocked(item);
                const title = t(item.titleKey);
                return (
                  <SidebarMenuItem key={item.url} data-tour={tourKeyFor(item.url)}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={locked ? `${title} (${t("side.upgradeRequired")})` : title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{title}</span>
                        {locked && <Lock className="h-3 w-3 text-gold/80" />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("side.system")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {system.map((item) => {
                const title = t(item.titleKey);
                return (
                  <SidebarMenuItem key={item.url} data-tour={tourKeyFor(item.url)}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <div className="mx-2 mt-2 rounded-lg border border-primary/15 bg-gradient-to-br from-primary/[0.08] to-violet-accent/[0.06] p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <Sigma className="h-3 w-3" /> {t("side.engineTitle")}
            </div>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {t("side.engineDesc")}
            </p>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <AuthSection collapsed={collapsed} />
        {!collapsed && <LegalLinks className="px-1 pb-1" />}
      </SidebarFooter>
    </Sidebar>
  );
}

function AuthSection({ collapsed }: { collapsed: boolean }) {
  const t = useT();
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return <div className="h-10 animate-pulse rounded-md bg-muted/30" />;
  }

  if (!user) {
    if (collapsed) {
      return (
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={t("side.signIn")}>
              <Link to="/login"><LogIn className="h-4 w-4" /></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={t("side.upgrade")}>
              <Link to="/preise"><CreditCard className="h-4 w-4 text-gold" /></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      );
    }
    return (
      <div className="space-y-2 p-1">
        <div className="rounded-lg border border-gold/30 bg-gradient-to-br from-gold/10 via-primary/[0.04] to-transparent p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gold">{t("side.proUnlock")}</div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {t("side.proCopy")}
          </p>
          <Button asChild size="sm" className="mt-2 h-8 w-full text-xs">
            <Link to="/preise"><CreditCard className="mr-1.5 h-3.5 w-3.5" /> {t("side.viewPlans")}</Link>
          </Button>
        </div>
        <Button asChild size="sm" variant="outline" className="h-8 w-full text-xs">
          <Link to="/login"><LogIn className="mr-1.5 h-3.5 w-3.5" /> {t("side.signInRegister")}</Link>
        </Button>
      </div>
    );
  }

  if (collapsed) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip={t("side.account")}>
            <Link to="/konto"><UserIcon className="h-4 w-4" /></Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <div className="space-y-1.5 p-1">
      <Link to="/konto" className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/30">
          <UserIcon className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-xs font-medium">{user.email}</span>
          <span className="text-[10px] text-muted-foreground">{t("side.manageAccount")}</span>
        </div>
      </Link>
      <Button onClick={() => signOut()} size="sm" variant="ghost" className="h-7 w-full justify-start text-xs text-muted-foreground hover:text-foreground">
        <LogOut className="mr-1.5 h-3.5 w-3.5" /> {t("side.signOut")}
      </Button>
    </div>
  );
}
