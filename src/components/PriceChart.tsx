import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { bollinger, ema, rsi as rsiCalc, sma } from "@/lib/indicators";

export function PriceChart({ closes, times }: { closes: number[]; times: number[] }) {
  const sma20 = sma(closes, 20);
  // Rolling Bollinger
  const upper: number[] = []; const lower: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < 19) { upper.push(NaN); lower.push(NaN); continue; }
    const b = bollinger(closes.slice(0, i + 1), 20, 2);
    upper.push(b.upper); lower.push(b.lower);
  }
  const data = closes.map((c, i) => ({
    t: new Date(times[i] * 1000).toLocaleDateString("de-DE", { month: "short", day: "2-digit" }),
    close: c, sma: sma20[i], upper: upper[i], lower: lower[i],
  }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="px" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--cyan-accent)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--cyan-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="t" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} minTickGap={40} />
          <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} domain={["auto", "auto"]} />
          <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
          <Area type="monotone" dataKey="close" stroke="var(--cyan-accent)" fill="url(#px)" strokeWidth={2} isAnimationActive={false} />
          <Line type="monotone" dataKey="sma" stroke="var(--primary)" strokeWidth={1} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="upper" stroke="var(--muted-foreground)" strokeDasharray="3 3" strokeWidth={1} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="lower" stroke="var(--muted-foreground)" strokeDasharray="3 3" strokeWidth={1} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RsiChart({ closes }: { closes: number[] }) {
  const data: { i: number; rsi: number }[] = [];
  for (let i = 14; i < closes.length; i++) {
    data.push({ i, rsi: rsiCalc(closes.slice(0, i + 1), 14) });
  }
  return (
    <div className="h-32 w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <YAxis domain={[0, 100]} ticks={[30, 50, 70]} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
          <ReferenceLine y={70} stroke="var(--bear)" strokeDasharray="3 3" />
          <ReferenceLine y={30} stroke="var(--bull)" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="rsi" stroke="var(--primary)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MacdChart({ closes }: { closes: number[] }) {
  const e12 = ema(closes, 12); const e26 = ema(closes, 26);
  const macdLine = closes.map((_, i) => e12[i] - e26[i]);
  const sig = ema(macdLine, 9);
  const data = closes.map((_, i) => ({ i, macd: macdLine[i], signal: sig[i], hist: macdLine[i] - sig[i] }));
  return (
    <div className="h-32 w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
          <ReferenceLine y={0} stroke="var(--border)" />
          <Bar dataKey="hist" fill="var(--cyan-accent)" isAnimationActive={false} />
          <Line type="monotone" dataKey="macd" stroke="var(--primary)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="signal" stroke="var(--bear)" strokeWidth={1} dot={false} isAnimationActive={false} />
          <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
