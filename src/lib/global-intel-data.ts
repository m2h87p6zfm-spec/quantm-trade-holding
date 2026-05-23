// Global Market & Geopolitical Intelligence — structured placeholders.
// All fields are designed to be API-ready: swap any string/number with a live feed later.

export type RiskLevel = "low" | "medium" | "high";
export type Direction = "rising" | "stable" | "falling";
export type Trend = "expanding" | "slowing" | "recession";
export type Mood = "bullish" | "bearish" | "uncertain";
export type Sentiment = "risk-on" | "risk-off" | "mixed";
export type Strength = "weak" | "neutral" | "strong";

export type CountryIntel = {
  /** Matches feature.properties.name from world-atlas countries-110m.json */
  name: string;
  iso2: string;
  flag: string;
  risk: RiskLevel;
  /** 1–2 line market impact summary */
  summary: string;
  pivotalEvent: {
    title: string;
    year: string;
    why: string;
  };
  geopolitics: {
    governmentStability: "Strong" | "Moderate" | "Weak";
    politicalRisk: "Low" | "Medium" | "High";
    tensions: string;
    policyDirection: "Pro-growth" | "Restrictive" | "Mixed" | "Unstable";
  };
  economy: {
    inflation: Direction;
    rates: "low" | "high" | "tightening" | "easing";
    gdp: "growing" | "slowing" | "recession-risk";
    fxVsUsd: "weakening" | "stable" | "strengthening";
  };
  impact: {
    equities: string;
    forex: string;
    commodities: string;
    sentiment: string;
  };
  positives: string[];
  negatives: string[];
  /** Search keywords to pull live news against the user's trusted sources. */
  newsKeywords: string[];
};

export const GLOBAL_SUMMARY = {
  sentiment: "mixed" as Sentiment,
  volatility: "medium" as RiskLevel,
  usd: "strong" as Strength,
  trend: "slowing" as Trend,
  mood: "uncertain" as Mood,
  headline:
    "US-Resilienz vs. globale Verlangsamung — USD bleibt fest, Rohstoffe gemischt, EM unter Druck.",
};

