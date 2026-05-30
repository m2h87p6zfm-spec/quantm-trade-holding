import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  Calendar,
  CreditCard,
  Flame,
  Globe2,
  Info,
  LineChart,
  ListOrdered,
  Microscope,
  MoreHorizontal,
  Newspaper,
  Radar,
  Settings as SettingsIcon,
  ShieldCheck,
  Sigma,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { useT } from "@/lib/i18n";

type PrimaryItem = {
  to: string;
  icon: typeof Bell;
  key: string;
  exact?: boolean;
};

type MoreItem = { to: string; icon: typeof Bell; key: string };

const primary: PrimaryItem[] = [
  { to: "/", icon: ListOrdered, key: "nav.watchlist", exact: true },
  { to: "/analyse", icon: Sigma, key: "nav.analyse" },
  { to: "/picks", icon: Sparkles, key: "nav.picks" },
  { to: "/portfolio", icon: Wallet, key: "nav.portfolio" },
];

const tourKeys: Record<string, string> = {
  "/": "watchlist",
  "/analyse": "analyse",
  "/picks": "picks",
  "/portfolio": "portfolio",
};

// Everything not in the bottom bar lives in the "More" sheet.
// Mirrors AppSidebar exactly so phone & tablet have full feature parity.
const moreSections: { labelKey: string; items: MoreItem[] }[] = [
  {
    labelKey: "side.quantCore",
    items: [
      { to: "/explain-trade", icon: Microscope, key: "nav.explain" },
      { to: "/alerts", icon: Bell, key: "nav.alerts" },
      { to: "/track-record", icon: ShieldCheck, key: "nav.trackRecord" },
    ],
  },
  {
    labelKey: "side.markets",
    items: [
      { to: "/markt-radar", icon: Radar, key: "nav.marktRadar" },
      { to: "/heatmap", icon: Flame, key: "nav.heatmap" },
      { to: "/news", icon: Newspaper, key: "nav.news" },
      { to: "/global-intel", icon: Globe2, key: "nav.global" },
      { to: "/kalender", icon: Calendar, key: "nav.calendar" },
    ],
  },
  {
    labelKey: "side.system",
    items: [
      { to: "/produkte", icon: LineChart, key: "nav.catalog" },
      { to: "/preise", icon: CreditCard, key: "nav.pricing" },
      { to: "/methodology", icon: BookOpen, key: "nav.methodology" },
      { to: "/about", icon: Info, key: "nav.about" },
      { to: "/einstellungen", icon: SettingsIcon, key: "nav.settings" },
    ],
  },
];

export function MobileBottomNav() {
  const t = useT();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);
  const isActive = (it: PrimaryItem) =>
    it.exact ? path === it.to : path.startsWith(it.to);
  const moreActive = moreSections.some((s) =>
    s.items.some((it) => path.startsWith(it.to)),
  );

  return (
    <>
      <nav
        className="lg:hidden border-t border-border bg-card/95 backdrop-blur-xl"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 120,
          paddingBottom: "env(safe-area-inset-bottom)",
          // Promote to its own compositor layer — without this, iOS Safari
          // visibly "drags" the fixed nav during URL-bar collapse, making it
          // appear to drift upward while scrolling.
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)",
          willChange: "transform",
          WebkitBackfaceVisibility: "hidden",
          backfaceVisibility: "hidden",
        }}
        aria-label="Primary"
      >
        <ul className="mx-auto grid max-w-3xl grid-cols-5">
          {primary.map((it) => {
            const active = isActive(it);
            return (
              <li key={it.to} data-tour={tourKeys[it.to]}>
                <Link
                  to={it.to}
                  className={`flex min-h-[56px] md:min-h-[64px] flex-col items-center justify-center gap-0.5 md:gap-1 px-1 py-1.5 text-[10px] md:text-[12px] font-medium transition ${
                    active ? "text-bull" : "text-muted-foreground"
                  }`}
                >
                  <it.icon
                    className={`h-5 w-5 md:h-6 md:w-6 ${active ? "drop-shadow-[0_0_6px_color-mix(in_oklab,var(--bull)_55%,transparent)]" : ""}`}
                  />
                  <span className="truncate leading-none">{t(it.key)}</span>
                </Link>
              </li>
            );
          })}
          <li data-tour="more">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={`flex w-full min-h-[56px] md:min-h-[64px] flex-col items-center justify-center gap-0.5 md:gap-1 px-1 py-1.5 text-[10px] md:text-[12px] font-medium transition ${
                moreActive ? "text-bull" : "text-muted-foreground"
              }`}
              aria-label={t("nav.more")}
            >
              <MoreHorizontal
                className={`h-5 w-5 md:h-6 md:w-6 ${moreActive ? "drop-shadow-[0_0_6px_color-mix(in_oklab,var(--bull)_55%,transparent)]" : ""}`}
              />
              <span className="truncate leading-none">{t("nav.more")}</span>
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[130] flex flex-col"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Close"
            className="flex-1 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="rounded-t-2xl border-t border-border bg-card max-h-[85vh] overflow-y-auto"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="text-sm md:text-base font-semibold tracking-wide">
                {t("nav.more")}
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="rounded-full p-1.5 md:p-2 text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-5 w-5 md:h-6 md:w-6" />
              </button>
            </div>
            <div className="mx-auto -mt-1 mb-2 h-1 w-10 rounded-full bg-border" />

            <div className="mx-auto max-w-3xl space-y-5 md:space-y-6 px-4 md:px-6 pb-2">
              {moreSections.map((section) => (
                <div key={section.labelKey}>
                  <div className="px-1 pb-2 text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {t(section.labelKey)}
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
                    {section.items.map((it) => {
                      const active = path.startsWith(it.to);
                      return (
                        <Link
                          key={it.to}
                          to={it.to}
                          onClick={() => setMoreOpen(false)}
                          className={`flex min-h-[80px] md:min-h-[96px] flex-col items-center justify-center gap-1.5 md:gap-2 rounded-xl border px-2 py-3 md:py-4 text-center text-[11px] md:text-[13px] font-medium transition ${
                            active
                              ? "border-bull/40 bg-bull/10 text-bull"
                              : "border-border bg-muted/40 text-foreground hover:bg-muted"
                          }`}
                        >
                          <it.icon className="h-5 w-5 md:h-6 md:w-6" />
                          <span className="leading-tight">{t(it.key)}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
