// Analyse-Agent Credit-Limits pro Monat (kalendarisch, UTC).
export const CREDIT_LIMITS = { free: 3, pro: 50, elite: 250 } as const;
export type CreditTier = keyof typeof CREDIT_LIMITS;

export function creditLabel(tier: CreditTier): string {
  return { free: "Free", pro: "Pro", elite: "Elite" }[tier];
}