export const COUNTRIES: CountryIntel[] = [
  {
    name: "United States of America",
    iso2: "US",
    flag: "🇺🇸",
    risk: "medium",
    summary:
      "US-Stärke treibt USD nach oben und setzt globale Aktien sowie Emerging Markets unter Druck.",
    pivotalEvent: {
      title: "Fed-Zinszyklus 2022–2024",
      year: "2022",
      why: "Aggressivste Straffung seit 1980 — definiert weiterhin globale Liquiditätsbedingungen, USD-Stärke und EM-Kapitalflüsse.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "Medium",
      tensions: "China-Tech-Restriktionen, Nahost-Engagement, innenpolitische Polarisierung vor Wahlen.",
      policyDirection: "Mixed",
    },
    economy: { inflation: "falling", rates: "high", gdp: "growing", fxVsUsd: "strengthening" },
    impact: {
      equities: "S&P 500 nahe Allzeithoch — Big-Tech & AI führen, Small Caps zurück.",
      forex: "DXY fest → EUR, JPY, EM-Währungen unter Druck.",
      commodities: "Höhere Realzinsen belasten Gold; Öl folgt US-Wachstum.",
      sentiment: "Globaler Risk-Anker: Wenn US fällt, fällt alles.",
    },
    positives: ["Robuster Arbeitsmarkt", "AI-CapEx-Zyklus", "Energieautarkie", "Tiefe Kapitalmärkte"],
    negatives: ["Hohe Staatsverschuldung", "Politische Polarisierung", "Kommerzielle Immobilien-Stress"],
    newsKeywords: ["Federal Reserve", "S&P 500", "US economy", "Treasury yields"],
  },
  {
    name: "China",
    iso2: "CN",
    flag: "🇨🇳",
    risk: "high",
    summary:
      "Schwache Binnennachfrage und Immobilien-Deleveraging dämpfen globales Wachstum und Rohstoffnachfrage.",
    pivotalEvent: {
      title: "Evergrande-Kollaps & Immobilien-Krise",
      year: "2021",
      why: "Strukturelles Deleveraging im Immobiliensektor (25 % BIP) blockiert Konsum & belastet Industriemetalle weltweit.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "High",
      tensions: "Taiwan-Frage, US-Chip-Sanktionen, Südchinesisches Meer.",
      policyDirection: "Restrictive",
    },
    economy: { inflation: "falling", rates: "easing", gdp: "slowing", fxVsUsd: "weakening" },
    impact: {
      equities: "Hang Seng & CSI300 unterperformen — Kapitalabflüsse halten an.",
      forex: "CNY-Schwäche → asiatische Währungen unter Druck.",
      commodities: "Kupfer, Eisenerz, Stahl: Nachfrage schwach. LNG-Importe steigen.",
      sentiment: "Deflation-Export-Risiko für globale Margen.",
    },
    positives: ["EV- & Solar-Dominanz", "AI-Forschungstiefe", "Hohe Sparquote"],
    negatives: ["Immobilien-Schulden", "Demografie", "Geopolitische Isolation", "Deflation"],
    newsKeywords: ["China economy", "PBoC", "Hang Seng", "Taiwan"],
  },
  {
    name: "Germany",
    iso2: "DE",
    flag: "🇩🇪",
    risk: "medium",
    summary:
      "Industrie-Schwäche & Energiekosten halten die Eurozone-Lokomotive im Stagnations-Modus.",
    pivotalEvent: {
      title: "Energie-Schock nach Russland-Sanktionen",
      year: "2022",
      why: "Verlust günstiger Pipeline-Gas-Lieferungen — strukturelle Belastung für Chemie, Auto, Maschinenbau.",
    },
    geopolitics: {
      governmentStability: "Moderate",
      politicalRisk: "Medium",
      tensions: "Politische Fragmentierung, AfD-Aufstieg, NATO-Ausgaben-Debatte.",
      policyDirection: "Mixed",
    },
    economy: { inflation: "falling", rates: "easing", gdp: "recession-risk", fxVsUsd: "stable" },
    impact: {
      equities: "DAX getragen von US-Exporteuren (SAP, Siemens) — Auto & Chemie schwach.",
      forex: "EUR/USD unter Druck durch EZB-Lockerung.",
      commodities: "Hohe Erdgas-Importabhängigkeit (LNG).",
      sentiment: "Barometer für europäische Industrie.",
    },
    positives: ["Exportstarke Mittelstand", "Niedrige Verschuldung", "Stabile Institutionen"],
    negatives: ["Energiekosten", "China-Exposure", "Demografie", "Bürokratie"],
    newsKeywords: ["DAX", "Bundesbank", "German industry", "ECB"],
  },
  {
    name: "Japan",
    iso2: "JP",
    flag: "🇯🇵",
    risk: "low",
    summary:
      "Ende der Yield-Curve-Control und schwacher Yen treiben Nikkei-Rally — globaler Carry-Trade-Anker.",
    pivotalEvent: {
      title: "BoJ-Exit aus Negativzinsen",
      year: "2024",
      why: "Erste Zinsanhebung seit 2007 — beendet 30 Jahre Deflations-Politik und verändert globale Carry-Trades.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "Low",
      tensions: "China-Spannungen, Nordkorea, US-Allianz-Vertiefung.",
      policyDirection: "Pro-growth",
    },
    economy: { inflation: "rising", rates: "tightening", gdp: "growing", fxVsUsd: "weakening" },
    impact: {
      equities: "Nikkei 225 nahe Allzeithoch — Exporteure profitieren von schwachem Yen.",
      forex: "USD/JPY-Volatilität → globaler Carry-Trade-Schmerzpunkt.",
      commodities: "Reiner Importeur — Öl & LNG empfindlich.",
      sentiment: "Globaler Risikoindikator: Yen-Stärke = Risk-Off.",
    },
    positives: ["Corporate-Governance-Reform", "Halbleiter-Renaissance", "Politische Stabilität"],
    negatives: ["Höchste Staatsverschuldung weltweit", "Demografie", "Energie-Importabhängigkeit"],
    newsKeywords: ["Nikkei", "Bank of Japan", "Yen", "Japan economy"],
  },
  {
    name: "United Kingdom",
    iso2: "GB",
    flag: "🇬🇧",
    risk: "medium",
    summary:
      "Sticky Inflation und schwaches Wachstum halten BoE in Warteposition — GBP bleibt sensibel.",
    pivotalEvent: {
      title: "Brexit-Umsetzung",
      year: "2020",
      why: "Strukturelle Handelsfriktionen mit EU — niedrigeres Trendwachstum, schwächerer GBP.",
    },
    geopolitics: {
      governmentStability: "Moderate",
      politicalRisk: "Medium",
      tensions: "EU-Beziehungen, Nordirland, Migration.",
      policyDirection: "Mixed",
    },
    economy: { inflation: "falling", rates: "high", gdp: "slowing", fxVsUsd: "stable" },
    impact: {
      equities: "FTSE 100 getragen von Energie & Pharma — Domestic Plays schwach.",
      forex: "GBP/USD reagiert sensibel auf BoE-Erwartungen.",
      commodities: "Öl-Major-Heavy-Index (Shell, BP).",
      sentiment: "Brückenmarkt zwischen US & EU.",
    },
    positives: ["Finanzsektor", "Englische Sprache", "Rechtssystem"],
    negatives: ["Sticky Services-Inflation", "Brexit-Friktion", "Niedrige Produktivität"],
    newsKeywords: ["FTSE 100", "Bank of England", "UK economy", "Sterling"],
  },
  {
    name: "France",
    iso2: "FR",
    flag: "🇫🇷",
    risk: "medium",
    summary:
      "Hohe Schulden und politische Fragmentierung weiten OAT-Bund-Spread aus — EUR-Belastung.",
    pivotalEvent: {
      title: "Vorgezogene Parlamentswahlen",
      year: "2024",
      why: "Politische Patt-Situation erschwert Haushaltskonsolidierung — Markt verlangt höhere Risikoprämie.",
    },
    geopolitics: {
      governmentStability: "Weak",
      politicalRisk: "High",
      tensions: "Innenpolitische Fragmentierung, EU-Führungsrolle, Afrika-Engagement.",
      policyDirection: "Unstable",
    },
    economy: { inflation: "falling", rates: "easing", gdp: "slowing", fxVsUsd: "stable" },
    impact: {
      equities: "CAC 40 lebt von Luxus (LVMH) & Pharma — Banken unter Spread-Druck.",
      forex: "OAT-Spread-Ausweitung belastet EUR.",
      commodities: "Atomstrom-Export → Energie-Resilienz.",
      sentiment: "Periphere Eurozone-Risiken kommen zurück.",
    },
    positives: ["Atomstrom", "Luxus-Industrie", "Demografie besser als DE"],
    negatives: ["Staatsverschuldung > 110 % BIP", "Politische Patt", "Sozialausgaben"],
    newsKeywords: ["CAC 40", "France budget", "ECB", "French politics"],
  },
  {
    name: "India",
    iso2: "IN",
    flag: "🇮🇳",
    risk: "low",
    summary:
      "Schnellstwachsende Großvolkswirtschaft — strukturelle Aktien-Rally, aber hohe Bewertungen.",
    pivotalEvent: {
      title: "Digital-Infrastruktur-Push (UPI, Aadhaar)",
      year: "2016",
      why: "Formalisierung der Wirtschaft, Steuerbasis-Verbreiterung, Aufstieg digitaler Konsumenten.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "Low",
      tensions: "China-Grenze, Pakistan, Balanceakt USA/Russland.",
      policyDirection: "Pro-growth",
    },
    economy: { inflation: "stable", rates: "high", gdp: "growing", fxVsUsd: "stable" },
    impact: {
      equities: "Nifty 50 & Sensex auf Allzeithochs — hohe KGVs.",
      forex: "INR stabilisiert durch RBI-Interventionen.",
      commodities: "Großer Öl- & Gold-Importeur.",
      sentiment: "EM-Premium-Markt — zieht globale Flows an.",
    },
    positives: ["Demografie", "Tech-Talent", "Inlandskonsum", "China+1-Strategie"],
    negatives: ["Bewertungen", "Infrastruktur-Lücken", "Subventionslast"],
    newsKeywords: ["Nifty", "RBI", "India economy", "Sensex"],
  },
  {
    name: "Russia",
    iso2: "RU",
    flag: "🇷🇺",
    risk: "high",
    summary:
      "Sanktioniert & isoliert — Energieexporte und Verteidigungsausgaben dominieren Wirtschaft.",
    pivotalEvent: {
      title: "Ukraine-Krieg & Sanktionen",
      year: "2022",
      why: "Energie-Neuordnung Europas, Spaltung globaler Märkte, neue Sanktionsarchitektur.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "High",
      tensions: "Ukraine-Krieg, NATO, China-Annäherung.",
      policyDirection: "Restrictive",
    },
    economy: { inflation: "rising", rates: "high", gdp: "slowing", fxVsUsd: "weakening" },
    impact: {
      equities: "MOEX vom Westen abgeschnitten — kaum globale Relevanz.",
      forex: "RUB volatil, Kapitalkontrollen.",
      commodities: "Öl-Schattenflotte, Gas-Re-Routing nach Asien, Weizen-Exporteur.",
      sentiment: "Geopolitisches Tail-Risk für Energiepreise.",
    },
    positives: ["Rohstoffreserven", "Niedrige Auslandsverschuldung"],
    negatives: ["Sanktionen", "Brain-Drain", "Kriegsausgaben", "Demografie"],
    newsKeywords: ["Russia sanctions", "Ukraine war", "Brent oil", "Ruble"],
  },
  {
    name: "Brazil",
    iso2: "BR",
    flag: "🇧🇷",
    risk: "medium",
    summary:
      "Hohe Realzinsen ziehen Carry-Flows an — Fiskalsorgen begrenzen Aufwärtspotenzial.",
    pivotalEvent: {
      title: "Selic-Hochzinsphase 2021–2024",
      year: "2021",
      why: "Erste große Notenbank, die nach Pandemie hob — Vorlage für EM-Politik, hohe Realrenditen.",
    },
    geopolitics: {
      governmentStability: "Moderate",
      politicalRisk: "Medium",
      tensions: "Innenpolitische Polarisierung, BRICS-Rolle, Amazonas.",
      policyDirection: "Mixed",
    },
    economy: { inflation: "stable", rates: "high", gdp: "growing", fxVsUsd: "weakening" },
    impact: {
      equities: "Bovespa rohstofflastig — Vale, Petrobras dominieren.",
      forex: "BRL-Carry-Trade-Favorit, aber fiskalsensitiv.",
      commodities: "Eisenerz, Soja, Zucker, Öl — globaler Top-Lieferant.",
      sentiment: "LatAm-Stimmungsbarometer.",
    },
    positives: ["Rohstoffe", "Hohe Realzinsen", "Junge Demografie"],
    negatives: ["Fiskaldefizit", "Politik-Unsicherheit", "Amazon-Risiko"],
    newsKeywords: ["Bovespa", "BCB Brazil", "Real", "Brazil fiscal"],
  },
  {
    name: "Canada",
    iso2: "CA",
    flag: "🇨🇦",
    risk: "low",
    summary:
      "US-Konjunktur-Proxy mit Rohstoff-Hebel — Immobilien & Verbraucherschulden bleiben Schwachstelle.",
    pivotalEvent: {
      title: "Immobilienpreis-Boom 2020–2022",
      year: "2020",
      why: "Höchste private Verschuldung der G7 — Verbraucher reagieren empfindlich auf BoC-Zinsen.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "Low",
      tensions: "US-Handelsabhängigkeit, China-Spannungen.",
      policyDirection: "Pro-growth",
    },
    economy: { inflation: "falling", rates: "easing", gdp: "slowing", fxVsUsd: "stable" },
    impact: {
      equities: "TSX = Banken + Energie + Materials.",
      forex: "CAD eng korreliert mit Öl & US-Daten.",
      commodities: "Öl-Exporteur (WCS), Uran, Kali.",
      sentiment: "Frühindikator für US-Konsum.",
    },
    positives: ["Rohstoffe", "Politische Stabilität", "Einwanderung"],
    negatives: ["Hauspreis-Blase", "Hohe Verbraucherschulden", "US-Abhängigkeit"],
    newsKeywords: ["TSX", "Bank of Canada", "WTI crude", "Loonie"],
  },
  {
    name: "Saudi Arabia",
    iso2: "SA",
    flag: "🇸🇦",
    risk: "medium",
    summary:
      "OPEC+-Anker — Produktionsentscheidungen setzen globalen Ölpreis-Floor.",
    pivotalEvent: {
      title: "Vision 2030 & OPEC+-Allianz",
      year: "2016",
      why: "Diversifikation weg vom Öl + koordinierte Produktionskürzungen → neuer globaler Energie-Gleichgewichtspreis.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "Medium",
      tensions: "Iran, Jemen, Israel-Normalisierung.",
      policyDirection: "Pro-growth",
    },
    economy: { inflation: "stable", rates: "high", gdp: "growing", fxVsUsd: "stable" },
    impact: {
      equities: "Tadawul von Aramco dominiert.",
      forex: "SAR an USD gepegt.",
      commodities: "Schlüssel-Swing-Produzent für Brent.",
      sentiment: "Energie-Risikoprämie.",
    },
    positives: ["Niedrige Förderkosten", "Souveränes Vermögen (PIF)", "Reform-Tempo"],
    negatives: ["Öl-Abhängigkeit", "Regionale Konflikte", "Demografie-Druck"],
    newsKeywords: ["OPEC", "Saudi Aramco", "Brent crude", "MBS"],
  },
  {
    name: "South Korea",
    iso2: "KR",
    flag: "🇰🇷",
    risk: "low",
    summary:
      "Halbleiter-Zyklus-Proxy — KOSPI hängt an Memory-Preisen und AI-CapEx.",
    pivotalEvent: {
      title: "Globaler Memory-Chip-Zyklus",
      year: "2023",
      why: "Samsung & SK Hynix sind Kern der AI-Lieferkette — Inventur-Korrektur 2023 jetzt im Aufschwung.",
    },
    geopolitics: {
      governmentStability: "Moderate",
      politicalRisk: "Medium",
      tensions: "Nordkorea, Japan-Beziehungen, US-China-Balance.",
      policyDirection: "Pro-growth",
    },
    economy: { inflation: "stable", rates: "tightening", gdp: "growing", fxVsUsd: "weakening" },
    impact: {
      equities: "KOSPI = Tech-Beta zu globaler AI-Story.",
      forex: "KRW empfindlich für Risk-Off & Halbleiter-Zyklen.",
      commodities: "Großer LNG- & Öl-Importeur.",
      sentiment: "Frühindikator für globale Tech-Nachfrage.",
    },
    positives: ["Halbleiter-Führung", "Industrie-Tiefe", "Hohe FX-Reserven"],
    negatives: ["China-Exposure", "Demografie", "Hohe Haushaltsverschuldung"],
    newsKeywords: ["KOSPI", "Samsung", "Bank of Korea", "Won"],
  },
  {
    name: "Mexico",
    iso2: "MX",
    flag: "🇲🇽",
    risk: "medium",
    summary:
      "Nearshoring-Profiteur — Banxico hält hohe Realzinsen, MXN bleibt EM-Carry-Favorit.",
    pivotalEvent: {
      title: "USMCA + Nearshoring-Welle",
      year: "2020",
      why: "China-Diversifikation lenkt FDI nach Mexiko — strukturelle Industrieausweitung.",
    },
    geopolitics: {
      governmentStability: "Moderate",
      politicalRisk: "Medium",
      tensions: "US-Migration & Zoll-Risiko, Drogenkartelle.",
      policyDirection: "Mixed",
    },
    economy: { inflation: "falling", rates: "high", gdp: "growing", fxVsUsd: "stable" },
    impact: {
      equities: "Mexbol = Konsum, Banken, Industrie.",
      forex: "MXN Carry-Trade-Favorit unter EM.",
      commodities: "Öl-Exporteur (Pemex), Silber-Top-Produzent.",
      sentiment: "Nearshoring-Proxy.",
    },
    positives: ["Nearshoring-FDI", "USMCA-Zugang", "Hohe Realzinsen"],
    negatives: ["Sicherheitslage", "Pemex-Schulden", "Politische Reformen"],
    newsKeywords: ["Mexbol", "Banxico", "Peso", "nearshoring"],
  },
  {
    name: "Australia",
    iso2: "AU",
    flag: "🇦🇺",
    risk: "low",
    summary:
      "China-Rohstoff-Proxy — Eisenerz & LNG bestimmen Handelsbilanz und AUD.",
    pivotalEvent: {
      title: "China-Rohstoff-Boom & -Abkühlung",
      year: "2010",
      why: "Jahrzehnt-Boom finanzierte Wachstum; aktuelle China-Schwäche belastet jetzt Erz-Preise.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "Low",
      tensions: "China-Handel, AUKUS, Pazifik-Strategie.",
      policyDirection: "Pro-growth",
    },
    economy: { inflation: "falling", rates: "high", gdp: "growing", fxVsUsd: "stable" },
    impact: {
      equities: "ASX 200 = Banken + Bergbau (BHP, Rio).",
      forex: "AUD = liquider China-Proxy.",
      commodities: "Eisenerz, LNG, Kohle, Lithium-Top-Lieferant.",
      sentiment: "Asien-Pazifik-Risikobarometer.",
    },
    positives: ["Rohstoffreserven", "Politische Stabilität", "Migration"],
    negatives: ["Hauspreise", "China-Abhängigkeit", "Konsumentenstress"],
    newsKeywords: ["ASX 200", "RBA", "iron ore", "Aussie dollar"],
  },
  {
    name: "Türkiye",
    iso2: "TR",
    flag: "🇹🇷",
    risk: "high",
    summary:
      "Heterodoxe-Wende beendet — extreme Zinsen sollen Lira stabilisieren, Inflation hartnäckig.",
    pivotalEvent: {
      title: "Notenbank-Kehrtwende 2023",
      year: "2023",
      why: "Wechsel zu orthodoxer Politik (50 % Leitzins) — Versuch, jahrelange Lira-Krise zu beenden.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "High",
      tensions: "NATO-Rolle, Syrien, Mittelmeer-Energie.",
      policyDirection: "Mixed",
    },
    economy: { inflation: "rising", rates: "high", gdp: "slowing", fxVsUsd: "weakening" },
    impact: {
      equities: "BIST 100 inflationsgetrieben — reale Renditen schwach.",
      forex: "TRY-Volatilität bleibt extrem.",
      commodities: "Großer Energieimporteur.",
      sentiment: "EM-Tail-Risk-Indikator.",
    },
    positives: ["Geografische Lage", "Junge Demografie", "Industrie-Basis"],
    negatives: ["Inflation", "FX-Reserven niedrig", "Politik-Risiko"],
    newsKeywords: ["Turkey lira", "CBRT", "BIST", "Erdogan"],
  },
  {
    name: "Israel",
    iso2: "IL",
    flag: "🇮🇱",
    risk: "high",
    summary:
      "Regionale Eskalationsrisiken halten Öl-Risikoprämie hoch — Tech-Sektor zeigt Resilienz.",
    pivotalEvent: {
      title: "Nahost-Eskalation seit Okt. 2023",
      year: "2023",
      why: "Bewaffneter Konflikt mit Hamas/Hisbollah, Iran-Konfrontation → Energie-Risikoprämie.",
    },
    geopolitics: {
      governmentStability: "Moderate",
      politicalRisk: "High",
      tensions: "Iran, Hisbollah, Gaza, regionale Achsen.",
      policyDirection: "Mixed",
    },
    economy: { inflation: "stable", rates: "easing", gdp: "slowing", fxVsUsd: "stable" },
    impact: {
      equities: "TA-35 resilient — Tech (NVDA-Lieferanten) trägt.",
      forex: "ILS volatil entlang Konflikt-Schlagzeilen.",
      commodities: "Brent-Risikoprämie steigt bei Eskalation.",
      sentiment: "Globaler Risk-Off-Trigger bei Eskalation.",
    },
    positives: ["Hightech-Ökosystem", "Starke FX-Reserven", "Innovationskraft"],
    negatives: ["Krieg-Kosten", "Politische Spaltung", "Brain-Drain-Risiko"],
    newsKeywords: ["Israel", "Iran", "Middle East", "Brent"],
  },
  {
    name: "Iran",
    iso2: "IR",
    flag: "🇮🇷",
    risk: "high",
    summary:
      "Sanktionen + nukleare Spannungen → permanente geopolitische Öl-Risikoprämie.",
    pivotalEvent: {
      title: "JCPOA-Zerfall & Sanktionsregime",
      year: "2018",
      why: "Aufhebung des Atomdeals → Öl-Sanktionen, Schatten-Tanker-Flotte, Stellvertreterkonflikte.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "High",
      tensions: "Israel, USA, Atom-Programm, regionale Achsen.",
      policyDirection: "Restrictive",
    },
    economy: { inflation: "rising", rates: "high", gdp: "slowing", fxVsUsd: "weakening" },
    impact: {
      equities: "Lokaler Markt — global irrelevant.",
      forex: "Rial in Hyperinflation.",
      commodities: "Öl-Schatten-Exporte nach China; Hormuz-Tail-Risk.",
      sentiment: "Geopolitisches Tail-Event.",
    },
    positives: ["Ölreserven", "Junge Demografie"],
    negatives: ["Sanktionen", "Inflation", "Isolation", "Regime-Risiko"],
    newsKeywords: ["Iran", "OPEC", "nuclear deal", "Hormuz"],
  },
  {
    name: "Ukraine",
    iso2: "UA",
    flag: "🇺🇦",
    risk: "high",
    summary:
      "Aktiver Krieg — Weizen-, Sonnenblumen-, Dünger-Exporte & europäische Sicherheitslage dominieren.",
    pivotalEvent: {
      title: "Russische Invasion",
      year: "2022",
      why: "Größter Bodenkonflikt in Europa seit 1945 — Energie, Lebensmittel, NATO-Architektur neu definiert.",
    },
    geopolitics: {
      governmentStability: "Moderate",
      politicalRisk: "High",
      tensions: "Krieg mit Russland, Westhilfe-Abhängigkeit.",
      policyDirection: "Unstable",
    },
    economy: { inflation: "rising", rates: "high", gdp: "recession-risk", fxVsUsd: "weakening" },
    impact: {
      equities: "Lokaler Markt eingefroren.",
      forex: "UAH durch Hilfen gestützt.",
      commodities: "Weizen, Mais, Sonnenblumenöl, Dünger — globaler Top-Lieferant.",
      sentiment: "Europäisches Tail-Risk.",
    },
    positives: ["Westliche Unterstützung", "Agrar-Potenzial"],
    negatives: ["Krieg", "Infrastrukturzerstörung", "Demografie"],
    newsKeywords: ["Ukraine war", "wheat", "NATO", "EU aid"],
  },
  {
    name: "Switzerland",
    iso2: "CH",
    flag: "🇨🇭",
    risk: "low",
    summary:
      "Safe Haven — CHF profitiert von globaler Risiko-Aversion, SNB-Lockerung im Vorteil.",
    pivotalEvent: {
      title: "Credit Suisse-Rettung durch UBS",
      year: "2023",
      why: "Konsolidierung des Schweizer Bankensystems — eine globale Mega-Bank, Reputationsfrage.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "Low",
      tensions: "EU-Beziehungen, Neutralität-Debatte, Sanktionen.",
      policyDirection: "Pro-growth",
    },
    economy: { inflation: "stable", rates: "easing", gdp: "growing", fxVsUsd: "strengthening" },
    impact: {
      equities: "SMI = Nestlé, Roche, Novartis — defensiv.",
      forex: "CHF klassischer Safe-Haven.",
      commodities: "Goldhandel-Hub.",
      sentiment: "Risk-Off-Profiteur.",
    },
    positives: ["Politische Stabilität", "Starke Währung", "Innovation"],
    negatives: ["Frankenstärke = Export-Druck", "Bankenkonzentration"],
    newsKeywords: ["SNB", "Swiss franc", "UBS", "SMI"],
  },
  {
    name: "Netherlands",
    iso2: "NL",
    flag: "🇳🇱",
    risk: "low",
    summary:
      "ASML-Monopol bei EUV-Lithografie macht NL zum kritischen Knoten der AI-Lieferkette.",
    pivotalEvent: {
      title: "EUV-Exportkontrollen gegen China",
      year: "2023",
      why: "US-Druck auf NL → ASML-Restriktionen → neue Chip-Geopolitik.",
    },
    geopolitics: {
      governmentStability: "Moderate",
      politicalRisk: "Low",
      tensions: "EU-Politik, US-China-Druck auf ASML.",
      policyDirection: "Mixed",
    },
    economy: { inflation: "stable", rates: "easing", gdp: "growing", fxVsUsd: "stable" },
    impact: {
      equities: "AEX von ASML dominiert.",
      forex: "Teil der EUR-Zone.",
      commodities: "Rotterdam = Europas Energie-Drehscheibe (LNG, Öl).",
      sentiment: "Halbleiter-Lieferketten-Anker.",
    },
    positives: ["ASML-Monopol", "Logistik-Hub", "Pro-Business"],
    negatives: ["Politische Fragmentierung", "China-Exposure"],
    newsKeywords: ["ASML", "AEX", "Netherlands", "semiconductor"],
  },
  {
    name: "South Africa",
    iso2: "ZA",
    flag: "🇿🇦",
    risk: "medium",
    summary:
      "Edelmetall-Top-Produzent — Platin, Palladium, Gold; Energiekrise bremst Wachstum.",
    pivotalEvent: {
      title: "Eskalierende Load-Shedding-Krise",
      year: "2022",
      why: "Strom-Engpass blockiert Bergbau und Industrie — strukturelle Wachstumsbremse.",
    },
    geopolitics: {
      governmentStability: "Moderate",
      politicalRisk: "Medium",
      tensions: "BRICS-Rolle, Russland-China-Nähe.",
      policyDirection: "Mixed",
    },
    economy: { inflation: "stable", rates: "high", gdp: "slowing", fxVsUsd: "weakening" },
    impact: {
      equities: "JSE Top 40 = Minen + Naspers (Tencent).",
      forex: "ZAR volatil, hohe Carry-Komponente.",
      commodities: "Platin, Palladium, Gold, Kohle, Chrom.",
      sentiment: "Frontier-EM-Stimmungsbarometer.",
    },
    positives: ["Rohstoffe", "Entwickelte Finanzmärkte"],
    negatives: ["Stromkrise", "Arbeitslosigkeit", "Politische Spannungen"],
    newsKeywords: ["JSE", "SARB", "rand", "platinum"],
  },
  {
    name: "United Arab Emirates",
    iso2: "AE",
    flag: "🇦🇪",
    risk: "low",
    summary:
      "Stabiler Energie-Exporteur + globaler Finanz-/Krypto-Hub — Diversifikation am weitesten fortgeschritten.",
    pivotalEvent: {
      title: "ADQ/Mubadala-Souverän-Strategie",
      year: "2017",
      why: "Aggressive Diversifikation in Tech, AI, Sport, Krypto — neue globale Kapitalmacht.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "Low",
      tensions: "Iran-Spannungen, Jemen-Engagement.",
      policyDirection: "Pro-growth",
    },
    economy: { inflation: "stable", rates: "high", gdp: "growing", fxVsUsd: "stable" },
    impact: {
      equities: "DFM/ADX wachsen (Aramco-ähnliche IPOs).",
      forex: "AED an USD gepegt.",
      commodities: "Öl + Aluminium + LNG.",
      sentiment: "MENA-Risk-Anker.",
    },
    positives: ["Diversifikation", "Souveräne Fonds", "Politische Stabilität"],
    negatives: ["Regionale Risiken", "Öl-Abhängigkeit (sinkend)"],
    newsKeywords: ["UAE", "ADX", "Dubai", "ADNOC"],
  },
  {
    name: "Argentina",
    iso2: "AR",
    flag: "🇦🇷",
    risk: "high",
    summary:
      "Milei-Schock-Reform — extreme Volatilität, aber Disinflation und Markt-Optimismus.",
    pivotalEvent: {
      title: "Milei-Reformprogramm",
      year: "2023",
      why: "Radikale Liberalisierung, Dollarisierungsdebatte, Subventionsabbau — historischer Politikwechsel.",
    },
    geopolitics: {
      governmentStability: "Moderate",
      politicalRisk: "High",
      tensions: "IWF-Verhandlungen, China-Beziehungen.",
      policyDirection: "Pro-growth",
    },
    economy: { inflation: "falling", rates: "high", gdp: "growing", fxVsUsd: "weakening" },
    impact: {
      equities: "Merval-Rally in USD-Terms.",
      forex: "ARS-Volatilität extrem.",
      commodities: "Soja, Mais, Rind, Lithium (Triangle).",
      sentiment: "EM-Reform-Story.",
    },
    positives: ["Reform-Momentum", "Lithium-Reserven", "Agrar"],
    negatives: ["Inflations-Erbe", "FX-Reserven niedrig", "Sozialer Druck"],
    newsKeywords: ["Argentina", "Milei", "Merval", "peso"],
  },
];

