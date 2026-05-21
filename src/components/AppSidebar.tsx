import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Brain, Calendar, CreditCard, Flame, LineChart, ListOrdered, LogIn, LogOut, Newspaper, Settings as SettingsIcon, Sigma, Sparkles, TrendingUp, User as UserIcon, Wallet } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { ApexLogo } from "@/components/ApexLogo";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

// Der "Quant Core" ist das Herzstück der App: statistische & mathematische
// Aktienanalyse. Diese Gruppe wird oben, visuell hervorgehoben angezeigt.
const quantCore = [
  { title: "Analyse-Agent", url: "/analyse", icon: Sigma, desc: "Statistik-Engine" },
  { title: "Quant-Signale", url: "/signale", icon: Sparkles, desc: "Live Setups" },
  { title: "AI Learning", url: "/ai-learning", icon: Brain, desc: "Selbstlernend" },
];

const markets = [
  { title: "Watchlist", url: "/", icon: ListOrdered },
  { title: "Heatmap", url: "/heatmap", icon: Flame },
  { title: "News & Sentiment", url: "/news", icon: Newspaper },
  { title: "Kalender", url: "/kalender", icon: Calendar },
];

const trading = [
  { title: "Portfolio", url: "/portfolio", icon: Wallet },
  { title: "Smart Alerts", url: "/alerts", icon: Bell },
];

const system = [
  { title: "Preise & Pläne", url: "/preise", icon: CreditCard },
  { title: "Produktkatalog", url: "/produkte", icon: LineChart },
  { title: "Einstellungen", url: "/einstellungen", icon: SettingsIcon },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const isActive = (url: string) => (url === "/" ? path === "/" : path.startsWith(url));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 via-background to-gold/10 ring-1 ring-primary/30 shadow-[0_0_18px_-4px_hsl(var(--primary)/0.45)]">
            <ApexLogo className="h-6 w-6" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-bull animate-pulse ring-2 ring-sidebar" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-tight">Apex <span className="text-gradient-gold">Trades</span></span>
              <span className="text-[10px] text-muted-foreground">Statistical Trading Agent</span>
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
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className={active ? "bg-primary/15 text-primary hover:bg-primary/20 data-[active=true]:bg-primary/15" : "hover:bg-primary/[0.08]"}
                      >
                        <Link to={item.url} className="flex items-center gap-2.5">
                          <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-primary/70"}`} />
                          {!collapsed && (
                            <div className="flex min-w-0 flex-col leading-tight">
                              <span className="truncate text-sm font-medium">{item.title}</span>
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
              {markets.map((item) => (
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

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Trading</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {trading.map((item) => (
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
    </Sidebar>
  );
}
