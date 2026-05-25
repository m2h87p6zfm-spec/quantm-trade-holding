import { ArrowRight, Zap, BarChart3, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";

const DISMISS_KEY = "qt.manifest.dismissed.v1";

/**
 * HeartManifestHero
 * Dismissible manifest popup highlighting the two core products
 * (Quantm Picks + Analysis Agent). Shown once per browser until the
 * user closes it.
 *
 * Dismiss affordances:
 * - X button (top-right, always visible / sticky on scroll)
 * - Escape key
 * - Click on backdrop
 * - "Später ansehen" footer button
 */
export function HeartManifestHero() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [enter, setEnter] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Open on mount unless previously dismissed (client-only to avoid SSR mismatch)
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && !localStorage.getItem(DISMISS_KEY)) {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  // Entrance animation + body scroll lock + Escape handler
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => setEnter(true));
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
      window.clearTimeout(focusTimer);
      setEnter(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setEnter(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    // Allow the exit animation to play out
    window.setTimeout(() => setOpen(false), 180);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quantm manifest"
      className={[
        "fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto px-3 py-6 sm:px-6 sm:py-10",
        "bg-black/75 backdrop-blur-md transition-opacity duration-200",
        enter ? "opacity-100" : "opacity-0",
      ].join(" ")}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        className={[
          "relative my-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-[#1F1F1F] shadow-2xl shadow-black/70 sm:rounded-3xl",
          "bg-gradient-to-b from-[#0B0B0B] via-[#0A0A0A] to-[#0A0A0A]",
          "transition-all duration-200",
          enter ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0",
        ].join(" ")}
      >
        {/* soft brand glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(34,255,136,0.12), transparent 70%)" }}
        />

        {/* Sticky close bar — always reachable */}
        <div className="sticky top-0 z-30 flex items-center justify-end gap-2 bg-gradient-to-b from-[#0B0B0B] via-[#0B0B0B]/95 to-transparent px-4 pt-4 pb-2 sm:px-6 sm:pt-5">
          <kbd className="hidden rounded border border-[#1F1F1F] bg-[#111111] px-1.5 py-0.5 font-mono text-[10px] text-white/40 sm:inline-block">
            ESC
          </kbd>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label={t("manifest.close")}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#1F1F1F] bg-[#111111] px-3 text-[12px] font-medium text-white/70 transition hover:border-[#22FF88]/50 hover:bg-[#161616] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22FF88]/60"
          >
            <X className="h-4 w-4" />
            <span>{t("manifest.close")}</span>
          </button>
        </div>

        <div className="relative px-5 pb-8 pt-2 sm:px-8 sm:pb-10">
          {/* Header */}
          <div className="relative flex flex-col gap-5 sm:gap-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#22FF88]/30 bg-[#22FF88]/5 px-3 py-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22FF88] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22FF88]" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#22FF88]">
                {t("manifest.badge")}
              </span>
            </div>

            <div className="grid items-end gap-6 lg:grid-cols-2 lg:gap-10">
              <h2 className="text-[34px] font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[58px]">
                {t("manifest.headline.a")}
                <br />
                <span className="bg-gradient-to-r from-[#22FF88] to-[#0E9F58] bg-clip-text text-transparent">
                  {t("manifest.headline.b")}
                </span>
              </h2>
              <p className="max-w-lg text-[15px] leading-relaxed text-white/60 sm:text-base">
                {t("manifest.lede")}
              </p>
            </div>
          </div>

          {/* Bento grid — sm+ goes side-by-side so it fits the tablet viewport */}
          <div className="relative mt-8 grid grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-12">
            {/* Quantm Picks */}
            <Link
              to="/picks"
              onClick={close}
              className="group relative flex min-h-[240px] flex-col justify-between overflow-hidden rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] p-6 transition-all hover:border-[#22FF88]/50 sm:col-span-7 sm:p-7"
            >
              <div className="pointer-events-none absolute right-5 top-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#22FF88]/25 bg-[#22FF88]/10">
                  <Zap className="h-5 w-5 text-[#22FF88]" />
                </div>
              </div>

              <div className="relative z-10 max-w-[80%] sm:max-w-sm">
                <h3 className="text-xl font-bold text-white sm:text-2xl">{t("manifest.picks.title")}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">
                  {t("manifest.picks.desc")}
                </p>
              </div>

              <div className="relative z-10 mt-6 flex items-end gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-white/40">
                    {t("manifest.picks.metricA")}
                  </span>
                  <span className="font-mono text-xl font-bold text-[#22FF88]">68.4%</span>
                </div>
                <div className="mx-2 h-8 w-px self-end bg-[#1F1F1F]" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-white/40">
                    {t("manifest.picks.metricB")}
                  </span>
                  <span className="font-mono text-xl font-bold text-white">12–15</span>
                </div>
              </div>

              {/* decorative chart */}
              <div className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-1/2 opacity-25 transition-opacity duration-500 group-hover:opacity-50 sm:block">
                <svg className="h-full w-full" viewBox="0 0 200 200" preserveAspectRatio="none">
                  <path d="M0,150 Q50,130 100,160 T200,100" fill="none" stroke="#22FF88" strokeWidth="2" />
                  <path
                    d="M0,160 Q50,140 100,170 T200,110"
                    fill="none"
                    stroke="#22FF88"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                </svg>
              </div>
            </Link>

            {/* Analyse-Agent */}
            <Link
              to="/analyse"
              onClick={close}
              className="group relative flex min-h-[240px] flex-col justify-between overflow-hidden rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] p-6 transition-all hover:border-[#22FF88]/50 sm:col-span-5 sm:p-7"
            >
              <div className="pointer-events-none absolute right-5 top-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#1F1F1F] bg-white/5">
                  <BarChart3 className="h-5 w-5 text-white/80" />
                </div>
              </div>

              <div className="relative z-10 max-w-[80%] sm:max-w-xs">
                <h3 className="text-xl font-bold text-white sm:text-2xl">{t("manifest.analyse.title")}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">
                  {t("manifest.analyse.desc")}
                </p>
              </div>

              <div className="relative z-10 mt-6 grid grid-cols-2 gap-2">
                <Stat label={t("manifest.analyse.zscore")} value="+2.41" />
                <Stat label={t("manifest.analyse.sharpe")} value="1.85" />
                <Stat label={t("manifest.analyse.macd")} value={t("manifest.analyse.bullish")} accent />
                <Stat label={t("manifest.analyse.vol")} value={t("manifest.analyse.low")} />
              </div>
            </Link>

            {/* Contrast bar — compact */}
            <div className="relative flex flex-col items-start justify-between gap-3 overflow-hidden rounded-2xl border border-[#1F1F1F]/70 bg-[#070707] px-5 py-3 sm:col-span-12 sm:flex-row sm:items-center sm:px-6">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                  {t("manifest.diff.label")}
                </span>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-white/40 line-through">{t("manifest.diff.others")}</span>
                  <span className="text-white/30">{t("manifest.diff.vs")}</span>
                  <span className="font-bold text-[#22FF88]">{t("manifest.diff.us")}</span>
                </div>
              </div>
              <Link
                to="/produkte"
                onClick={close}
                className="inline-flex items-center gap-2 rounded-lg bg-[#22FF88] px-4 py-2 text-xs font-bold uppercase tracking-wider text-black transition-colors hover:bg-[#3affa0]"
              >
                {t("manifest.cta")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Footer dismiss hint */}
          <div className="mt-6 flex items-center justify-center">
            <button
              type="button"
              onClick={close}
              className="text-[12px] text-white/40 underline-offset-4 transition hover:text-white/80 hover:underline"
            >
              {t("manifest.later")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-center">
      <span className="block text-[9px] uppercase tracking-wider text-white/40">{label}</span>
      <span className={`text-sm font-bold ${accent ? "text-[#22FF88]" : "text-white"}`}>{value}</span>
    </div>
  );
}