export const COUNTRIES_BY_NAME = new Map<string, CountryIntel>(COUNTRIES.map((c) => [c.name, c]));

export const RISK_COLOR: Record<RiskLevel, string> = {
  // Institutional tones — muted, not traffic-light
  low: "oklch(0.62 0.09 155)",   // soft green
  medium: "oklch(0.74 0.10 78)", // soft amber
  high: "oklch(0.62 0.13 25)",   // soft red
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Stable",
  medium: "Watch",
  high: "Elevated",
};

export const NEUTRAL_LAND = "oklch(0.30 0.012 260)";

/* ───────── Country coordinates (approx) [lng, lat] ───────── */
export const COUNTRY_COORDS: Record<string, [number, number]> = {
  "United States of America": [-98, 39],
  China: [104, 35],
  Germany: [10.4, 51.2],
  Japan: [138, 36],
  "United Kingdom": [-2, 54],
  France: [2.3, 46.6],
  India: [78, 22],
  Russia: [95, 61],
  Brazil: [-53, -10],
  Canada: [-106, 56],
  "Saudi Arabia": [45, 24],
  "South Korea": [128, 36.5],
  Mexico: [-102, 23],
  Australia: [134, -25],
  Argentina: [-65, -34],
  Ukraine: [31.2, 49],
  Iran: [53, 32],
  Israel: [34.8, 31.5],
  Taiwan: [121, 23.7],
  "North Korea": [127, 40],
  Yemen: [44, 15.5],
};

