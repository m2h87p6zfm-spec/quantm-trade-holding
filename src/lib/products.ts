export type Product = {
  symbol: string;
  name: string;
  sector: "Technologie" | "Energie" | "Finanzen" | "Gesundheit" | "Konsum" | "Industrie" | "Rohstoffe" | "Index";
  region: "US" | "DE" | "EU" | "JP";
};

export const PRODUCTS: Product[] = [
  // US Tech
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technologie", region: "US" },
  { symbol: "MSFT", name: "Microsoft", sector: "Technologie", region: "US" },
  { symbol: "NVDA", name: "NVIDIA", sector: "Technologie", region: "US" },
  { symbol: "GOOGL", name: "Alphabet", sector: "Technologie", region: "US" },
  { symbol: "META", name: "Meta Platforms", sector: "Technologie", region: "US" },
  { symbol: "AMZN", name: "Amazon", sector: "Konsum", region: "US" },
  { symbol: "TSLA", name: "Tesla", sector: "Konsum", region: "US" },
  { symbol: "AMD", name: "AMD", sector: "Technologie", region: "US" },
  { symbol: "INTC", name: "Intel", sector: "Technologie", region: "US" },
  { symbol: "ORCL", name: "Oracle", sector: "Technologie", region: "US" },
  { symbol: "CRM", name: "Salesforce", sector: "Technologie", region: "US" },
  { symbol: "NFLX", name: "Netflix", sector: "Konsum", region: "US" },
  // US Finanzen / Industrie / Energie / Gesundheit
  { symbol: "JPM", name: "JPMorgan Chase", sector: "Finanzen", region: "US" },
  { symbol: "BAC", name: "Bank of America", sector: "Finanzen", region: "US" },
  { symbol: "GS", name: "Goldman Sachs", sector: "Finanzen", region: "US" },
  { symbol: "V", name: "Visa", sector: "Finanzen", region: "US" },
  { symbol: "MA", name: "Mastercard", sector: "Finanzen", region: "US" },
  { symbol: "XOM", name: "ExxonMobil", sector: "Energie", region: "US" },
  { symbol: "CVX", name: "Chevron", sector: "Energie", region: "US" },
  { symbol: "JNJ", name: "Johnson & Johnson", sector: "Gesundheit", region: "US" },
  { symbol: "PFE", name: "Pfizer", sector: "Gesundheit", region: "US" },
  { symbol: "UNH", name: "UnitedHealth", sector: "Gesundheit", region: "US" },
  { symbol: "BA", name: "Boeing", sector: "Industrie", region: "US" },
  { symbol: "CAT", name: "Caterpillar", sector: "Industrie", region: "US" },
  { symbol: "KO", name: "Coca-Cola", sector: "Konsum", region: "US" },
  { symbol: "PG", name: "Procter & Gamble", sector: "Konsum", region: "US" },
  // EU / DE
  { symbol: "SAP", name: "SAP SE", sector: "Technologie", region: "DE" },
  { symbol: "SIE.DE", name: "Siemens", sector: "Industrie", region: "DE" },
  { symbol: "DBK.DE", name: "Deutsche Bank", sector: "Finanzen", region: "DE" },
  { symbol: "VOW3.DE", name: "Volkswagen", sector: "Konsum", region: "DE" },
  { symbol: "BMW.DE", name: "BMW", sector: "Konsum", region: "DE" },
  { symbol: "BAYN.DE", name: "Bayer", sector: "Gesundheit", region: "DE" },
  { symbol: "AIR.PA", name: "Airbus", sector: "Industrie", region: "EU" },
  { symbol: "ASML", name: "ASML Holding", sector: "Technologie", region: "EU" },
  // Indizes (ETF-Proxys, da Finnhub Index-Tickers oft Premium sind)
  { symbol: "SPY", name: "S&P 500 (SPY)", sector: "Index", region: "US" },
  { symbol: "QQQ", name: "NASDAQ 100 (QQQ)", sector: "Index", region: "US" },
  { symbol: "DIA", name: "Dow Jones (DIA)", sector: "Index", region: "US" },
  { symbol: "EWG", name: "DAX-Proxy (EWG)", sector: "Index", region: "DE" },
  { symbol: "EWJ", name: "Nikkei-Proxy (EWJ)", sector: "Index", region: "JP" },
];

export const SECTORS = ["Technologie", "Energie", "Finanzen", "Gesundheit", "Konsum", "Industrie", "Rohstoffe"] as const;
export const INDICES = PRODUCTS.filter((p) => p.sector === "Index");
export const BENCHMARK = "SPY";

export function findProduct(symbol: string): Product | undefined {
  return PRODUCTS.find((p) => p.symbol.toUpperCase() === symbol.toUpperCase());
}

export function searchProducts(q: string): Product[] {
  const s = q.trim().toLowerCase();
  if (!s) return PRODUCTS;
  return PRODUCTS.filter((p) => p.symbol.toLowerCase().includes(s) || p.name.toLowerCase().includes(s));
}
