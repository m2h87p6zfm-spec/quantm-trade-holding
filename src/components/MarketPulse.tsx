import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Activity } from "lucide-react";

type Props = { long: number; short: number; neutral: number };

// Market Pulse — animiertes Donut-Diagramm: LONG vs SHORT vs NEUTRAL
// über alle beobachteten Werte. Reine Aggregation echter Signale.
export function MarketPulse({ long, short, neutral }: Props) {
  const total = long + short + neutral;
  const data = [
    { name: "LONG", value: long, color: "var(--bull)" },
    { name: "SHORT", value: short, color: "var(--bear)" },
    { name: "NEUTRAL", value: neutral, color: "var(--muted-foreground)" },
  ];
  const dominant = long > short ? "LONG" : short > long ? "SHORT" : "NEUTRAL";
  const dominantPct = total > 0 ? Math.round((Math.max(long, short, neutral) / total) * 100) : 0;
  const tone = dominant === "LONG" ? "text-bull" : dominant === "SHORT" ? "text-bear" : "text-muted-foreground";

  return (
    <div className="card-glow rounded-xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Market Pulse
        </div>
        <Activity className="h-4 w-4 text-primary" />
      </div>
      <div className="relative flex-1 min-h-[180px]">
        {total === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground shimmer-text">
            wird berechnet…
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  innerRadius="68%"
                  outerRadius="92%"
                  paddingAngle={2}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive
                  animationDuration={900}
                >
                  {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className={`text-3xl font-bold tabular-nums ${tone}`}>{dominantPct}%</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
                {dominant}
              </div>
            </div>
          </>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/50">
        <Legend dot="var(--bull)" label="Long" value={long} />
        <Legend dot="var(--bear)" label="Short" value={short} />
        <Legend dot="var(--muted-foreground)" label="Neutral" value={neutral} />
      </div>
    </div>
  );
}

function Legend({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <div className="text-lg font-bold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
