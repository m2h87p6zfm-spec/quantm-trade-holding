import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { allSessions, type SessionState } from "@/lib/marketHours";

export function MarketClock() {
  const [states, setStates] = useState<SessionState[] | null>(null);

  useEffect(() => {
    const tick = () => setStates(allSessions());
    tick();
    const id = setInterval(tick, 30 * 1000);
    return () => clearInterval(id);
  }, []);

  if (!states) return <div className="hidden md:flex items-center gap-2 text-[11px] text-muted-foreground h-4" />;
  const anyOpen = states.some((s) => s.isOpen);

  return (
    <div className="hidden md:flex items-center gap-2 text-[11px] text-muted-foreground">
      <Clock className="h-3 w-3 opacity-60" />
      <span className="font-medium">
        {anyOpen ? <span className="text-bull">Märkte offen</span> : <span className="text-muted-foreground">Märkte geschlossen</span>}
      </span>
      <span className="opacity-30">·</span>
      <div className="flex items-center gap-2.5">
        {states.map((s) => (
          <div key={s.session.id} className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${s.isOpen ? "bg-bull tick-glow-bull animate-pulse" : "bg-muted-foreground/40"}`} />
            <span className="font-mono tabular-nums">
              <b className="text-foreground">{s.session.id}</b>
              <span className="ml-1 opacity-70">{s.localTime}</span>
            </span>
            {s.isOpen ? (
              <span className="text-[10px] text-muted-foreground">−{fmt(s.minutesUntilClose)}</span>
            ) : (
              s.minutesUntilOpen > 0 && <span className="text-[10px] text-muted-foreground">+{fmt(s.minutesUntilOpen)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function fmt(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
