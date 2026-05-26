import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLang } from "@/lib/i18n";

type Preview = {
  de: { title: string; desc: string };
  en: { title: string; desc: string };
  /** Inline SVG mini-mockup illustrating the feature. */
  mockup: () => JSX.Element;
};

// Mini-mockup primitives ----------------------------------------------------
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-md border border-border/60 bg-card/80 p-2 ${className}`}>{children}</div>
);

const Bar = ({ w, tone = "muted" }: { w: number; tone?: "bull" | "bear" | "muted" | "primary" }) => {
  const cls = tone === "bull" ? "bg-bull" : tone === "bear" ? "bg-bear" : tone === "primary" ? "bg-primary" : "bg-muted-foreground/40";
  return <div className={`h-1.5 rounded-full ${cls}`} style={{ width: `${w}%` }} />;
};

const Pill = ({ children, tone = "muted" }: { children: React.ReactNode; tone?: "bull" | "bear" | "muted" | "primary" }) => {
  const cls =
    tone === "bull" ? "bg-bull/15 text-bull border-bull/40" :
    tone === "bear" ? "bg-bear/15 text-bear border-bear/40" :
    tone === "primary" ? "bg-primary/15 text-primary border-primary/40" :
    "bg-muted text-muted-foreground border-border";
  return <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold ${cls}`}>{children}</span>;
};

// Mockups -------------------------------------------------------------------
const MockAnalysisAgent = () => (
  <Card>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[10px] font-bold">AAPL · Research Note</span>
      <Pill tone="bull">BUY 78%</Pill>
    </div>
    <div className="space-y-1">
      <Bar w={82} tone="primary" />
      <Bar w={64} tone="muted" />
      <Bar w={48} tone="muted" />
    </div>
    <div className="mt-1.5 text-[9px] text-muted-foreground italic">„Solides Momentum, RSI 62, MACD bullisch …"</div>
  </Card>
);

const MockQuantmPicks = () => (
  <Card>
    <div className="text-[10px] font-bold mb-1.5">Quantm Picks · Heute</div>
    <div className="space-y-1">
      {[
        { t: "NVDA", s: 92, tone: "bull" as const },
        { t: "MSFT", s: 87, tone: "bull" as const },
        { t: "ASML", s: 81, tone: "bull" as const },
        { t: "GOOGL", s: 76, tone: "bull" as const },
      ].map((p) => (
        <div key={p.t} className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono w-10">{p.t}</span>
          <div className="flex-1"><Bar w={p.s} tone={p.tone} /></div>
          <span className="text-[10px] font-bold tabular-nums">{p.s}</span>
        </div>
      ))}
    </div>
  </Card>
);

const MockWatchlist = () => (
  <Card>
    <div className="text-[10px] font-bold mb-1.5">Watchlist · Quant-Signale</div>
    <div className="space-y-1">
      {[
        { t: "AAPL", v: "BUY", c: 74, tone: "bull" as const },
        { t: "TSLA", v: "HOLD", c: 52, tone: "muted" as const },
        { t: "META", v: "SELL", c: 68, tone: "bear" as const },
      ].map((r) => (
        <div key={r.t} className="flex items-center justify-between">
          <span className="text-[10px] font-mono">{r.t}</span>
          <div className="flex items-center gap-1"><Pill tone={r.tone}>{r.v}</Pill><span className="text-[9px] text-muted-foreground tabular-nums">{r.c}%</span></div>
        </div>
      ))}
    </div>
  </Card>
);

const MockAlerts = () => (
  <Card>
    <div className="text-[10px] font-bold mb-1.5">Smart Alerts</div>
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]"><span>NVDA &gt; 145 €</span><Pill tone="bull">Aktiv</Pill></div>
      <div className="flex items-center justify-between text-[10px]"><span>RSI &lt; 30</span><Pill tone="primary">Smart</Pill></div>
      <div className="flex items-center justify-between text-[10px]"><span>News-Sentiment ▼</span><Pill tone="primary">AI</Pill></div>
    </div>
  </Card>
);

const MockPortfolio = () => (
  <Card>
    <div className="flex items-center justify-between mb-1.5"><span className="text-[10px] font-bold">Portfolio</span><span className="text-[10px] font-bold text-bull tabular-nums">+12,4 %</span></div>
    <div className="space-y-1">
      {[60, 80, 45, 70].map((w, i) => <Bar key={i} w={w} tone={i % 2 === 0 ? "bull" : "primary"} />)}
    </div>
    <div className="mt-1.5 text-[9px] text-muted-foreground">Unlimitierte Positionen</div>
  </Card>
);

