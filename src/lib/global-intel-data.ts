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
  // ── Additional tracked economies (concise briefings) ─────────────────
  {
    name: "Italy", iso2: "IT", flag: "🇮🇹", risk: "medium",
    summary: "Hohe Staatsschulden + BTP-Spread bleiben Eurozone-Risikobarometer.",
    pivotalEvent: { title: "PNRR / EU-Wiederaufbaufonds", year: "2021", why: "Größter Empfänger — Investitionen stützen Wachstum, aber Reformtempo entscheidet." },
    geopolitics: { governmentStability: "Moderate", politicalRisk: "Medium", tensions: "EU-Fiskalregeln, Migration.", policyDirection: "Mixed" },
    economy: { inflation: "falling", rates: "easing", gdp: "slowing", fxVsUsd: "stable" },
    impact: { equities: "FTSE MIB stark von Banken (UniCredit, Intesa) getrieben.", forex: "BTP-Spread → EUR-Sentiment.", commodities: "LNG-Importeur.", sentiment: "Periphere Eurozone-Indikator." },
    positives: ["Exportstarke Industrie", "Tourismus", "EU-Mittel"], negatives: ["Staatsverschuldung > 135% BIP", "Demografie", "Niedrige Produktivität"],
    newsKeywords: ["FTSE MIB", "BTP spread", "Italy economy", "Meloni"],
  },
  {
    name: "Spain", iso2: "ES", flag: "🇪🇸", risk: "low",
    summary: "Eurozonen-Outperformer — Tourismus & Dienstleistungen treiben Wachstum.",
    pivotalEvent: { title: "Post-Covid Tourismus-Recovery", year: "2022", why: "Rekord-Touristenzahlen stützen Konsum & Beschäftigung, IBEX überrascht positiv." },
    geopolitics: { governmentStability: "Moderate", politicalRisk: "Medium", tensions: "Katalonien-Frage, EU-Politik.", policyDirection: "Mixed" },
    economy: { inflation: "falling", rates: "easing", gdp: "growing", fxVsUsd: "stable" },
    impact: { equities: "IBEX 35 von Banken & Telekom dominiert.", forex: "EUR-Anker.", commodities: "Solarenergie-Vorreiter.", sentiment: "Südeuropa-Bellwether." },
    positives: ["Tourismus", "Erneuerbare Energien", "Demografie-Zuzug"], negatives: ["Jugendarbeitslosigkeit", "Politische Fragmentierung"],
    newsKeywords: ["IBEX", "Spain economy", "Bank of Spain", "tourism"],
  },
  {
    name: "Netherlands", iso2: "NL", flag: "🇳🇱", risk: "low",
    summary: "ASML & Häfen — Europas wichtigster Tech- & Logistik-Knotenpunkt.",
    pivotalEvent: { title: "EUV-Lithografie-Exportkontrollen", year: "2023", why: "ASML steht im Zentrum der US-China-Chip-Sanktionen — bewegt globale Halbleiter-Lieferkette." },
    geopolitics: { governmentStability: "Moderate", politicalRisk: "Medium", tensions: "EU-Führungsrolle, Migration.", policyDirection: "Pro-growth" },
    economy: { inflation: "falling", rates: "easing", gdp: "growing", fxVsUsd: "stable" },
    impact: { equities: "AEX = ASML + Shell + Banken.", forex: "EUR-Kern.", commodities: "Rotterdam = EU-Ölhub.", sentiment: "EU-Handelsbarometer." },
    positives: ["Tech-Cluster", "Logistik-Hubs", "Stabile Finanzen"], negatives: ["Konzentration auf ASML", "Wohnungsmarkt"],
    newsKeywords: ["AEX", "ASML", "Netherlands", "Rotterdam"],
  },
  {
    name: "Switzerland", iso2: "CH", flag: "🇨🇭", risk: "low",
    summary: "Safe-Haven — CHF & SNB-Interventionen sind globaler Risk-Off-Indikator.",
    pivotalEvent: { title: "Credit-Suisse-Übernahme durch UBS", year: "2023", why: "Größte Bank-Notfusion seit 2008 — neue Risiken im Schweizer Finanzplatz." },
    geopolitics: { governmentStability: "Strong", politicalRisk: "Low", tensions: "EU-Bilateralien, Neutralität.", policyDirection: "Pro-growth" },
    economy: { inflation: "stable", rates: "easing", gdp: "growing", fxVsUsd: "strengthening" },
    impact: { equities: "SMI von Nestlé, Novartis, Roche dominiert.", forex: "CHF = Safe-Haven, SNB toleriert Stärke.", commodities: "Gold-Handelszentrum.", sentiment: "Globaler Risk-Off-Signal." },
    positives: ["Pharma-Schwergewichte", "Politische Stabilität", "Innovationskraft"], negatives: ["CHF-Stärke belastet Export", "Bank-Konzentration"],
    newsKeywords: ["SMI", "SNB", "Swiss franc", "UBS"],
  },
  {
    name: "Turkey", iso2: "TR", flag: "🇹🇷", risk: "high",
    summary: "Orthodoxe Geldpolitik-Wende — hohe Zinsen, Lira stabilisiert, Inflation hoch.",
    pivotalEvent: { title: "Zinswende unter Şimşek", year: "2023", why: "Rückkehr zu konventioneller Geldpolitik nach Jahren der Erdogan-Doktrin." },
    geopolitics: { governmentStability: "Moderate", politicalRisk: "High", tensions: "NATO-Rolle, Syrien, Russland-Balance.", policyDirection: "Mixed" },
    economy: { inflation: "falling", rates: "high", gdp: "growing", fxVsUsd: "weakening" },
    impact: { equities: "BIST 100 in USD-Terms volatil.", forex: "TRY-Carry-Trade-Revival.", commodities: "Großimporteur Energie.", sentiment: "EM-Reformstory mit Fragezeichen." },
    positives: ["Zinswende", "Junge Demografie", "Geostrategische Lage"], negatives: ["Inflations-Erbe", "FX-Reserven", "Politische Risiken"],
    newsKeywords: ["BIST", "Turkish lira", "CBRT", "Erdogan"],
  },
  {
    name: "Indonesia", iso2: "ID", flag: "🇮🇩", risk: "medium",
    summary: "Nickel-Supermacht — Batterie-Lieferkette macht IDX zum EM-Wachstumsstar.",
    pivotalEvent: { title: "Nickel-Exportverbot & Downstream-Strategie", year: "2020", why: "Zwingt Hersteller zur Verarbeitung im Land — Indonesien wird EV-Battery-Hub." },
    geopolitics: { governmentStability: "Moderate", politicalRisk: "Medium", tensions: "Südchinesisches Meer.", policyDirection: "Pro-growth" },
    economy: { inflation: "stable", rates: "high", gdp: "growing", fxVsUsd: "stable" },
    impact: { equities: "IDX = Banken + Rohstoffe.", forex: "IDR von BI verteidigt.", commodities: "Nickel, Kohle, Palmöl.", sentiment: "ASEAN-Wachstumsanker." },
    positives: ["Demografie", "Nickel-Reserven", "Inlandskonsum"], negatives: ["Infrastruktur", "Korruption", "Rohstoff-Abhängigkeit"],
    newsKeywords: ["IDX", "Bank Indonesia", "rupiah", "nickel"],
  },
  {
    name: "Vietnam", iso2: "VN", flag: "🇻🇳", risk: "medium",
    summary: "China+1-Profiteur — FDI-Magnet für Elektronik & Textil.",
    pivotalEvent: { title: "Verlagerung der Apple-Lieferkette", year: "2020", why: "Tim Cook macht Vietnam zum zweiten Fertigungspol." },
    geopolitics: { governmentStability: "Strong", politicalRisk: "Low", tensions: "Südchinesisches Meer.", policyDirection: "Pro-growth" },
    economy: { inflation: "stable", rates: "high", gdp: "growing", fxVsUsd: "stable" },
    impact: { equities: "VN-Index getrieben von Banken & Real Estate.", forex: "VND eng an USD geführt.", commodities: "Kaffee, Reis.", sentiment: "Frontier-Markt-Aufsteiger." },
    positives: ["FDI-Welle", "Demografie", "Exportstärke"], negatives: ["Bauboom-Risiken", "Banken-NPLs"],
    newsKeywords: ["VN-Index", "Vietnam economy", "FDI", "Apple supply chain"],
  },
  {
    name: "Thailand", iso2: "TH", flag: "🇹🇭", risk: "medium",
    summary: "Tourismus-Recovery + Auto-Industrie — Übergang von ICE zu EV ist Schlüssel.",
    pivotalEvent: { title: "Chinesische EV-Investitionen (BYD)", year: "2023", why: "Thailand wird ASEAN-EV-Drehscheibe." },
    geopolitics: { governmentStability: "Moderate", politicalRisk: "Medium", tensions: "Innenpolitik, Myanmar-Grenze.", policyDirection: "Mixed" },
    economy: { inflation: "stable", rates: "high", gdp: "growing", fxVsUsd: "stable" },
    impact: { equities: "SET = Tourismus + Energie + Banken.", forex: "THB tourismussensitiv.", commodities: "Reis, Gummi.", sentiment: "ASEAN-Konsum-Bellwether." },
    positives: ["Tourismus", "Auto-Cluster", "Solide FX-Reserven"], negatives: ["Politische Instabilität", "Demografie"],
    newsKeywords: ["SET Index", "Bank of Thailand", "baht", "tourism"],
  },
  {
    name: "Philippines", iso2: "PH", flag: "🇵🇭", risk: "medium",
    summary: "BPO-Champion + hohe Remittances — robuster Inlandskonsum stützt Wachstum.",
    pivotalEvent: { title: "Marcos-Jr.-Wirtschaftsoffensive", year: "2022", why: "Infrastruktur-Push & US-Allianz-Vertiefung verändern Investment-Klima." },
    geopolitics: { governmentStability: "Moderate", politicalRisk: "Medium", tensions: "Südchinesisches Meer, US-Allianz.", policyDirection: "Pro-growth" },
    economy: { inflation: "stable", rates: "high", gdp: "growing", fxVsUsd: "stable" },
    impact: { equities: "PSEi konsumlastig.", forex: "PHP von Remittances gestützt.", commodities: "Nickel-Exporteur.", sentiment: "ASEAN-Konsum." },
    positives: ["Demografie", "BPO-Industrie", "Remittances"], negatives: ["Defizite", "Klimarisiken"],
    newsKeywords: ["PSEi", "BSP", "peso", "Philippines"],
  },
  {
    name: "Malaysia", iso2: "MY", flag: "🇲🇾", risk: "low",
    summary: "Halbleiter-Backend-Hub & Palmöl-Großmacht — diversifizierte EM-Wirtschaft.",
    pivotalEvent: { title: "Chip-Packaging-Boom", year: "2022", why: "Intel, Infineon & TSMC bauen Backend-Kapazität in Penang aus." },
    geopolitics: { governmentStability: "Moderate", politicalRisk: "Medium", tensions: "Südchinesisches Meer.", policyDirection: "Mixed" },
    economy: { inflation: "stable", rates: "high", gdp: "growing", fxVsUsd: "stable" },
    impact: { equities: "KLCI von Banken & Plantagen geprägt.", forex: "MYR rohstoff- und chip-sensitiv.", commodities: "Palmöl, LNG.", sentiment: "ASEAN-Diversifikation." },
    positives: ["Chip-Packaging", "Politische Stabilisierung", "Rohstoffe"], negatives: ["Brain-Drain", "Subventionsdruck"],
    newsKeywords: ["KLCI", "Bank Negara", "ringgit", "palm oil"],
  },
  {
    name: "South Africa", iso2: "ZA", flag: "🇿🇦", risk: "high",
    summary: "Platinum & Gold — strukturelle Strom-Krise begrenzt Wachstum.",
    pivotalEvent: { title: "Loadshedding-Krise & GNU-Koalition", year: "2024", why: "Erste Koalitionsregierung seit 1994 — Markt hofft auf Reformen." },
    geopolitics: { governmentStability: "Moderate", politicalRisk: "Medium", tensions: "BRICS-Rolle, US-Beziehungen.", policyDirection: "Mixed" },
    economy: { inflation: "stable", rates: "high", gdp: "slowing", fxVsUsd: "weakening" },
    impact: { equities: "JSE = Minenwerte.", forex: "ZAR hochvolatil.", commodities: "Platin, Palladium, Chrom, Gold.", sentiment: "Afrika-Bellwether." },
    positives: ["Rohstoffreserven", "Finanzsektor", "Reformhoffnung"], negatives: ["Strom-Krise", "Arbeitslosigkeit", "Kriminalität"],
    newsKeywords: ["JSE", "SARB", "rand", "Eskom"],
  },
  {
    name: "Nigeria", iso2: "NG", flag: "🇳🇬", risk: "high",
    summary: "Tinubu-Reformen — Subventions-Abbau und Naira-Floating ändern EM-Bewertung.",
    pivotalEvent: { title: "Treibstoff-Subvention-Abschaffung", year: "2023", why: "Politisch riskanter Schritt — kurzfristig Inflation, langfristig fiskalische Entlastung." },
    geopolitics: { governmentStability: "Moderate", politicalRisk: "High", tensions: "Sahel-Region, Boko Haram.", policyDirection: "Pro-growth" },
    economy: { inflation: "rising", rates: "high", gdp: "growing", fxVsUsd: "weakening" },
    impact: { equities: "NGX rallyte nach Reformen.", forex: "NGN-Floating brachte 70% Abwertung.", commodities: "Größter Öl-Exporteur Afrikas.", sentiment: "Afrika-Frontier." },
    positives: ["Demografie", "Öl & Gas", "Reformen"], negatives: ["Sicherheit", "Korruption", "Inflation"],
    newsKeywords: ["NGX", "CBN", "naira", "Tinubu"],
  },
  {
    name: "Egypt", iso2: "EG", flag: "🇪🇬", risk: "high",
    summary: "Suez-Einnahmen brechen weg, IWF stützt — Touristik & Gas sind Lebensadern.",
    pivotalEvent: { title: "Ras-El-Hekma-Deal mit VAE", year: "2024", why: "35 Mrd USD FDI rettet kurzfristig die Bilanz." },
    geopolitics: { governmentStability: "Moderate", politicalRisk: "High", tensions: "Gaza, Sudan, Äthiopien-Damm.", policyDirection: "Restrictive" },
    economy: { inflation: "rising", rates: "high", gdp: "slowing", fxVsUsd: "weakening" },
    impact: { equities: "EGX30 in USD-Terms volatil.", forex: "EGP mehrfach abgewertet.", commodities: "LNG-Exporteur.", sentiment: "MENA-Risiko-Barometer." },
    positives: ["Demografie", "Tourismus", "IWF-Anker"], negatives: ["Schulden", "Suez-Ausfälle", "Importabhängigkeit"],
    newsKeywords: ["EGX", "Egypt economy", "Suez canal", "IMF"],
  },
  {
    name: "United Arab Emirates", iso2: "AE", flag: "🇦🇪", risk: "low",
    summary: "Regionaler Finanz- & Logistikhub — Diversifikation weg vom Öl beschleunigt.",
    pivotalEvent: { title: "Expo 2020 + Krypto-Hub", year: "2021", why: "Talent- und Kapitalmagnet für HNW-Investoren." },
    geopolitics: { governmentStability: "Strong", politicalRisk: "Low", tensions: "Iran, Jemen, Israel-Normalisierung.", policyDirection: "Pro-growth" },
    economy: { inflation: "stable", rates: "high", gdp: "growing", fxVsUsd: "stable" },
    impact: { equities: "DFM & ADX von Immobilien, Banken, Energie geprägt.", forex: "AED an USD gepegt.", commodities: "Öl-Exporteur.", sentiment: "Golf-Stabilitätsanker." },
    positives: ["Diversifikation", "Finanzhub", "Politische Stabilität"], negatives: ["Geopolitisches Umfeld", "Immobilien-Zyklus"],
    newsKeywords: ["DFM", "ADX", "UAE economy", "Dubai"],
  },
  {
    name: "Poland", iso2: "PL", flag: "🇵🇱", risk: "low",
    summary: "Nearshoring-Profiteur in der EU — Verteidigungsausgaben & EU-Mittel treiben Wachstum.",
    pivotalEvent: { title: "EU-Fonds-Freigabe nach Tusk-Wahl", year: "2023", why: "60 Mrd EUR fließen — Investitionsschub & Reform-Momentum." },
    geopolitics: { governmentStability: "Strong", politicalRisk: "Low", tensions: "Russland/Belarus-Grenze.", policyDirection: "Pro-growth" },
    economy: { inflation: "falling", rates: "high", gdp: "growing", fxVsUsd: "stable" },
    impact: { equities: "WIG20 von Banken & Energie dominiert.", forex: "PLN von NBP gestützt.", commodities: "Kohle-Phaseout läuft.", sentiment: "CEE-Anker." },
    positives: ["EU-Mittel", "Verteidigungsboom", "Stabile Demografie"], negatives: ["Energie-Mix Kohle", "Politische Polarisierung"],
    newsKeywords: ["WIG20", "NBP", "zloty", "Poland economy"],
  },
  {
    name: "Sweden", iso2: "SE", flag: "🇸🇪", risk: "low",
    summary: "Hochzyklische Industrie + Immobilien-Stress — Riksbank fährt Lockerung an.",
    pivotalEvent: { title: "NATO-Beitritt", year: "2024", why: "Ende der 200-jährigen Neutralität — strategische Neuausrichtung." },
    geopolitics: { governmentStability: "Strong", politicalRisk: "Low", tensions: "Russland (Ostsee).", policyDirection: "Pro-growth" },
    economy: { inflation: "falling", rates: "easing", gdp: "slowing", fxVsUsd: "stable" },
    impact: { equities: "OMXS30 = Industrie + Banken.", forex: "SEK zyklisch.", commodities: "Eisenerz, Holz.", sentiment: "Nordeuropa-Bellwether." },
    positives: ["Innovationskraft", "Rohstoffe", "NATO"], negatives: ["Immobilien-Stress", "Hohe Verbraucherschulden"],
    newsKeywords: ["OMX", "Riksbank", "krona", "Sweden"],
  },
  {
    name: "Norway", iso2: "NO", flag: "🇳🇴", risk: "low",
    summary: "Öl & Gas + Staatsfonds NBIM — globaler Marginalkäufer von Aktien.",
    pivotalEvent: { title: "Gas-Substitution für Russland in Europa", year: "2022", why: "Norwegen wird größter Gaslieferant der EU." },
    geopolitics: { governmentStability: "Strong", politicalRisk: "Low", tensions: "NATO-Nordflanke.", policyDirection: "Pro-growth" },
    economy: { inflation: "stable", rates: "high", gdp: "growing", fxVsUsd: "weakening" },
    impact: { equities: "OBX = Equinor, DNB.", forex: "NOK öl-korreliert.", commodities: "Erdgas, Brent, Lachs.", sentiment: "Globaler Kapital-Allokator via NBIM." },
    positives: ["Staatsfonds 1,7 Bio USD", "Energie", "Stabilität"], negatives: ["NOK-Volatilität", "Klima-Umbau"],
    newsKeywords: ["Oslo OBX", "NBIM", "Norges Bank", "krone"],
  },
  {
    name: "Chile", iso2: "CL", flag: "🇨🇱", risk: "low",
    summary: "Kupfer-Supermacht + Lithium-Reserven — globale Energiewende-Schlüsselrolle.",
    pivotalEvent: { title: "Nationale Lithium-Strategie", year: "2023", why: "Staatliche Kontrolle der Lithium-Förderung." },
    geopolitics: { governmentStability: "Moderate", politicalRisk: "Medium", tensions: "Verfassungsdebatten.", policyDirection: "Mixed" },
    economy: { inflation: "stable", rates: "easing", gdp: "growing", fxVsUsd: "stable" },
    impact: { equities: "IPSA von Codelco-Beteiligungen & Banken geprägt.", forex: "CLP kupfer-sensitiv.", commodities: "Kupfer (28% Welt), Lithium.", sentiment: "LatAm-Investmentgrade-Anker." },
    positives: ["Rohstoffreserven", "Institutionen", "Pensionssystem"], negatives: ["Kupfer-Zyklus", "Politische Volatilität"],
    newsKeywords: ["IPSA", "BCCh", "Chilean peso", "copper"],
  },
  {
    name: "Colombia", iso2: "CO", flag: "🇨🇴", risk: "medium",
    summary: "Öl-Exporteur unter Petro-Regierung — Energie-Transition unsicher.",
    pivotalEvent: { title: "Petro-Wahl & Reformprogramm", year: "2022", why: "Erste Links-Regierung — Markt fürchtet Reformen." },
    geopolitics: { governmentStability: "Moderate", politicalRisk: "Medium", tensions: "Venezuela, Drogenkonflikte.", policyDirection: "Mixed" },
    economy: { inflation: "falling", rates: "easing", gdp: "slowing", fxVsUsd: "weakening" },
    impact: { equities: "COLCAP defensiv.", forex: "COP öl-sensitiv.", commodities: "Öl, Kohle, Kaffee.", sentiment: "LatAm-Reformrisiko." },
    positives: ["Biodiversität", "Rohstoffe", "USMCA-Nähe"], negatives: ["Politik-Unsicherheit", "Sicherheit"],
    newsKeywords: ["COLCAP", "BanRep", "Colombian peso", "Petro"],
  },
  {
    name: "Pakistan", iso2: "PK", flag: "🇵🇰", risk: "high",
    summary: "IWF-abhängig — chronische Zahlungsbilanz-Krisen & Energieengpässe.",
    pivotalEvent: { title: "IWF-Bailout 2023", year: "2023", why: "Letzter Moment vor Default — Sparpaket erzwingt Reformen." },
    geopolitics: { governmentStability: "Weak", politicalRisk: "High", tensions: "Indien, Afghanistan, China-CPEC.", policyDirection: "Unstable" },
    economy: { inflation: "falling", rates: "high", gdp: "slowing", fxVsUsd: "weakening" },
    impact: { equities: "KSE-100 in USD-Terms volatil.", forex: "PKR mehrfach abgewertet.", commodities: "Großimporteur Öl, LNG.", sentiment: "Frontier-Krisenfall." },
    positives: ["Demografie", "Reform-Notwendigkeit", "CPEC-Infrastruktur"], negatives: ["Schulden", "Sicherheit", "Politische Instabilität"],
    newsKeywords: ["KSE-100", "SBP", "Pakistani rupee", "IMF"],
  },
  {
    name: "Taiwan", iso2: "TW", flag: "🇹🇼", risk: "medium",
    summary: "TSMC = globale Chip-Lebensader — geopolitisches Hebelpunkt-Land schlechthin.",
    pivotalEvent: { title: "Lai-Wahl & China-Spannungen", year: "2024", why: "DPP-Sieg vertieft Spannungen — Taiwan-Risikoprämie steigt." },
    geopolitics: { governmentStability: "Strong", politicalRisk: "Medium", tensions: "China-Wiedervereinigungsdoktrin.", policyDirection: "Pro-growth" },
    economy: { inflation: "stable", rates: "tightening", gdp: "growing", fxVsUsd: "stable" },
    impact: { equities: "TAIEX dominiert von TSMC, MediaTek.", forex: "TWD chip-zyklisch.", commodities: "Energie-Importeur.", sentiment: "Globaler AI/Tech-Tail-Risk." },
    positives: ["Chip-Monopol", "Demokratie", "Hohe FX-Reserven"], negatives: ["Geopolitisches Tail-Risk", "China-Abhängigkeit Export"],
    newsKeywords: ["TAIEX", "TSMC", "Taiwan", "Taiwan dollar"],
  },
  {
    name: "Singapore", iso2: "SG", flag: "🇸🇬", risk: "low",
    summary: "Asiens Finanz- & Vermögens-Hub — MAS nutzt FX statt Zinsen als Steuerungsinstrument.",
    pivotalEvent: { title: "China-Hongkong-Vermögensflucht", year: "2022", why: "Singapur wird primärer Empfänger asiatischer HNW-Gelder." },
    geopolitics: { governmentStability: "Strong", politicalRisk: "Low", tensions: "US-China-Balance.", policyDirection: "Pro-growth" },
    economy: { inflation: "stable", rates: "high", gdp: "growing", fxVsUsd: "strengthening" },
    impact: { equities: "STI von DBS, OCBC, UOB dominiert.", forex: "SGD via MAS-Band gesteuert.", commodities: "Öl-Raffinerie-Hub.", sentiment: "ASEAN-Stabilitätsanker." },
    positives: ["Institutionen", "Finanzhub", "Politische Stabilität"], negatives: ["Demografie", "Externe Schocks-Sensitivität"],
    newsKeywords: ["STI", "MAS", "Singapore dollar", "DBS"],
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
  Italy: [12.5, 42.5],
  Spain: [-3.7, 40.4],
  Netherlands: [5.3, 52.1],
  Switzerland: [8.2, 46.8],
  Turkey: [35, 39],
  Indonesia: [113, -2],
  Vietnam: [108, 16],
  Thailand: [101, 15],
  Philippines: [122, 13],
  Malaysia: [102, 4],
  "South Africa": [25, -29],
  Nigeria: [8, 9.5],
  Egypt: [30, 27],
  "United Arab Emirates": [54, 24],
  Poland: [19.5, 52],
  Sweden: [16, 62],
  Norway: [9, 61],
  Chile: [-71, -35],
  Colombia: [-74, 4.5],
  Pakistan: [70, 30],
  Singapore: [103.8, 1.3],
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
  /** 2–4 sentence trader-grade explanation. Plain English, but with the
   *  mechanism + asset linkage a seasoned trader expects. */
  summary: string;
  /** Search query used to pull a live article from the user's trusted news sources. */
  newsQuery: string;
  impact: { fx?: string; commodities?: string; equities?: string; regions?: string };
};

