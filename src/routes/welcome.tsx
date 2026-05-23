import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Lock, ShieldCheck, Sparkles, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApexLogo } from "@/components/ApexLogo";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome — Quantm Trade" },
      { name: "description", content: "Personalized intelligence starts with understanding your workflow." },
    ],
  }),
  component: WelcomePage,
});

type Answers = {
  language?: string;
  goal?: string;
  experience?: string;
  risk?: string;
  industry?: string;
  workflow?: string;
  tone?: string;
  newsSources?: string[];
  email?: string;
};

const STORAGE_KEY = "apex_onboarding";

const NEWS_SOURCE_OPTIONS: { key: "reuters" | "bloomberg" | "ft" | "cnbc" | "yahoo"; label: string; desc: string }[] = [
  { key: "reuters", label: "Reuters", desc: "Global wire — Markets & Macro" },
  { key: "bloomberg", label: "Bloomberg", desc: "Institutional flow & earnings" },
  { key: "ft", label: "Financial Times", desc: "Europe & deep analysis" },
  { key: "cnbc", label: "CNBC", desc: "US live coverage" },
  { key: "yahoo", label: "Yahoo Finance", desc: "Retail-focused aggregation" },
];

function loadAnswers(): Answers {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}
function saveAnswers(a: Answers) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(a)); } catch { /* noop */ }
}

/** Persist the chosen news sources into the live app settings (ta_settings). */
function persistNewsSources(selected: string[]) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("ta_settings");
    const cur = raw ? JSON.parse(raw) : {};
    const allKeys = NEWS_SOURCE_OPTIONS.map((o) => o.key);
    const map: Record<string, boolean> = {};
    for (const k of allKeys) map[k] = selected.includes(k);
    cur.newsSources = { ...(cur.newsSources || {}), ...map };
    localStorage.setItem("ta_settings", JSON.stringify(cur));
    window.dispatchEvent(new CustomEvent("ta_settings_change"));
  } catch { /* noop */ }
}

const TOTAL_STEPS = 12;

function WelcomePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answers>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setAnswers(loadAnswers()); setMounted(true); }, []);
  useEffect(() => { if (mounted) saveAnswers(answers); }, [answers, mounted]);

  const next = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));
  const set = (patch: Partial<Answers>) => setAnswers((a) => ({ ...a, ...patch }));
  const pickAndNext = (patch: Partial<Answers>) => { set(patch); setTimeout(next, 180); };

  const progress = useMemo(() => Math.round(((step - 1) / (TOTAL_STEPS - 1)) * 100), [step]);

  return (
    <div className="relative min-h-[calc(100vh-3rem)] overflow-hidden bg-background text-foreground">
      {/* ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-primary/15 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[520px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(to_right,hsl(var(--foreground))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground))_1px,transparent_1px)] bg-[size:56px_56px]" />
      </div>

      {/* top bar */}
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 pt-8">
        <div className="flex items-center gap-2 text-sm font-medium tracking-tight">
          <ApexLogo className="h-5 w-5" />
          <span>Quantm Intelligence</span>
        </div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {String(step).padStart(2, "0")} / {String(TOTAL_STEPS).padStart(2, "0")}
        </div>
      </div>

      {/* progress */}
      <div className="mx-auto mt-6 max-w-3xl px-6">
        <div className="h-[2px] w-full overflow-hidden rounded-full bg-border/60">
          <div
            className="h-full bg-gradient-to-r from-primary/60 via-primary to-primary/60 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* content */}
      <div className="mx-auto flex max-w-3xl flex-col px-6 pb-24 pt-14 sm:pt-20">
        <div key={step} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {step === 1 && <ScreenWelcome onNext={next} />}
          {step === 2 && (
            <ScreenChoice
              eyebrow="Localization"
              title="Which language would you like to use?"
              subtitle="Your entire experience adapts accordingly."
              options={["English", "Deutsch", "Français", "Español", "العربية", "Other"]}
              value={answers.language}
              onSelect={(v) => pickAndNext({ language: v })}
            />
          )}
          {step === 3 && (
            <ScreenChoice
              eyebrow="Intent"
              title="What would you like to achieve with AI?"
              subtitle="We tailor the workspace around your primary objective."
              options={["Productivity", "Business Growth", "Automation", "Research", "Content Creation", "Coding", "Investing", "Learning", "Personal Assistant", "Other"]}
              value={answers.goal}
              onSelect={(v) => pickAndNext({ goal: v })}
              grid={2}
            />
          )}
          {step === 4 && (
            <ScreenChoice
              eyebrow="Profile"
              title="How experienced are you with AI tools?"
              subtitle="Calibrates depth, defaults, and guidance."
              options={["Beginner", "Intermediate", "Advanced", "Expert"]}
              value={answers.experience}
              onSelect={(v) => pickAndNext({ experience: v })}
            />
          )}
          {step === 5 && (
            <ScreenChoice
              eyebrow="Autonomy"
              title="What level of AI autonomy are you comfortable with?"
              subtitle="This configures safety, automation depth, and decision-making permissions."
              options={["Conservative", "Balanced", "Advanced", "Autonomous"]}
              value={answers.risk}
              onSelect={(v) => pickAndNext({ risk: v })}
            />
          )}
          {step === 6 && (
            <ScreenChoice
              eyebrow="Context"
              title="Which industry best describes your work?"
              subtitle="Used to prioritize templates, data sources, and workflows."
              options={["Technology", "Finance", "Education", "Healthcare", "E-Commerce", "Marketing", "Real Estate", "Engineering", "Creative", "Other"]}
              value={answers.industry}
              onSelect={(v) => pickAndNext({ industry: v })}
              grid={2}
            />
          )}
          {step === 7 && (
            <ScreenChoice
              eyebrow="Workflow"
              title="How would you primarily use your AI agent?"
              subtitle="Shapes the default agent surface and shortcuts."
              options={["Daily work assistant", "Research analyst", "Executive assistant", "Automation operator", "Coding copilot", "Strategic advisor", "Personal productivity", "Team collaboration"]}
              value={answers.workflow}
              onSelect={(v) => pickAndNext({ workflow: v })}
              grid={2}
            />
          )}
          {step === 8 && (
            <ScreenChoice
              eyebrow="Voice"
              title="How should your AI communicate?"
              subtitle="Determines tone, length, and decision framing."
              options={["Concise", "Professional", "Strategic", "Technical", "Friendly", "Executive"]}
              value={answers.tone}
              onSelect={(v) => pickAndNext({ tone: v })}
              grid={2}
            />
          )}
          {step === 9 && (
            <ScreenNewsSources
              value={answers.newsSources ?? NEWS_SOURCE_OPTIONS.map((o) => o.key)}
              onChange={(v) => set({ newsSources: v })}
              onContinue={() => {
                persistNewsSources(answers.newsSources ?? NEWS_SOURCE_OPTIONS.map((o) => o.key));
                next();
              }}
            />
          )}
          {step === 10 && (
            <ScreenEmail
              value={answers.email ?? ""}
              onChange={(v) => set({ email: v })}
              onContinue={next}
            />
          )}
          {step === 11 && <ScreenLoading onDone={next} />}
          {step === 12 && (
            <ScreenFinal
              email={answers.email}
              onEnter={() => navigate({ to: "/login" })}
              onTour={() => navigate({ to: "/" })}
            />
          )}
        </div>

        {/* footer nav */}
        {step > 1 && step !== 11 && (
          <div className="mt-10 flex items-center justify-between text-xs text-muted-foreground">
            <button onClick={back} className="hover:text-foreground transition-colors">Back</button>
            <div className="flex items-center gap-2">
              <Lock className="h-3 w-3" />
              <span>End-to-end encrypted</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Screens ---------- */

function ScreenWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
        <Sparkles className="h-3 w-3 text-primary" /> Quantm Intelligence
      </div>
      <h1 className="max-w-2xl text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
        Welcome to the next generation of <span className="text-gradient-primary">AI assistance</span>.
      </h1>
      <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
        Personalized intelligence starts with understanding your workflow.
      </p>
      <Button onClick={onNext} size="lg" className="mt-10 h-12 px-8 text-sm font-medium">
        Continue <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
      <div className="mt-10 flex items-center gap-6 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
        <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Enterprise security</span>
        <span className="inline-flex items-center gap-1.5"><Cpu className="h-3 w-3" /> Adaptive memory</span>
      </div>
    </div>
  );
}

function ScreenChoice({
  eyebrow, title, subtitle, options, value, onSelect, grid = 1,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  options: string[];
  value?: string;
  onSelect: (v: string) => void;
  grid?: 1 | 2;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-primary/80">{eyebrow}</div>
      <h2 className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground">{subtitle}</p>}
      <div className={`mt-10 grid gap-2.5 ${grid === 2 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              onClick={() => onSelect(opt)}
              className={[
                "group relative flex items-center justify-between rounded-xl border px-5 py-4 text-left text-[14px] font-medium transition-all duration-200",
                "backdrop-blur",
                selected
                  ? "border-primary/60 bg-primary/10 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_10px_40px_-12px_hsl(var(--primary)/0.4)]"
                  : "border-border/60 bg-card/40 text-foreground/90 hover:border-foreground/30 hover:bg-card/70",
              ].join(" ")}
            >
              <span>{opt}</span>
              <span className={[
                "flex h-5 w-5 items-center justify-center rounded-full border transition-all",
                selected ? "border-primary bg-primary text-primary-foreground" : "border-border/60 text-transparent group-hover:border-foreground/40",
              ].join(" ")}>
                <Check className="h-3 w-3" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScreenEmail({ value, onChange, onContinue }: { value: string; onChange: (v: string) => void; onContinue: () => void }) {
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-primary/80">Secure Workspace</div>
      <h2 className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
        Create your secure AI workspace
      </h2>
      <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
        Your configuration and memory profile will be securely stored.
      </p>

      <div className="mt-10 max-w-md">
        <Input
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="you@company.com"
          className="h-12 bg-card/40 backdrop-blur text-[15px]"
          autoComplete="email"
        />
        <Button
          disabled={!valid}
          onClick={onContinue}
          size="lg"
          className="mt-3 h-12 w-full text-sm font-medium"
        >
          Continue Securely <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TrustChip icon={<Lock className="h-3 w-3" />} label="End-to-end encrypted" />
          <TrustChip icon={<Cpu className="h-3 w-3" />} label="Private memory" />
          <TrustChip icon={<ShieldCheck className="h-3 w-3" />} label="Enterprise-grade" />
        </div>
      </div>
    </div>
  );
}

function TrustChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/30 px-3 py-2 text-[11px] text-muted-foreground backdrop-blur">
      <span className="text-primary/80">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

const LOADING_LINES = [
  "Initializing intelligence layer",
  "Building personalized workflows",
  "Configuring adaptive memory",
  "Preparing secure environment",
];

function ScreenLoading({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setI((prev) => {
        if (prev >= LOADING_LINES.length - 1) {
          clearInterval(t);
          setTimeout(onDone, 900);
          return prev;
        }
        return prev + 1;
      });
    }, 1100);
    return () => clearInterval(t);
  }, [onDone]);

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
      <div className="relative mb-10 h-20 w-20">
        <div className="absolute inset-0 rounded-full border border-primary/30" />
        <div className="absolute inset-0 animate-spin rounded-full border-t-2 border-primary" style={{ animationDuration: "2.4s" }} />
        <div className="absolute inset-2 rounded-full bg-primary/10 backdrop-blur" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
      </div>
      <div className="space-y-2.5">
        {LOADING_LINES.map((line, idx) => (
          <div
            key={line}
            className={[
              "flex items-center justify-center gap-2 text-[14px] transition-all duration-500",
              idx < i ? "text-muted-foreground/60" : idx === i ? "text-foreground" : "text-muted-foreground/30",
            ].join(" ")}
          >
            {idx < i ? <Check className="h-3.5 w-3.5 text-primary" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            <span>{line}…</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenFinal({ email, onEnter, onTour }: { email?: string; onEnter: () => void; onTour: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-primary backdrop-blur">
        <Check className="h-3 w-3" /> Environment ready
      </div>
      <h1 className="max-w-2xl text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
        Your AI environment is <span className="text-gradient-primary">ready</span>.
      </h1>
      <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
        You now have access to a personalized intelligence system optimized for your goals.
      </p>
      {email && (
        <div className="mt-6 rounded-lg border border-border/60 bg-card/40 px-4 py-2 text-xs text-muted-foreground backdrop-blur">
          Workspace: <span className="text-foreground/90">{email}</span>
        </div>
      )}
      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
        <Button onClick={onEnter} size="lg" className="h-12 px-8 text-sm font-medium">
          Enter Workspace <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button onClick={onTour} variant="ghost" size="lg" className="h-12 px-8 text-sm font-medium">
          Watch Quick Overview
        </Button>
      </div>
    </div>
  );
}

function ScreenNewsSources({
  value, onChange, onContinue,
}: { value: string[]; onChange: (v: string[]) => void; onContinue: () => void }) {
  const toggle = (key: string) => {
    if (value.includes(key)) onChange(value.filter((x) => x !== key));
    else onChange([...value, key]);
  };
  const valid = value.length > 0;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-primary/80">News Feed</div>
      <h2 className="mt-3 text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
        Which sources should power your news feed?
      </h2>
      <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
        Choose the agencies you trust. You can change this anytime in Settings.
      </p>

      <div className="mt-10 grid gap-2.5 sm:grid-cols-2">
        {NEWS_SOURCE_OPTIONS.map((opt) => {
          const selected = value.includes(opt.key);
          return (
            <button
              key={opt.key}
              onClick={() => toggle(opt.key)}
              className={[
                "group relative flex items-start justify-between gap-3 rounded-xl border px-5 py-4 text-left transition-all duration-200 backdrop-blur",
                selected
                  ? "border-primary/60 bg-primary/10 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_10px_40px_-12px_hsl(var(--primary)/0.4)]"
                  : "border-border/60 bg-card/40 text-foreground/90 hover:border-foreground/30 hover:bg-card/70",
              ].join(" ")}
            >
              <div>
                <div className="text-[14px] font-semibold">{opt.label}</div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">{opt.desc}</div>
              </div>
              <span className={[
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
                selected ? "border-primary bg-primary text-primary-foreground" : "border-border/60 text-transparent group-hover:border-foreground/40",
              ].join(" ")}>
                <Check className="h-3 w-3" />
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {value.length} of {NEWS_SOURCE_OPTIONS.length} selected
        </span>
        <Button onClick={onContinue} disabled={!valid} size="lg" className="h-12 px-8 text-sm font-medium">
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
