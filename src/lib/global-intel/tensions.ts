import type { Tension } from "./types";

export const TENSIONS: Tension[] = [
  { id: "us-cn", from: "United States of America", to: "China", level: "high", topic: "Trade / chips / Taiwan", impact: "Semis, global risk sentiment" },
  { id: "us-ru", from: "United States of America", to: "Russia", level: "high", topic: "Sanctions / Ukraine", impact: "Energy, defence, FX" },
  { id: "ru-uk", from: "Russia", to: "Ukraine", level: "high", topic: "Active conflict", impact: "Grains, gas, EU risk premium" },
  { id: "cn-in", from: "China", to: "India", level: "medium", topic: "Border friction", impact: "Asian risk sentiment" },
  { id: "sa-ir", from: "Saudi Arabia", to: "Iran", level: "medium", topic: "Regional rivalry", impact: "Brent risk premium" },
  { id: "kp-kr", from: "North Korea", to: "South Korea", level: "medium", topic: "Missile tests / posture", impact: "KOSPI tail risk" },
  { id: "is-ir", from: "Israel", to: "Iran", level: "high", topic: "Direct confrontation risk", impact: "Oil, safe-haven flows" },
];