export const EVENTS: GlobalEvent[] = [
  {
    id: "ukr-war", type: "negative", category: "Conflict", title: "Ukraine–Russia conflict",
    location: "Eastern Europe", coords: [31.2, 49], date: "Ongoing",
    summary:
      "Russia's full-scale invasion of Ukraine is now a multi-year war of attrition, and that permanence is what matters for markets. Europe has been forced to replace cheap Russian pipeline gas with expensive seaborne LNG, which keeps a structural cost premium on European industry and a floor under TTF gas. NATO defence budgets are stepping up for years, driving a re-rating of defence primes (RHM, BA., LMT), while Black Sea grain disruption keeps wheat and sunflower oil sensitive to every drone strike on port infrastructure. Trade the EUR through the energy-import-bill lens and watch any ceasefire headlines as a fast risk-on trigger for European cyclicals.",
    newsQuery: "Ukraine Russia war markets energy defence",
    impact: { commodities: "Wheat, gas, oil premium", fx: "EUR risk premium", regions: "EU industry" },
  },
  {
    id: "mideast", type: "negative", category: "Conflict", title: "Middle East tensions",
    location: "Israel / Gaza", coords: [34.8, 31.5], date: "Ongoing",
    summary:
      "The Israel–Gaza war plus the proxy axis (Hezbollah, Houthis, Iran) keeps a constant escalation risk over the Gulf, which is the world's most important oil-producing region. Even without a direct supply outage, traders have to price a 5–10 USD/bbl 'fear premium' into Brent because any incident near the Strait of Hormuz or a strike on Saudi/Iranian energy infrastructure can spike crude double-digit percent in hours. That premium feeds straight into headline inflation, complicating central-bank pivots, and pushes safe-haven flows into USD, CHF, JPY and gold while pressuring EM FX and risk equities. For positioning: hedge oil-sensitive shorts, watch XLE/airlines as the cleanest pair trade, and treat any de-escalation headline as a sharp mean-revert opportunity.",
    newsQuery: "Israel Gaza Middle East oil markets escalation",
    impact: { commodities: "Brent risk premium", fx: "Safe-haven flows" },
  },
  {
    id: "redsea", type: "negative", category: "Supply Chain", title: "Red Sea shipping disruption",
    location: "Bab el-Mandeb", coords: [43, 13], date: "Ongoing",
    summary:
      "Houthi attacks on commercial shipping in the Red Sea have pushed most container lines (Maersk, MSC, Hapag-Lloyd, CMA CGM) to reroute around the Cape of Good Hope, adding 10–14 days and ~30% to a typical Asia–Europe voyage. Spot freight rates on the SCFI Shanghai–Europe leg have multiple-X'd from pre-crisis levels, and that cost is now showing up in European retailer guidance and goods CPI. The longer this lasts, the more it acts as a stealth tightening of European financial conditions even as the ECB is trying to cut. Tactically: long shipping (MAERSK-B, ZIM, HLAG) and tanker names benefit, while EU discretionary retailers and just-in-time auto OEMs are squeezed on working capital.",
    newsQuery: "Red Sea Houthi shipping container freight rates",
    impact: { commodities: "Container rates +", equities: "Shipping, retailers" },
  },
  {
    id: "taiwan", type: "watch", category: "Geopolitics", title: "Taiwan Strait risk",
    location: "Taiwan", coords: [121, 23.7], date: "Watch",
    summary:
      "Taiwan produces ~90% of the world's leading-edge semiconductors via TSMC, which makes the Strait the single largest concentrated tail risk in global equities. The 'normal' state is grey-zone pressure — PLA incursions, drills around election cycles, US arms packages — and that alone is enough to drive periodic risk-off spikes in semis (SMCI, NVDA, TSM, ASML) and AI-adjacent capex names. A genuine blockade scenario would price like a black swan: VIX 40+, Nasdaq -15% in days, JPY/CHF surge, and a cascade through every AI server, hyperscaler and equipment name globally. Treat each headline as a vol opportunity rather than a directional trade; the optionality skew on SOX/SMH and TSM is the cleanest expression.",
    newsQuery: "Taiwan China semiconductor TSMC tensions",
    impact: { equities: "Semis, AI supply chain" },
  },
  {
    id: "us-pol", type: "watch", category: "Politics", title: "US policy cycle",
    location: "Washington, DC", coords: [-77, 38.9], date: "2025–26",
    summary:
      "The US is in a high-variance policy regime: a tariff agenda, an extension/expiration debate on the 2017 tax cuts, and an unusually politicised Fed conversation are all live at once. Tariffs act as a stagflationary impulse — they're a tax on imports that lifts goods CPI and squeezes margins for retailers, autos and consumer-electronics importers, while propping up domestic steel, aluminium and select industrial names. Tax/fiscal uncertainty is the main driver of the long end of the Treasury curve and, by extension, of US equity multiples and the DXY. Trade it through the curve (2s10s steepeners on dovish surprises) and rotate between large-cap exporters and domestic small-caps as the policy mix shifts.",
    newsQuery: "US tariffs Federal Reserve fiscal policy markets",
    impact: { fx: "DXY", equities: "Sector rotation" },
  },
  {
    id: "ai-capex", type: "positive", category: "Capex", title: "AI capex super-cycle",
    location: "US West Coast", coords: [-122, 37.4], date: "2024–",
    summary:
      "Hyperscalers (Microsoft, Meta, Google, Amazon, Oracle) have collectively guided 200B+ USD per year of AI infrastructure capex, and the full second-order chain — NVDA accelerators, HBM memory (SK Hynix, Micron, Samsung), networking (Arista, Broadcom), power (Vertiv, Eaton, GE Vernova), grid build-out and even uranium/nuclear utilities — is being repriced for a multi-year demand pull. The risk is that this is concentrated in a handful of customers, so any guidance cut from one hyperscaler hits the whole chain. The cleanest framework: own the picks-and-shovels (NVDA, AVGO, ANET, VRT) on dips, watch power capacity as the real bottleneck, and treat any 'capex digestion' headline as a chance to re-add at better entries.",
    newsQuery: "AI capex hyperscaler datacenter Nvidia spending",
    impact: { equities: "Semis, utilities, industrials" },
  },
  {
    id: "india-growth", type: "positive", category: "Growth", title: "India structural growth",
    location: "Mumbai", coords: [72.8, 19], date: "Ongoing",
    summary:
      "India is now the fastest-growing major economy (6–7% real GDP), with a 'China+1' manufacturing tailwind, a 1.4B-person consumer base, and a digital stack (UPI, Aadhaar) that is genuinely structural. That story has pulled persistent foreign equity inflows into Nifty/Sensex, and domestic SIP flows now add a daily bid that smooths drawdowns. The catch is valuation — India trades at a meaningful premium to other EM, so it is more vulnerable to a USD/rates shock than the headline growth suggests. Express it through INDA/EPI for broad exposure, large-cap private banks (HDFCBANK, ICICIBANK) for the credit cycle, and stay disciplined on entry multiples.",
    newsQuery: "India economy stocks Nifty foreign inflows",
    impact: { equities: "Nifty/Sensex", fx: "INR" },
  },
  {
    id: "opec", type: "watch", category: "Commodities", title: "OPEC+ production policy",
    location: "Riyadh", coords: [46.7, 24.7], date: "Recurring",
    summary:
      "Saudi Arabia and Russia anchor OPEC+ and currently hold several million barrels/day of voluntary cuts off the market, which is the main reason Brent has a soft floor in the high-60s/low-70s despite weak Chinese demand. Every OPEC+ meeting is therefore a binary headline event: an extension is bullish crude and petro-FX (CAD, NOK, MXN); any unwind hint flushes energy equities and lifts global airlines/consumer names. Watch the Saudi fiscal break-even (currently above spot Brent) — it's the structural reason the Kingdom defends prices. Trade it through XLE/XOP for the equity leg and USD/CAD or NOK crosses for the FX leg.",
    newsQuery: "OPEC oil production cuts Saudi Arabia Russia",
    impact: { commodities: "Brent crude", fx: "Petro-FX" },
  },
  {
    id: "boj-exit", type: "positive", category: "Policy", title: "BoJ policy normalisation",
    location: "Tokyo", coords: [139.7, 35.7], date: "2024–",
    summary:
      "After two decades of zero/negative rates, the Bank of Japan has begun a slow normalisation — ending NIRP, lifting the YCC cap, and signalling further hikes if wage growth sustains. That single shift is enough to unwind the world's largest carry trade: JPY-funded longs in USD, MXN, BRL and global tech. When the BoJ surprises hawkish, you typically get a sharp USD/JPY drop, a spike in JGB yields, and a forced deleveraging in crowded carry pairs and high-beta US tech. Tactically: Japanese banks (8306, 8316, 8411) are the cleanest beneficiaries, while any USD/JPY spike below 140 should be watched as a global risk-off signal, not just an FX move.",
    newsQuery: "Bank of Japan rate hike yen JGB normalisation",
    impact: { fx: "USD/JPY carry", equities: "Banks, Nikkei" },
  },
  {
    id: "milei", type: "positive", category: "Reform", title: "Argentina reform program",
    location: "Buenos Aires", coords: [-58.4, -34.6], date: "2023–",
    summary:
      "Milei's shock-therapy programme — fiscal surplus, deregulation, gradual FX-control unwind — has delivered the steepest disinflation in Argentina's recent history and a 5-year sovereign-spread tightening of hundreds of bps. The Merval has rallied multi-X in USD terms and high-beta names (YPF, banks) have led. The risk is execution: any social-unrest spike, FX-control reversal, or IMF stand-off can trigger a fast unwind given how crowded the long-Argentina trade has become. Express it through ARGT or single-stock ADRs (YPF, GGAL, BMA), size for ARS vol, and treat IMF review dates as binary events.",
    newsQuery: "Argentina Milei economy peso Merval reform",
    impact: { equities: "Merval", fx: "ARS volatile" },
  },
  {
    id: "de-ind", type: "negative", category: "Economy", title: "German industrial stagnation",
    location: "Berlin", coords: [13.4, 52.5], date: "Structural",
    summary:
      "Germany's industrial model — cheap Russian gas, open Chinese end-markets, ICE auto exports — has been broken by three simultaneous shocks: energy repricing, Chinese EV competition, and a weak global manufacturing cycle. Chemie (BAS, Covestro), Autos (VOW, BMW, MBG) and Maschinenbau are in a multi-quarter earnings recession, and the IFO/ZEW reads keep confirming there's no V-shaped rebound. This caps the EUR on growth-differential grounds and keeps the DAX's gains concentrated in a few global champions (SAP, Siemens, RHM). Stay underweight EU autos/chemicals on rallies, watch for German fiscal-rule reform as the only real domestic catalyst, and use any China-stimulus headline as a tactical long.",
    newsQuery: "Germany economy industry recession DAX",
    impact: { equities: "Autos, Chemie", fx: "EUR drag" },
  },
  {
    id: "fr-pol", type: "watch", category: "Politics", title: "France fiscal & political risk",
    location: "Paris", coords: [2.35, 48.85], date: "Ongoing",
    summary:
      "France is running a ~5–6% of GDP deficit with no political majority to consolidate, and the OAT–Bund 10y spread has widened to levels not seen since the eurozone crisis. That's the market telling you France is being repriced from 'core' towards 'semi-periphery' — even small budget-vote failures or rating-agency downgrade headlines now move EUR and CAC40 banks (BNP, ACA, GLE) several percent. The contagion question is whether this stays France-specific or starts pulling Italian BTPs wider too. Trade it through BNP/SocGen as the cleanest single-name expression, watch OAT–Bund as the cleanest risk gauge, and keep an eye on ECB transmission-tool commentary.",
    newsQuery: "France OAT spread deficit politics budget",
    impact: { fx: "EUR", equities: "French banks" },
  },
  {
    id: "cn-prop", type: "negative", category: "Economy", title: "China property deleveraging",
    location: "Beijing", coords: [116.4, 39.9], date: "2021–",
    summary:
      "Chinese real estate was historically ~25% of GDP and is now in a multi-year deleveraging — Evergrande, Country Garden and Vanke have all defaulted or restructured, and new-home sales are running ~half of 2021 peak. That destroys household wealth (~70% of Chinese savings sit in property), caps consumption, and removes the marginal global buyer of iron ore, copper, steel and luxury goods. The PBoC keeps drip-feeding stimulus but has refused to do a US-style bazooka, so each rally in HSI/CSI300 has faded. Stay structurally cautious on iron ore (BHP, RIO, VALE), luxury (LVMH, HRMS), and German autos exposed to China; trade Chinese tech (BABA, TCEHY) tactically around stimulus headlines.",
    newsQuery: "China property real estate Evergrande PBoC stimulus",
    impact: { commodities: "Iron ore, copper", equities: "HSI" },
  },
  {
    id: "kr-chips", type: "positive", category: "Cycle", title: "Memory chip up-cycle",
    location: "Seoul", coords: [127, 37.5], date: "2024–",
    summary:
      "AI training and inference have created a structural shortage of HBM (high-bandwidth memory), where SK Hynix and Samsung are the only two suppliers at scale. DRAM and NAND pricing has turned, capex discipline post-2022 means supply can't flood, and the order books from NVDA are visible 12–18 months out. KOSPI memory names (000660, 005930) and Micron (MU) are the cleanest expressions, alongside equipment (ASML, AMAT, LRCX, KLAC). The cyclical risk is always the same — memory is the most cyclical sub-sector in tech — so size around inventory data and watch DRAM contract pricing as the real signal.",
    newsQuery: "memory chips HBM Samsung SK Hynix AI demand",
    impact: { equities: "KOSPI, semis" },
  },
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
