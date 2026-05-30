import { Plus, GitCompare, Bell } from "lucide-react";

export function QuickFollowups({
  ticker,
  onAction,
}: {
  ticker?: string;
  onAction: (prompt: string) => void;
}) {
  if (!ticker) return null;
  const items = [
    { label: `${ticker} zur Watchlist`, prompt: `Füge ${ticker} zu meiner Watchlist hinzu`, Icon: Plus },
    { label: `Vergleich Sektor-Peer`, prompt: `Vergleiche ${ticker} mit dem stärksten Peer im selben Sektor`, Icon: GitCompare },
    { label: `Preis-Alert vorschlagen`, prompt: `Welche Preis-Alerts würden für ${ticker} jetzt Sinn ergeben?`, Icon: Bell },
  ];
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map(({ label, prompt, Icon }) => (
        <button
          key={label}
          onClick={() => onAction(prompt)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] text-foreground/80 hover:border-primary/40 hover:bg-accent transition-colors"
        >
          <Icon className="h-3 w-3" />
          {label}
        </button>
      ))}
    </div>
  );
}
