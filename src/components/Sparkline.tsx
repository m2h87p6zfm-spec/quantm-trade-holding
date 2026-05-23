import { MiniSpark } from "./MiniSpark";

export function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  return (
    <MiniSpark
      data={data}
      color={up ? "var(--bull)" : "var(--bear)"}
      strokeWidth={2}
      className="h-8 w-24"
    />
  );
}