/* ───────── Global Events (clickable dots) ───────── */
export type EventType = "negative" | "positive" | "watch";
export type GlobalEvent = {
  id: string;
  type: EventType;
  category: string;
  title: string;
  location: string;
  coords: [number, number];
  date: string;
  summary: string;
  impact: { fx?: string; commodities?: string; equities?: string; regions?: string };
};

export const EVENTS: GlobalEvent[] = [
  { id: "ukr-war", type: "negative", category: "Conflict", title: "Ukraine–Russia conflict", location: "Eastern Europe", coords: [31.2, 49], date: "Ongoing", summary: "Sustained war reshapes European energy supply, defence spending and grain exports.", impact: { commodities: "Wheat, gas, oil premium", fx: "EUR risk premium", regions: "EU industry" } },
  { id: "mideast", type: "negative", category: "Conflict", title: "Middle East tensions", location: "Israel / Gaza", coords: [34.8, 31.5], date: "Ongoing", summary: "Regional escalation risk keeps an oil risk premium and weighs on EM risk assets.", impact: { commodities: "Brent risk premium", fx: "Safe-haven flows" } },
  { id: "redsea", type: "negative", category: "Supply Chain", title: "Red Sea shipping disruption", location: "Bab el-Mandeb", coords: [43, 13], date: "Ongoing", summary: "Container traffic rerouted around the Cape — longer transit, higher freight rates.", impact: { commodities: "Container rates +", equities: "Shipping, retailers" } },
  { id: "taiwan", type: "watch", category: "Geopolitics", title: "Taiwan Strait risk", location: "Taiwan", coords: [121, 23.7], date: "Watch", summary: "Strategic chokepoint for global semiconductors — any flare-up = global tech tail risk.", impact: { equities: "Semis, AI supply chain" } },
  { id: "us-pol", type: "watch", category: "Politics", title: "US policy cycle", location: "Washington, DC", coords: [-77, 38.9], date: "2025–26", summary: "Trade, tariff and tax policy uncertainty — drives USD, Treasury and risk-asset positioning.", impact: { fx: "DXY", equities: "Sector rotation" } },
  { id: "ai-capex", type: "positive", category: "Capex", title: "AI capex super-cycle", location: "US West Coast", coords: [-122, 37.4], date: "2024–", summary: "Hyperscaler AI investment lifts semis, power, cooling and infrastructure earnings.", impact: { equities: "Semis, utilities, industrials" } },
  { id: "india-growth", type: "positive", category: "Growth", title: "India structural growth", location: "Mumbai", coords: [72.8, 19], date: "Ongoing", summary: "Fastest-growing major economy — pulls in EM equity inflows; valuations stretched.", impact: { equities: "Nifty/Sensex", fx: "INR" } },
  { id: "opec", type: "watch", category: "Commodities", title: "OPEC+ production policy", location: "Riyadh", coords: [46.7, 24.7], date: "Recurring", summary: "Saudi/Russia output decisions anchor the Brent floor and shape inflation paths.", impact: { commodities: "Brent crude", fx: "Petro-FX" } },
  { id: "boj-exit", type: "positive", category: "Policy", title: "BoJ policy normalisation", location: "Tokyo", coords: [139.7, 35.7], date: "2024–", summary: "End of negative rates reshapes global carry trades and JGB demand.", impact: { fx: "USD/JPY carry", equities: "Banks, Nikkei" } },
  { id: "milei", type: "positive", category: "Reform", title: "Argentina reform program", location: "Buenos Aires", coords: [-58.4, -34.6], date: "2023–", summary: "Aggressive disinflation + liberalisation — Merval rallies in USD, sovereign spreads tighten.", impact: { equities: "Merval", fx: "ARS volatile" } },
  { id: "de-ind", type: "negative", category: "Economy", title: "German industrial stagnation", location: "Berlin", coords: [13.4, 52.5], date: "Structural", summary: "High energy costs + China exposure keep the eurozone's engine in low gear.", impact: { equities: "Autos, Chemie", fx: "EUR drag" } },
  { id: "fr-pol", type: "watch", category: "Politics", title: "France fiscal & political risk", location: "Paris", coords: [2.35, 48.85], date: "Ongoing", summary: "Wider OAT–Bund spreads — markets price periphery-like risk into the EU core.", impact: { fx: "EUR", equities: "French banks" } },
  { id: "cn-prop", type: "negative", category: "Economy", title: "China property deleveraging", location: "Beijing", coords: [116.4, 39.9], date: "2021–", summary: "Structural housing slowdown caps Chinese demand for industrial metals and consumption.", impact: { commodities: "Iron ore, copper", equities: "HSI" } },
  { id: "kr-chips", type: "positive", category: "Cycle", title: "Memory chip up-cycle", location: "Seoul", coords: [127, 37.5], date: "2024–", summary: "Samsung & SK Hynix benefit from HBM/AI memory demand — proxy for global tech capex.", impact: { equities: "KOSPI, semis" } },
];

