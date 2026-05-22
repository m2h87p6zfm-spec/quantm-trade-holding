// Analyse-Agent Credit-Limits pro Monat (kalendarisch, UTC).
export const CREDIT_LIMITS = { free: 7, pro: 100, elite: 200 } as const;
export type CreditTier = keyof typeof CREDIT_LIMITS;

export function creditLabel(tier: CreditTier): string {
  return { free: "Free", pro: "Pro", elite: "Elite" }[tier];
}
