import { ArrowRight, Zap, BarChart3, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";

const DISMISS_KEY = "qt.manifest.dismissed.v1";

/**
 * HeartManifestHero
 * Dismissible side panel (desktop, right-aligned) / bottom sheet (mobile)
 * highlighting the two core products. Apple-style: minimal copy, maximum
 * intent. Shown once per browser until dismissed.
 */
export function HeartManifestHero() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [enter, setEnter] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && !localStorage.getItem(DISMISS_KEY)) {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => setEnter(true));
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 80);
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
    window.setTimeout(() => setOpen(false), 220);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quantm manifest"
      className={[
        "fixed inset-0 z-[100] flex items-end justify-center sm:items-stretch sm:justify-end",
        "bg-black/60 backdrop-blur-sm transition-opacity duration-200",
        enter ? "opacity-100" : "opacity-0",
      ].join(" ")}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        className={[
          // Mobile = bottom sheet; sm+ = right-side panel
          "relative flex w-full flex-col overflow-hidden border-[#1F1F1F] bg-[#0A0A0A] shadow-2xl shadow-black/80",
          "max-h-[92vh] rounded-t-3xl border-t",
          "sm:my-4 sm:mr-4 sm:max-h-[calc(100vh-2rem)] sm:max-w-[420px] sm:rounded-2xl sm:border",
          "transition-all duration-300 ease-out",
          enter
            ? "translate-y-0 opacity-100 sm:translate-x-0"
            : "translate-y-8 opacity-0 sm:translate-y-0 sm:translate-x-8",
        ].join(" ")}
      >
        {/* mobile grabber */}
        <div className="flex justify-center pt-2 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-white/15" />
        </div>

        {/* soft brand glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 h-[280px] w-[280px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(34,255,136,0.18), transparent 70%)" }}
        />

        {/* Top bar */}
        <div className="relative flex items-center justify-between px-5 pt-4 sm:px-6 sm:pt-5">
          <div className="inline-flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22FF88] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#22FF88]" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#22FF88]">
              {t("manifest.badge")}
            </span>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label={t("manifest.close")}
            className="-mr-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#1F1F1F] bg-[#111111] text-white/60 transition hover:border-[#22FF88]/40 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22FF88]/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="relative flex-1 overflow-y-auto px-5 pb-5 pt-6 sm:px-6 sm:pt-7">
          {/* Headline */}
          <h2 className="text-[34px] font-semibold leading-[1.02] tracking-tight text-white sm:text-[40px]">
            {t("manifest.headline.a")}
            <br />
            <span className="bg-gradient-to-r from-[#22FF88] to-[#0E9F58] bg-clip-text text-transparent">
              {t("manifest.headline.b")}
            </span>
          </h2>
          <p className="mt-3 text-sm text-white/55 sm:text-base">{t("manifest.lede")}</p>

          {/* Stacked product cards */}
          <div className="mt-6 flex flex-col gap-3">
            {/* Picks */}
            <Link
              to="/picks"
              onClick={close}
              className="group relative flex items-start gap-4 overflow-hidden rounded-2xl border border-[#1F1F1F] bg-gradient-to-br from-[#0F0F0F] to-[#0A0A0A] p-4 transition-all hover:border-[#22FF88]/50 sm:p-5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#22FF88]/25 bg-[#22FF88]/10">
                <Zap className="h-4.5 w-4.5 text-[#22FF88]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-white">{t("manifest.picks.title")}</h3>
                  <ArrowRight className="h-4 w-4 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-[#22FF88]" />
                </div>
                <p className="mt-1 text-[13px] leading-snug text-white/55">{t("manifest.picks.desc")}</p>
                <div className="mt-3 flex items-center gap-4">
                  <Metric label={t("manifest.picks.metricA")} value="68.4%" accent />
                  <span className="h-6 w-px bg-[#1F1F1F]" />
                  <Metric label={t("manifest.picks.metricB")} value="12–15" />
                </div>
              </div>
            </Link>

            {/* Analyse */}
            <Link
              to="/analyse"
              onClick={close}
              className="group relative flex items-start gap-4 overflow-hidden rounded-2xl border border-[#1F1F1F] bg-gradient-to-br from-[#0F0F0F] to-[#0A0A0A] p-4 transition-all hover:border-[#22FF88]/50 sm:p-5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <BarChart3 className="h-4.5 w-4.5 text-white/80" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-white">{t("manifest.analyse.title")}</h3>
                  <ArrowRight className="h-4 w-4 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-[#22FF88]" />
                </div>
                <p className="mt-1 text-[13px] leading-snug text-white/55">{t("manifest.analyse.desc")}</p>
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  <Tag label={t("manifest.analyse.zscore")} />
                  <Tag label={t("manifest.analyse.sharpe")} />
                  <Tag label={t("manifest.analyse.macd")} accent />
                  <Tag label={t("manifest.analyse.vol")} />
                </div>
              </div>
            </Link>
          </div>

          {/* Difference */}
          <div className="mt-5 rounded-xl border border-[#1F1F1F]/70 bg-[#070707] px-4 py-3">
            <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/35">
              {t("manifest.diff.label")}
            </div>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="text-white/40 line-through">{t("manifest.diff.others")}</span>
              <span className="text-white/25">{t("manifest.diff.vs")}</span>
              <span className="font-semibold text-[#22FF88]">{t("manifest.diff.us")}</span>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="relative border-t border-[#1F1F1F] bg-[#0A0A0A]/95 px-5 py-4 sm:px-6">
          <Link
            to="/produkte"
            onClick={close}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#22FF88] px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#3affa0]"
          >
            {t("manifest.cta")}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={close}
            className="mt-2 block w-full text-center text-[12px] text-white/40 transition hover:text-white/70"
          >
            {t("manifest.later")}
          </button>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-wider text-white/40">{label}</span>
      <span className={`font-mono text-base font-semibold ${accent ? "text-[#22FF88]" : "text-white"}`}>
        {value}
      </span>
    </div>
  );
}

function Tag({ label, accent = false }: { label: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-md border px-1.5 py-1 text-center text-[10px] font-medium ${
        accent
          ? "border-[#22FF88]/30 bg-[#22FF88]/10 text-[#22FF88]"
          : "border-white/10 bg-white/5 text-white/70"
      }`}
    >
      {label}
    </div>
  );
}