const MockIndicators = () => (
  <Card>
    <div className="text-[10px] font-bold mb-1.5">Indikator-Breakdown</div>
    <div className="grid grid-cols-2 gap-1">
      {["RSI 62", "MACD ▲", "Z +1,2", "Sharpe 1,4"].map((t, i) => (
        <Pill key={i} tone={i % 2 ? "bull" : "primary"}>{t}</Pill>
      ))}
    </div>
  </Card>
);

const MockNewsAI = () => (
  <Card>
    <div className="text-[10px] font-bold mb-1.5">News-Sentiment (AI)</div>
    {[
      { h: "Fed dovish surprise", t: "bull" as const, s: "+0,72" },
      { h: "TSMC capex cut", t: "bear" as const, s: "−0,41" },
    ].map((n, i) => (
      <div key={i} className="flex items-center justify-between gap-1 text-[10px] mb-0.5">
        <span className="truncate">{n.h}</span><Pill tone={n.t}>{n.s}</Pill>
      </div>
    ))}
  </Card>
);

const MockHeatmap = () => (
  <Card>
    <div className="text-[10px] font-bold mb-1.5">Sektor-Heatmap</div>
    <div className="grid grid-cols-4 gap-0.5">
      {[2, 3, 1, 0, 3, 2, 0, 1, 1, 2, 3, 0].map((v, i) => {
        const colors = ["bg-bear/60", "bg-bear/30", "bg-bull/30", "bg-bull/60"];
        return <div key={i} className={`h-5 rounded-sm ${colors[v]}`} />;
      })}
    </div>
  </Card>
);

const MockCalendar = () => (
  <Card>
    <div className="text-[10px] font-bold mb-1.5">Economic Calendar</div>
    {[
      { t: "FOMC", d: "Mi 20:00", tone: "primary" as const },
      { t: "CPI US", d: "Do 14:30", tone: "bear" as const },
      { t: "NVDA Earnings", d: "Fr 22:00", tone: "bull" as const },
    ].map((e, i) => (
      <div key={i} className="flex items-center justify-between text-[10px] mb-0.5">
        <span>{e.t}</span><Pill tone={e.tone}>{e.d}</Pill>
      </div>
    ))}
  </Card>
);

const MockAILearning = () => (
  <Card>
    <div className="text-[10px] font-bold mb-1.5">AI Learning · Letzte 30 T.</div>
    <div className="flex items-end gap-0.5 h-10">
      {[40, 55, 48, 62, 70, 65, 78, 82, 80, 88].map((h, i) => (
        <div key={i} className="flex-1 bg-primary/60 rounded-sm" style={{ height: `${h}%` }} />
      ))}
    </div>
    <div className="text-[9px] text-muted-foreground mt-1">Trefferquote +18 %</div>
  </Card>
);

const MockSmartMoney = () => (
  <Card>
    <div className="text-[10px] font-bold mb-1.5">Smart-Money & Regime</div>
    <div className="flex items-center gap-1 mb-1"><Pill tone="bull">Risk-On</Pill><Pill tone="primary">Inst. Flow ▲</Pill></div>
    <Bar w={78} tone="primary" />
  </Card>
);

const MockHysteresis = () => (
  <Card>
    <div className="text-[10px] font-bold mb-1.5">Signal-Stabilität</div>
    <div className="flex items-center gap-1">
      <Pill tone="bull">BUY</Pill><span className="text-[10px] text-muted-foreground">→</span>
      <Pill tone="bull">BUY</Pill><span className="text-[10px] text-muted-foreground">→</span>
      <Pill tone="bull">BUY</Pill>
    </div>
    <div className="text-[9px] text-muted-foreground mt-1">Keine Flips bei 0,02 σ Bewegung</div>
  </Card>
);

const MockRealtime = () => (
  <Card>
    <div className="flex items-center justify-between mb-1"><span className="text-[10px] font-bold">AAPL</span><Pill tone="bull">LIVE</Pill></div>
    <div className="text-lg font-bold tabular-nums">214,32 €</div>
    <div className="text-[9px] text-bull">+1,84 % · 0 ms delay</div>
  </Card>
);

