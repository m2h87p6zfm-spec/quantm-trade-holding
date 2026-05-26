import { ArrowRight, Zap, BarChart3, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";

const DISMISS_KEY = "qt.manifest.dismissed.v2";

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
        "fixed inset-0 z-[100] flex items-end justify-center sm:items-center",
        "bg-foreground/40 backdrop-blur-sm transition-opacity duration-200",
        enter ? "opacity-100" : "opacity-0",
      ].join(" ")}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        className={[
          "relative flex w-full flex-col overflow-hidden border border-border bg-card text-card-foreground shadow-2xl",
          "max-h-[92vh] rounded-t-3xl border-t",
          "sm:max-h-[calc(100vh-3rem)] sm:max-w-[460px] sm:rounded-2xl sm:border sm:mx-4",
          "transition-all duration-300 ease-out",
          enter
            ? "translate-y-0 opacity-100 sm:scale-100"
            : "translate-y-8 opacity-0 sm:translate-y-0 sm:scale-95",
        ].join(" ")}
      >
        {/* mobile grabber */}
        <div className="flex justify-center pt-2 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* soft brand glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 h-[280px] w-[280px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--bull) 30%, transparent), transparent 70%)" }}
        />

        {/* Top bar */}
        <div className="relative flex items-center justify-between px-5 pt-4 sm:px-6 sm:pt-5">
          <div className="inline-flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bull opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-bull" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-bull">
              {t("manifest.badge")}
            </span>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label={t("manifest.close")}
            className="-mr-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:border-bull/50 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-bull/60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="relative flex-1 overflow-y-auto px-5 pb-5 pt-6 sm:px-6 sm:pt-7">
          <h2 className="text-[30px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-[36px]">
            {t("manifest.headline.a")}
            <br />
            <span className="bg-gradient-to-r from-bull to-[color-mix(in_oklab,var(--bull)_60%,var(--foreground))] bg-clip-text text-transparent">
              {t("manifest.headline.b")}
            </span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">{t("manifest.lede")}</p>

          {/* Stacked product cards */}
          <div className="mt-6 flex flex-col gap-3">
            {/* Picks */}
            <Link
              to="/picks"
              onClick={close}
              className="group relative flex items-start gap-4 overflow-hidden rounded-2xl border border-border bg-background p-4 transition-all hover:border-bull/50 hover:bg-accent/40 sm:p-5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-bull/25 bg-bull/10">
                <Zap className="h-4.5 w-4.5 text-bull" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-foreground">{t("manifest.picks.title")}</h3>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-bull" />
                </div>
                <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{t("manifest.picks.desc")}</p>
                <div className="mt-3 flex items-center gap-4">
                  <Metric label={t("manifest.picks.metricA")} value="68.4%" accent />
                  <span className="h-6 w-px bg-border" />
                  <Metric label={t("manifest.picks.metricB")} value="12–15" />
                </div>
              </div>
            </Link>

            {/* Analyse */}
            <Link
              to="/analyse"
              onClick={close}
              className="group relative flex items-start gap-4 overflow-hidden rounded-2xl border border-border bg-background p-4 transition-all hover:border-bull/50 hover:bg-accent/40 sm:p-5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted">
                <BarChart3 className="h-4.5 w-4.5 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-foreground">{t("manifest.analyse.title")}</h3>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-bull" />
                </div>
                <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{t("manifest.analyse.desc")}</p>
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
          <div className="mt-5 rounded-xl border border-border bg-muted/40 px-4 py-3">
            <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {t("manifest.diff.label")}
            </div>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="text-muted-foreground line-through">{t("manifest.diff.others")}</span>
              <span className="text-muted-foreground/60">{t("manifest.diff.vs")}</span>
              <span className="font-semibold text-bull">{t("manifest.diff.us")}</span>
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="relative border-t border-border bg-card px-5 py-4 sm:px-6">
          <Link
            to="/produkte"
            onClick={close}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-bull px-4 py-3 text-sm font-semibold text-background transition-colors hover:bg-bull/90"
          >
            {t("manifest.cta")}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={close}
            className="mt-2 block w-full text-center text-[12px] text-muted-foreground transition hover:text-foreground"
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
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`font-mono text-base font-semibold ${accent ? "text-bull" : "text-foreground"}`}>
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
          ? "border-bull/30 bg-bull/10 text-bull"
          : "border-border bg-muted text-muted-foreground"
      }`}
    >
      {label}
    </div>
  );
}
