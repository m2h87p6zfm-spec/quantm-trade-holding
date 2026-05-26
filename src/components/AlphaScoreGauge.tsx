import { Gauge } from "lucide-react";

// Setup-Score-Tachometer (0–100). SVG-Halbkreis-Gauge.
export function AlphaScoreGauge({ score, label = "Setup-Score" }: { score: number; label?: string }) {
  const s = Math.max(0, Math.min(100, score));
  const angle = (s / 100) * 180 - 90; // -90° bis +90°
  const tone =
    s >= 70 ? "text-bull" : s <= 30 ? "text-bear" : s >= 55 ? "text-cyan-accent" : "text-muted-foreground";
  const verdict =
    s >= 75 ? "Starkes Setup" : s >= 55 ? "Konstruktiv" : s >= 40 ? "Neutral" : s >= 25 ? "Schwach" : "Riskant";

  // Bogen-Konstruktion
  const R = 70;
  const cx = 90;
  const cy = 90;
  const arcPath = (a1: number, a2: number) => {
    const r1 = (a1 * Math.PI) / 180;
    const r2 = (a2 * Math.PI) / 180;
    const x1 = cx + R * Math.cos(r1);
    const y1 = cy + R * Math.sin(r1);
    const x2 = cx + R * Math.cos(r2);
    const y2 = cy + R * Math.sin(r2);
    return `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`;
  };

  return (
    <div className="card-glow rounded-xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <Gauge className="h-4 w-4 text-gold" />
      </div>
      <div className="relative flex-1 flex flex-col items-center justify-center">
        <svg viewBox="0 0 180 110" className="w-full max-w-[220px]">
          {/* Hintergrund-Bogen */}
          <path d={arcPath(180, 360)} stroke="var(--muted)" strokeWidth="10" fill="none" strokeLinecap="round" />
          {/* Farbsegmente */}
          <path d={arcPath(180, 216)} stroke="var(--bear)" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.55" />
          <path d={arcPath(216, 252)} stroke="oklch(0.70 0.16 50)" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.55" />
          <path d={arcPath(252, 288)} stroke="var(--neutral-signal)" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.55" />
          <path d={arcPath(288, 324)} stroke="var(--cyan-accent)" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.55" />
          <path d={arcPath(324, 360)} stroke="var(--bull)" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.55" />
          {/* Nadel */}
          <g style={{ transition: "transform 800ms cubic-bezier(.34,1.56,.64,1)", transformOrigin: `${cx}px ${cy}px`, transform: `rotate(${angle}deg)` }}>
            <line x1={cx} y1={cy} x2={cx} y2={cy - R + 6} stroke="var(--foreground)" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx={cx} cy={cy} r="6" fill="var(--foreground)" />
            <circle cx={cx} cy={cy} r="3" fill="var(--background)" />
          </g>
        </svg>
        <div className="mt-1 text-center pointer-events-none">
          <div className={`text-3xl font-bold tabular-nums leading-none ${tone}`}>{s}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">{verdict}</div>
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-2 px-1">
        <span>0</span><span>50</span><span>100</span>
      </div>
    </div>
  );
}
