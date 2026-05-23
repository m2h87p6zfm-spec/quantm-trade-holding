import { Link, useRouterState } from "@tanstack/react-router";
import { ListOrdered, Wallet, Sigma, Bell, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n";

type Item = { to: string; icon: typeof Bell; key: string; exact?: boolean };

const items: Item[] = [
  { to: "/", icon: ListOrdered, key: "nav.watchlist", exact: true },
  { to: "/portfolio", icon: Wallet, key: "nav.portfolio" },
  { to: "/picks", icon: Sparkles, key: "nav.picks" },
  { to: "/analyse", icon: Sigma, key: "nav.analyse" },
  { to: "/alerts", icon: Bell, key: "nav.alerts" },
];

export function MobileBottomNav() {
  const t = useT();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (it: Item) => (it.exact ? path === it.to : path.startsWith(it.to));

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = isActive(it);
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium transition ${
                  active ? "text-[#22FF88]" : "text-white/55"
                }`}
              >
                <it.icon className={`h-5 w-5 ${active ? "drop-shadow-[0_0_6px_rgba(34,255,136,0.55)]" : ""}`} />
                <span className="truncate leading-none">{t(it.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