/* ───────── Trade & supply chain flows ───────── */
export type RouteStatus = "stable" | "tense" | "disrupted";
export type TradeFlow = {
  id: string;
  kind: "trade" | "energy" | "commodity" | "supply";
  label: string;
  from: [number, number];
  to: [number, number];
  status: RouteStatus;
  note: string;
};

export const TRADE_FLOWS: TradeFlow[] = [
  { id: "us-cn-pacific", kind: "trade", label: "Trans-Pacific trade", from: [-118, 34], to: [121.5, 31.2], status: "tense", note: "Tariff & tech-export controls weigh on flows." },
  { id: "hormuz-asia", kind: "energy", label: "Gulf → Asia crude", from: [56, 26.5], to: [103.8, 1.3], status: "tense", note: "Strait of Hormuz risk premium on Brent." },
  { id: "redsea-suez", kind: "supply", label: "Red Sea / Suez", from: [43, 13], to: [32.5, 30], status: "disrupted", note: "Container traffic rerouted around the Cape." },
  { id: "ru-eu-gas", kind: "energy", label: "RU → EU gas (legacy)", from: [37.6, 55.7], to: [13.4, 52.5], status: "disrupted", note: "Pipeline flows collapsed; EU depends on LNG." },
  { id: "ru-asia-oil", kind: "energy", label: "RU → India/China crude", from: [60, 60], to: [78, 22], status: "stable", note: "Shadow-fleet routing supports discounted Urals." },
  { id: "sa-eu", kind: "energy", label: "Saudi → Europe crude", from: [46, 24], to: [2.3, 46.6], status: "stable", note: "Replacing Russian barrels into the EU." },
  { id: "us-mx-near", kind: "trade", label: "US ↔ Mexico nearshoring", from: [-100, 28], to: [-97, 38], status: "stable", note: "USMCA-driven FDI from China to Mexico." },
  { id: "br-cn-soy", kind: "commodity", label: "Brazil → China soy/iron", from: [-53, -10], to: [121.5, 31.2], status: "stable", note: "Backbone of Chinese food & steel input demand." },
  { id: "au-cn-iron", kind: "commodity", label: "Australia → China iron ore", from: [115, -25], to: [121.5, 31.2], status: "stable", note: "Largest single bulk-trade lane globally." },
  { id: "asia-us-chips", kind: "supply", label: "TW/KR → US semiconductors", from: [125, 30], to: [-122, 37.4], status: "stable", note: "Critical AI/tech supply chain." },
];