const MockPriorityAI = () => (
  <Card>
    <div className="text-[10px] font-bold mb-1.5">Gemini Pro · Analyse</div>
    <Bar w={92} tone="primary" />
    <Bar w={84} tone="primary" />
    <div className="text-[9px] text-muted-foreground mt-1">Tieferes Reasoning, 2× Kontext</div>
  </Card>
);

const MockWebhooks = () => (
  <Card>
    <div className="text-[10px] font-bold mb-1.5">Webhooks</div>
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]"><span>📨 Discord</span><Pill tone="bull">200 OK</Pill></div>
      <div className="flex items-center justify-between text-[10px]"><span>✈️ Telegram</span><Pill tone="bull">200 OK</Pill></div>
    </div>
  </Card>
);

const MockRiskAnalytics = () => (
  <Card>
    <div className="text-[10px] font-bold mb-1.5">Risk-Analytics</div>
    <div className="grid grid-cols-2 gap-1 text-[10px]">
      <div>VaR 95%<div className="font-bold text-bear">−€ 412</div></div>
      <div>β Portfolio<div className="font-bold">1,12</div></div>
      <div>σ ann.<div className="font-bold">18,4 %</div></div>
      <div>Sharpe<div className="font-bold text-bull">1,32</div></div>
    </div>
  </Card>
);

const MockGeneric = () => (
  <Card>
    <div className="space-y-1.5">
      <Bar w={70} tone="primary" />
      <Bar w={55} tone="muted" />
      <Bar w={82} tone="primary" />
    </div>
  </Card>
);

