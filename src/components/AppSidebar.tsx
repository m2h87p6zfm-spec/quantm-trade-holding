import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Brain, Calendar, CreditCard, Flame, LineChart, ListOrdered, Lock, LogIn, LogOut, Microscope, Newspaper, Settings as SettingsIcon, ShieldCheck, Sigma, Sparkles, TrendingUp, User as UserIcon, Wallet } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { ApexLogo } from "@/components/ApexLogo";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { FEATURE_TIERS, tierAllows, type Feature } from "@/lib/featureGate";

type NavItem = { title: string; url: string; icon: typeof Bell; desc?: string; feature?: Feature };

const quantCore: NavItem[] = [
  { title: "Analyse-Agent", url: "/analyse", icon: Sigma, desc: "Statistik-Engine" },
  { title: "Quant-Signale", url: "/signale", icon: Sparkles, desc: "Live Setups" },
  { title: "APEX Track Record", url: "/track-record", icon: ShieldCheck, desc: "Live-Trefferquote" },
  { title: "Explain My Trade", url: "/explain-trade", icon: Microscope, desc: "Reverse-Backtest", feature: "risk_analytics" },
  { title: "AI Learning", url: "/ai-learning", icon: Brain, desc: "Selbstlernend", feature: "ai_learning" },
];

const markets: NavItem[] = [
  { title: "Watchlist", url: "/", icon: ListOrdered },
  { title: "Heatmap", url: "/heatmap", icon: Flame },
  { title: "News & Sentiment", url: "/news", icon: Newspaper, feature: "news_sentiment" },
  { title: "Kalender", url: "/kalender", icon: Calendar, feature: "calendar" },
];

const trading: NavItem[] = [
  { title: "Portfolio", url: "/portfolio", icon: Wallet, feature: "portfolio" },
  { title: "Smart Alerts", url: "/alerts", icon: Bell },
];

const system: NavItem[] = [
  { title: "Preise & Pläne", url: "/preise", icon: CreditCard },
  { title: "Produktkatalog", url: "/produkte", icon: LineChart },
  { title: "Einstellungen", url: "/einstellungen", icon: SettingsIcon },
];

export function AppSidebar() {
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
          <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 via-background to-gold/10 ring-1 ring-primary/30 shadow-[0_0_22px_-4px_hsl(var(--primary)/0.5)] ${collapsed ? "h-9 w-9" : "h-12 w-12"}`}>
            <ApexLogo className={collapsed ? "h-6 w-6" : "h-8 w-8"} />
            <span className={`absolute -bottom-0.5 -right-0.5 rounded-full bg-bull animate-pulse ring-2 ring-sidebar ${collapsed ? "h-2 w-2" : "h-2.5 w-2.5"}`} />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold tracking-tight">Apex <span className="text-gradient-gold">Trades</span></span>
              <span className="text-[11px] text-muted-foreground">Statistical Trading Agent</span>
            </div>
          )}
        </div>

      </SidebarHeader>

      <SidebarContent>
        {/* Quant Core — der Grundbaustein der App, visuell hervorgehoben */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/80">
            <TrendingUp className="mr-1.5 h-3 w-3" /> Quant Core
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className={collapsed ? "" : "mx-1 rounded-lg border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-transparent to-violet-accent/[0.05] p-1"}>
              <SidebarMenu>
                {quantCore.map((item) => {
                  const active = isActive(item.url);
                  const locked = isLocked(item);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={locked ? `${item.title} (Upgrade nötig)` : item.title}
                        className={active ? "bg-primary/15 text-primary hover:bg-primary/20 data-[active=true]:bg-primary/15" : "hover:bg-primary/[0.08]"}
                      >
                        <Link to={item.url} className="flex items-center gap-2.5">
                          <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-primary/70"}`} />
                          {!collapsed && (
                            <div className="flex min-w-0 flex-1 flex-col leading-tight">
                              <span className="truncate text-sm font-medium flex items-center gap-1.5">
                                {item.title}
                                {locked && <Lock className="h-3 w-3 text-gold/80" />}
                              </span>
                              <span className="truncate text-[10px] text-muted-foreground">{item.desc}</span>
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
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Märkte</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {markets.map((item) => {
                const locked = isLocked(item);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={locked ? `${item.title} (Upgrade nötig)` : item.title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{item.title}</span>
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
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Trading</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {trading.map((item) => {
                const locked = isLocked(item);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={locked ? `${item.title} (Upgrade nötig)` : item.title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{item.title}</span>
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
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {system.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <div className="mx-2 mt-2 rounded-lg border border-primary/15 bg-gradient-to-br from-primary/[0.08] to-violet-accent/[0.06] p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <Sigma className="h-3 w-3" /> Quant Engine
            </div>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              Jedes Signal basiert auf statistischen Modellen — Z-Score, RSI, MACD, Bollinger & Sharpe.
            </p>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <AuthSection collapsed={collapsed} />
      </SidebarFooter>
    </Sidebar>
  );
}

function AuthSection({ collapsed }: { collapsed: boolean }) {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return <div className="h-10 animate-pulse rounded-md bg-muted/30" />;
  }

  if (!user) {
    if (collapsed) {
      return (
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Anmelden">
              <Link to="/login"><LogIn className="h-4 w-4" /></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Upgrade">
              <Link to="/preise"><CreditCard className="h-4 w-4 text-gold" /></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      );
    }
    return (
      <div className="space-y-2 p-1">
        <div className="rounded-lg border border-gold/30 bg-gradient-to-br from-gold/10 via-primary/[0.04] to-transparent p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gold">Pro freischalten</div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Voller Zugriff auf Quant-Signale, AI Learning & Smart Alerts.
          </p>
          <Button asChild size="sm" className="mt-2 h-8 w-full text-xs">
            <Link to="/preise"><CreditCard className="mr-1.5 h-3.5 w-3.5" /> Pläne ansehen</Link>
          </Button>
        </div>
        <Button asChild size="sm" variant="outline" className="h-8 w-full text-xs">
          <Link to="/login"><LogIn className="mr-1.5 h-3.5 w-3.5" /> Anmelden / Registrieren</Link>
        </Button>
      </div>
    );
  }

  if (collapsed) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="Konto">
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
          <span className="text-[10px] text-muted-foreground">Konto verwalten</span>
        </div>
      </Link>
      <Button onClick={() => signOut()} size="sm" variant="ghost" className="h-7 w-full justify-start text-xs text-muted-foreground hover:text-foreground">
        <LogOut className="mr-1.5 h-3.5 w-3.5" /> Abmelden
      </Button>
    </div>
  );
}