/* ───────── Geopolitical tension lines ───────── */
export type Tension = {
  id: string;
  from: string;
  to: string;
  level: RiskLevel;
  topic: string;
  impact: string;
};

export const TENSIONS: Tension[] = [
  { id: "us-cn", from: "United States of America", to: "China", level: "high", topic: "Trade / chips / Taiwan", impact: "Semis, global risk sentiment" },
  { id: "us-ru", from: "United States of America", to: "Russia", level: "high", topic: "Sanctions / Ukraine", impact: "Energy, defence, FX" },
  { id: "ru-uk", from: "Russia", to: "Ukraine", level: "high", topic: "Active conflict", impact: "Grains, gas, EU risk premium" },
  { id: "cn-in", from: "China", to: "India", level: "medium", topic: "Border friction", impact: "Asian risk sentiment" },
  { id: "sa-ir", from: "Saudi Arabia", to: "Iran", level: "medium", topic: "Regional rivalry", impact: "Brent risk premium" },
  { id: "kp-kr", from: "North Korea", to: "South Korea", level: "medium", topic: "Missile tests / posture", impact: "KOSPI tail risk" },
  { id: "is-ir", from: "Israel", to: "Iran", level: "high", topic: "Direct confrontation risk", impact: "Oil, safe-haven flows" },
];