// Preview catalog -----------------------------------------------------------
const PREVIEWS: Record<string, Preview> = {
  "plan.pro.f1": {
    de: { title: "100 Analyse-Credits", desc: "Pro Monat 100 vollständige Aktien-Analysen mit Broker-Style Research Note." },
    en: { title: "100 Analysis credits", desc: "100 full stock analyses per month with broker-style research notes." },
    mockup: MockAnalysisAgent,
  },
  "plan.pro.f2": {
    de: { title: "Volle Quantm Picks", desc: "Die komplette KI-Rangliste aus dem gesamten Universum, nicht nur Top 3." },
    en: { title: "Full Quantm Picks", desc: "The full AI ranking across the entire universe, not just top 3." },
    mockup: MockQuantmPicks,
  },
  "plan.pro.f3": {
    de: { title: "Unlimitierte Watchlist", desc: "Beliebig viele Werte mit BUY/SELL/HOLD-Signal und Konfidenz." },
    en: { title: "Unlimited watchlist", desc: "Track unlimited symbols with BUY/SELL/HOLD signals and confidence." },
    mockup: MockWatchlist,
  },
  "plan.pro.f4": {
    de: { title: "Unlimitierte Smart Alerts", desc: "Preis-, Indikator- und News-Alerts ohne Mengenlimit." },
    en: { title: "Unlimited Smart Alerts", desc: "Price, indicator, and news alerts without any cap." },
    mockup: MockAlerts,
  },
  "plan.pro.f5": {
    de: { title: "Portfolio ohne Limit", desc: "Trag beliebig viele Positionen ein (Free max. 10)." },
    en: { title: "Unlimited portfolio", desc: "Add unlimited positions (Free is capped at 10)." },
    mockup: MockPortfolio,
  },
  "plan.pro.f6": {
    de: { title: "Analyse-Agent", desc: "Strukturierte Research Note pro Aktie: Bewertung, Indikatoren, Risiken." },
    en: { title: "Analysis Agent", desc: "Structured research note per stock: valuation, indicators, risks." },
    mockup: MockAnalysisAgent,
  },
  "plan.pro.f7": {
    de: { title: "Indikator-Breakdown", desc: "RSI, MACD, Bollinger, Z-Score, Sharpe, Beta jeweils mit Klartext-Lesart." },
    en: { title: "Indicator breakdown", desc: "RSI, MACD, Bollinger, Z-Score, Sharpe, Beta — each with a plain-text reading." },
    mockup: MockIndicators,
  },
  "plan.pro.f8": {
    de: { title: "AI News-Sentiment", desc: "Gemini Flash bewertet News in Echtzeit und liefert einen Score pro Schlagzeile." },
    en: { title: "AI news sentiment", desc: "Gemini Flash scores news in real time, giving a sentiment per headline." },
    mockup: MockNewsAI,
  },
  "plan.pro.f9": {
    de: { title: "Sektor-Heatmap", desc: "Performance aller Sektoren auf einen Blick, alle Timeframes verfügbar." },
    en: { title: "Sector heatmap", desc: "Performance across all sectors at a glance, all timeframes available." },
    mockup: MockHeatmap,
  },
  "plan.pro.f10": {
    de: { title: "Economic Calendar", desc: "Earnings, Notenbankentscheide, Makrodaten mit Volatilitäts-Tag." },
    en: { title: "Economic calendar", desc: "Earnings, central-bank decisions, macro data with volatility tag." },
    mockup: MockCalendar,
  },
  "plan.elite.f1": {
    de: { title: "200 Analyse-Credits", desc: "Doppelt so viele tiefe Analysen pro Monat wie im Pro-Tarif." },
    en: { title: "200 Analysis credits", desc: "Twice as many deep analyses per month vs. Pro." },
    mockup: MockAnalysisAgent,
  },
  "plan.elite.f3": {
    de: { title: "AI Learning", desc: "Sieh, was die Engine aus vergangenen Trades lernt und wo sie besser wird." },
    en: { title: "AI Learning", desc: "See what the engine learns from past trades and where accuracy improves." },
    mockup: MockAILearning,
  },
  "plan.elite.f4": {
    de: { title: "Institutional Decision Engine", desc: "Picks zusätzlich gefiltert über Smart-Money-Flows und Markt-Regime." },
    en: { title: "Institutional Decision Engine", desc: "Picks additionally filtered via smart-money flows and market regime." },
    mockup: MockSmartMoney,
  },
  "plan.elite.f5": {
    de: { title: "Hysterese-Stabilität", desc: "Signale flippen nicht bei jedem 0,1 % Rauschen, Confidence-Bänder dämpfen Lärm." },
    en: { title: "Hysteresis stability", desc: "Signals don't flip on every 0.1 % noise; confidence bands dampen chatter." },
    mockup: MockHysteresis,
  },
  "plan.elite.f6": {
    de: { title: "Realtime-Streaming", desc: "Live-Kurse ohne 15-Min-Delay über WebSocket." },
    en: { title: "Realtime streaming", desc: "Live prices without the 15-min delay via WebSocket." },
    mockup: MockRealtime,
  },
  "plan.elite.f7": {
    de: { title: "Priority AI", desc: "Analysen mit Gemini Pro statt Flash, tieferes Reasoning und mehr Kontext." },
    en: { title: "Priority AI", desc: "Analyses use Gemini Pro instead of Flash for deeper reasoning and more context." },
    mockup: MockPriorityAI,
  },
  "plan.elite.f8": {
    de: { title: "Custom Webhooks", desc: "Push deine Alerts direkt nach Discord, Telegram oder einen eigenen Endpoint." },
    en: { title: "Custom webhooks", desc: "Push your alerts directly to Discord, Telegram, or your own endpoint." },
    mockup: MockWebhooks,
  },
  "plan.elite.f9": {
    de: { title: "Portfolio Risk-Analytics", desc: "VaR, Korrelationen, gewichtetes Beta und Sharpe für dein Gesamtportfolio." },
    en: { title: "Portfolio risk analytics", desc: "VaR, correlations, weighted beta and Sharpe for your full portfolio." },
    mockup: MockRiskAnalytics,
  },
  "plan.elite.f10": {
    de: { title: "Priority Support", desc: "Bevorzugte Antwortzeiten bei Anfragen direkt vom Team." },
    en: { title: "Priority support", desc: "Faster response times for support requests, direct from the team." },
    mockup: MockGeneric,
  },
};

export function FeaturePreviewPopover({ featureKey }: { featureKey: string }) {
  const lang = useLang();
  const p = PREVIEWS[featureKey];
  if (!p) return null;
  const txt = lang === "en" ? p.en : p.de;
  const Mock = p.mockup;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={txt.title}
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-72 p-3">
        <div className="text-xs font-bold mb-1">{txt.title}</div>
        <p className="text-[11px] text-muted-foreground leading-snug mb-2">{txt.desc}</p>
        <Mock />
      </PopoverContent>
    </Popover>
  );
}
