import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, BarChart3, Bell, Bot, Calendar, FlaskConical, Flame, LineChart, ListOrdered, MessageSquare, Newspaper, Settings as SettingsIcon, Sparkles, Swords, Wallet } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

const items = [
  { title: "Watchlist", url: "/", icon: ListOrdered },
  { title: "War Room", url: "/war-room", icon: Swords },
  { title: "AI Analyst", url: "/agent", icon: Bot },
  { title: "Analyse-Agent", url: "/analyse", icon: MessageSquare },
  { title: "Portfolio", url: "/portfolio", icon: Wallet },
  { title: "Smart Alerts", url: "/alerts", icon: Bell },
  { title: "Backtest Lab", url: "/backtest", icon: FlaskConical },
  { title: "News & Sentiment", url: "/news", icon: Newspaper },
  { title: "Wirtschaftskalender", url: "/kalender", icon: Calendar },
  { title: "Märkte & Sektoren", url: "/maerkte", icon: BarChart3 },
  { title: "Heatmap", url: "/heatmap", icon: Flame },
  { title: "Trends & Signale", url: "/signale", icon: Sparkles },
  { title: "Produktkatalog", url: "/produkte", icon: LineChart },
  { title: "Einstellungen", url: "/einstellungen", icon: SettingsIcon },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary/30 via-gold/20 to-violet-accent/20 text-primary ring-1 ring-primary/30">
            <Activity className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight">Apex <span className="text-gradient-gold">Markets</span></span>
            <span className="text-[10px] text-muted-foreground">Statistical Trading Agent</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={item.url === "/" ? path === "/" : path.startsWith(item.url)}>
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
      </SidebarContent>
    </Sidebar>
  );
}