/* ───────── Market intelligence feed ───────── */
export type FeedItem = {
  id: string;
  time: string;
  category: "FX" | "Commodities" | "Equities" | "Macro" | "Geopolitics" | "Supply";
  title: string;
  body: string;
  impact: RiskLevel;
};

export const MARKET_FEED: FeedItem[] = [
  { id: "f1", time: "Just now", category: "FX", title: "DXY firm above 105", body: "Sticky US data keeps dollar bid — EM FX and JPY pressured.", impact: "medium" },
  { id: "f2", time: "12m", category: "Commodities", title: "Brent holds risk premium", body: "Middle-East tail risk + OPEC+ discipline support oil despite weak China demand.", impact: "medium" },
  { id: "f3", time: "34m", category: "Equities", title: "AI capex narrative intact", body: "Semis lead US equities; rotation into power & infrastructure names continues.", impact: "low" },
  { id: "f4", time: "1h", category: "Supply", title: "Red Sea reroutes persist", body: "Container freight elevated — watch for second-round goods inflation.", impact: "high" },
  { id: "f5", time: "2h", category: "Geopolitics", title: "US–China tech controls widen", body: "New export restrictions on advanced equipment — semi supply chain repriced.", impact: "high" },
  { id: "f6", time: "3h", category: "Macro", title: "BoJ signals patience", body: "Yen weakness persists — global carry trades crowded.", impact: "medium" },
  { id: "f7", time: "5h", category: "Equities", title: "European banks under pressure", body: "French OAT spreads widen — periphery risk creeps into core.", impact: "medium" },
];

/* ───────── Country extras (institutional layer) ───────── */
export type CountryExtras = {
  influenceScore: number; // 1–10
  influenceWhy: string;
  globalRole: string;
  strengthIndex: {
    government: "Strong" | "Moderate" | "Weak";
    policy: "High" | "Medium" | "Low";
    economy: "Strong" | "Medium" | "Weak";
    geopoliticalStability: number; // 1–10
    investorConfidence: "High" | "Medium" | "Low";
  };
  transmission: string[];
};

