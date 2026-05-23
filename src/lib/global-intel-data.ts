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
  low: "#16a34a",
  medium: "#eab308",
  high: "#dc2626",
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Stable",
  medium: "Neutral",
  high: "High Risk",
};
