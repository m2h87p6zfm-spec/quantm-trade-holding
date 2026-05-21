import { Line, LineChart, ResponsiveContainer } from "recharts";

export function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  const d = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-8 w-24">
      <ResponsiveContainer>
        <LineChart data={d}>
          <Line type="monotone" dataKey="v" stroke={up ? "var(--bull)" : "var(--bear)"} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