export const COUNTRY_EXTRAS: Record<string, CountryExtras> = {
  "United States of America": { influenceScore: 10, influenceWhy: "Reserve currency, deepest capital markets, global rate-setter via the Fed.", globalRole: "Sets global liquidity, risk appetite and the price of money.", strengthIndex: { government: "Strong", policy: "Medium", economy: "Strong", geopoliticalStability: 7, investorConfidence: "High" }, transmission: ["Fed policy → global liquidity and EM capital flows.", "USD strength → commodity prices and EM debt sustainability.", "S&P 500 → global equity risk sentiment."] },
  China: { influenceScore: 9, influenceWhy: "Marginal buyer of industrial commodities; core node in global manufacturing.", globalRole: "Drives commodity demand and global goods-price disinflation.", strengthIndex: { government: "Strong", policy: "Medium", economy: "Medium", geopoliticalStability: 5, investorConfidence: "Medium" }, transmission: ["Property + credit cycle → iron ore, copper, steel.", "Export prices → global goods CPI.", "CNY fixing → Asian FX complex."] },
  Germany: { influenceScore: 7, influenceWhy: "Eurozone industrial engine; bellwether for European manufacturing.", globalRole: "Barometer for the European industrial cycle.", strengthIndex: { government: "Moderate", policy: "Medium", economy: "Medium", geopoliticalStability: 7, investorConfidence: "Medium" }, transmission: ["DAX → EU equity sentiment.", "Bund yields → EU rate anchor.", "Auto/chem orders → global industrial pulse."] },
  Japan: { influenceScore: 8, influenceWhy: "World's largest creditor; BoJ shifts move global carry & bond markets.", globalRole: "Global liquidity provider via yen-funded carry trades.", strengthIndex: { government: "Strong", policy: "High", economy: "Medium", geopoliticalStability: 8, investorConfidence: "High" }, transmission: ["BoJ policy → USD/JPY and global bond yields.", "JGB repatriation → Treasury demand.", "Yen strength → global risk-off signal."] },
  "United Kingdom": { influenceScore: 7, influenceWhy: "Major financial centre; GBP and Gilts react to global risk and BoE policy.", globalRole: "Bridge market between US and EU; financial-services hub.", strengthIndex: { government: "Moderate", policy: "Medium", economy: "Medium", geopoliticalStability: 7, investorConfidence: "Medium" }, transmission: ["BoE expectations → GBP.", "Gilt yields → European rate cross-currents.", "London FX volumes → global liquidity."] },
  France: { influenceScore: 6, influenceWhy: "Second-largest eurozone economy; fiscal & political risk drives EUR risk premium.", globalRole: "Sets eurozone political risk premium.", strengthIndex: { government: "Weak", policy: "Low", economy: "Medium", geopoliticalStability: 6, investorConfidence: "Medium" }, transmission: ["OAT–Bund spread → EU sovereign risk.", "CAC40 → EU luxury/credit beta.", "Politics → EUR risk premium."] },
  India: { influenceScore: 7, influenceWhy: "Fastest-growing major economy; magnet for EM equity inflows.", globalRole: "EM growth anchor and China-diversification beneficiary.", strengthIndex: { government: "Strong", policy: "High", economy: "Strong", geopoliticalStability: 7, investorConfidence: "High" }, transmission: ["Domestic growth → EM equity flows.", "Oil/gold imports → current-account FX impact.", "Tech services → global IT spend gauge."] },
  Russia: { influenceScore: 6, influenceWhy: "Top-tier energy and grains exporter; geopolitical tail-risk node.", globalRole: "Marginal supplier of crude, gas and wheat outside Western system.", strengthIndex: { government: "Strong", policy: "Medium", economy: "Medium", geopoliticalStability: 3, investorConfidence: "Low" }, transmission: ["Crude/gas exports → European energy prices.", "Grain exports → global food inflation.", "Geopolitics → safe-haven flows."] },
  Brazil: { influenceScore: 6, influenceWhy: "Top supplier of iron ore, soy and sugar; high-real-rate EM benchmark.", globalRole: "LatAm sentiment and soft-commodity supplier.", strengthIndex: { government: "Moderate", policy: "Medium", economy: "Medium", geopoliticalStability: 6, investorConfidence: "Medium" }, transmission: ["BCB policy → EM carry trades.", "Iron/soy exports → China-linked flow.", "Fiscal news → BRL volatility."] },
  Canada: { influenceScore: 5, influenceWhy: "G7 commodity exporter; high-beta proxy to the US consumer and oil.", globalRole: "US consumer proxy + crude/uranium supplier.", strengthIndex: { government: "Strong", policy: "High", economy: "Medium", geopoliticalStability: 8, investorConfidence: "High" }, transmission: ["BoC tracks Fed → CAD correlated with oil.", "WCS crude → North-American energy balance.", "Housing → consumer signal."] },
  "Saudi Arabia": { influenceScore: 8, influenceWhy: "OPEC+ leader and swing producer — single-handedly moves Brent.", globalRole: "Sets the global oil price floor.", strengthIndex: { government: "Strong", policy: "High", economy: "Strong", geopoliticalStability: 6, investorConfidence: "Medium" }, transmission: ["OPEC+ output → Brent crude.", "PIF flows → global private markets.", "Petrodollar recycling → US Treasuries."] },
  "South Korea": { influenceScore: 7, influenceWhy: "Backbone of global memory & AI semiconductor supply chain.", globalRole: "Leading indicator of global tech demand.", strengthIndex: { government: "Moderate", policy: "Medium", economy: "Strong", geopoliticalStability: 6, investorConfidence: "Medium" }, transmission: ["Memory pricing → global tech earnings.", "KRW → Asian risk barometer.", "Exports → global trade pulse."] },
  Mexico: { influenceScore: 6, influenceWhy: "Nearshoring's top winner; high-real-rate EM carry favourite.", globalRole: "Industrial gateway to the US market.", strengthIndex: { government: "Moderate", policy: "Medium", economy: "Medium", geopoliticalStability: 5, investorConfidence: "Medium" }, transmission: ["Banxico → MXN carry.", "USMCA flows → industrial FDI.", "Remittances → US labour proxy."] },
  Australia: { influenceScore: 6, influenceWhy: "Largest iron ore and major LNG exporter; AUD = China-demand proxy.", globalRole: "Real-time gauge of Chinese industrial demand.", strengthIndex: { government: "Strong", policy: "High", economy: "Strong", geopoliticalStability: 8, investorConfidence: "High" }, transmission: ["Iron ore → AUD.", "LNG exports → Asian energy balance.", "RBA → AUD/USD vs Fed."] },
  Argentina: { influenceScore: 4, influenceWhy: "Frontier reform story; influences EM risk premium and sovereign spreads.", globalRole: "EM reform bellwether; lithium & soy supplier.", strengthIndex: { government: "Moderate", policy: "Medium", economy: "Weak", geopoliticalStability: 5, investorConfidence: "Medium" }, transmission: ["Disinflation pace → sovereign spreads.", "Lithium → battery supply chain.", "FX reserves → EM contagion risk."] },
};

export const EVENT_COLOR: Record<EventType, string> = {
  negative: "oklch(0.62 0.13 25)",
  positive: "oklch(0.62 0.09 155)",
  watch: "oklch(0.74 0.10 78)",
};

export const ROUTE_COLOR: Record<RouteStatus, string> = {
  stable: "oklch(0.65 0.06 200)",
  tense: "oklch(0.74 0.10 78)",
  disrupted: "oklch(0.62 0.13 25)",
};
