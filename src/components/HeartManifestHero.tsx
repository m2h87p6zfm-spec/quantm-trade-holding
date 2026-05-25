import { ArrowRight, Zap, BarChart3, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

const DISMISS_KEY = "qt.manifest.dismissed.v1";

/**
 * HeartManifestHero
 * Dismissible manifest popup highlighting the two core products
 * (Quantm Picks + Analysis Agent). Shown once per browser until the
 * user closes it with the X.
 */
export function HeartManifestHero() {
  const t = useT();
  const [open, setOpen] = useState(false);

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

  // Lock body scroll while open + close on Escape
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quantm manifest"
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/80 px-4 py-8 backdrop-blur-sm sm:items-center sm:py-12"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        className="relative my-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-[#1F1F1F] bg-gradient-to-b from-[#0B0B0B] via-[#0A0A0A] to-[#0A0A0A] px-5 py-10 shadow-2xl shadow-black/60 sm:px-8 sm:py-12"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={close}
          aria-label={t("manifest.close")}
          className="absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#1F1F1F] bg-[#111111] text-white/60 transition hover:border-[#22FF88]/40 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

      {/* soft brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(34,255,136,0.10), transparent 70%)" }}
      />

      {/* Header */}
      <div className="relative flex flex-col gap-6">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#22FF88]/30 bg-[#22FF88]/5 px-3 py-1">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22FF88] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22FF88]" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#22FF88]">
            {t("manifest.badge")}
          </span>
        </div>

        <div className="grid items-end gap-8 lg:grid-cols-2 lg:gap-10">
          <h2 className="text-[40px] font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[64px]">
            {t("manifest.headline.a")}
            <br />
            <span className="bg-gradient-to-r from-[#22FF88] to-[#0E9F58] bg-clip-text text-transparent">
              {t("manifest.headline.b")}
            </span>
          </h2>
          <p className="max-w-lg text-base leading-relaxed text-white/55 sm:text-lg">
            {t("manifest.lede")}
          </p>
        </div>
      </div>

      {/* Bento grid */}
      <div className="relative mt-10 grid auto-rows-[minmax(260px,auto)] gap-3 md:grid-cols-12">
        {/* Quantm Picks */}
        <Link
          to="/picks"
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] p-7 transition-all hover:border-[#22FF88]/50 md:col-span-7"
        >
          <div className="absolute right-6 top-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#22FF88]/25 bg-[#22FF88]/10">
              <Zap className="h-5 w-5 text-[#22FF88]" />
            </div>
          </div>

          <div className="relative z-10 max-w-sm">
            <h3 className="text-2xl font-bold text-white">{t("manifest.picks.title")}</h3>
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
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#1F1F1F] bg-[#0A0A0A] p-7 transition-all hover:border-[#22FF88]/50 md:col-span-5"
        >
          <div className="absolute right-6 top-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#1F1F1F] bg-white/5">
              <BarChart3 className="h-5 w-5 text-white/80" />
            </div>
          </div>

          <div className="relative z-10 max-w-xs">
            <h3 className="text-2xl font-bold text-white">{t("manifest.analyse.title")}</h3>
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

        {/* Contrast bar */}
        <div className="relative flex flex-col items-start justify-between gap-4 overflow-hidden rounded-2xl border border-[#1F1F1F]/70 bg-[#070707] px-6 py-4 sm:flex-row sm:items-center md:col-span-12">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
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
            className="inline-flex items-center gap-2 rounded-lg bg-[#22FF88] px-4 py-2 text-xs font-bold uppercase tracking-wider text-black transition-colors hover:bg-[#3affa0]"
          >
            {t("manifest.cta")}
            <ArrowRight className="h-4 w-4" />
          </Link>
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
