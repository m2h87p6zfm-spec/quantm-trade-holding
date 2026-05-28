import type { FeedItem } from "./types";

export const MARKET_FEED: FeedItem[] = [
  { id: "f1", time: "Just now", category: "FX", title: "DXY firm above 105", body: "Sticky US data keeps dollar bid — EM FX and JPY pressured.", impact: "medium" },
  { id: "f2", time: "12m", category: "Commodities", title: "Brent holds risk premium", body: "Middle-East tail risk + OPEC+ discipline support oil despite weak China demand.", impact: "medium" },
  { id: "f3", time: "34m", category: "Equities", title: "AI capex narrative intact", body: "Semis lead US equities; rotation into power & infrastructure names continues.", impact: "low" },
  { id: "f4", time: "1h", category: "Supply", title: "Red Sea reroutes persist", body: "Container freight elevated — watch for second-round goods inflation.", impact: "high" },
  { id: "f5", time: "2h", category: "Geopolitics", title: "US–China tech controls widen", body: "New export restrictions on advanced equipment — semi supply chain repriced.", impact: "high" },
  { id: "f6", time: "3h", category: "Macro", title: "BoJ signals patience", body: "Yen weakness persists — global carry trades crowded.", impact: "medium" },
  { id: "f7", time: "5h", category: "Equities", title: "European banks under pressure", body: "French OAT spreads widen — periphery risk creeps into core.", impact: "medium" },
];
