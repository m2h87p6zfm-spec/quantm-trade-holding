// English overrides for translatable string fields in COUNTRIES + GLOBAL_SUMMARY.
// Structural data (iso2, flag, risk enums, coords, newsKeywords) lives in
// global-intel-data.ts and is language-neutral.
//
// Countries not listed here fall back to the German source. Add more entries
// in future sprints to extend English coverage.

import type { CountryIntel } from "./global-intel-data";

export const GLOBAL_SUMMARY_HEADLINE_EN =
  "US resilience vs. global slowdown — USD stays firm, commodities mixed, EMs under pressure.";

type CountryOverride = Partial<Pick<
  CountryIntel,
  "summary" | "pivotalEvent" | "geopolitics" | "impact" | "positives" | "negatives"
>>;

export const COUNTRY_EN_OVERRIDES: Record<string, CountryOverride> = {
  "United States of America": {
    summary: "US strength is lifting the dollar and pressuring global equities and emerging markets.",
    pivotalEvent: {
      title: "Fed rate cycle 2022–2024",
      year: "2022",
      why: "The most aggressive tightening since 1980 — still defines global liquidity, USD strength and EM capital flows.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "Medium",
      tensions: "China tech restrictions, Middle East engagement, domestic polarisation ahead of elections.",
      policyDirection: "Mixed",
    },
    impact: {
      equities: "S&P 500 near all-time highs — Big Tech & AI lead, small caps lagging.",
      forex: "DXY firm → EUR, JPY and EM currencies under pressure.",
      commodities: "Higher real rates weigh on gold; oil tracks US growth.",
      sentiment: "Global risk anchor: when the US falls, everything falls.",
    },
    positives: ["Robust labour market", "AI capex cycle", "Energy independence", "Deep capital markets"],
    negatives: ["High government debt", "Political polarisation", "Commercial real estate stress"],
  },
  China: {
    summary: "Weak domestic demand and property deleveraging weigh on global growth and commodity demand.",
    pivotalEvent: {
      title: "Evergrande collapse & property crisis",
      year: "2021",
      why: "Structural deleveraging in real estate (25% of GDP) blocks consumption and weighs on industrial metals globally.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "High",
      tensions: "Taiwan question, US chip sanctions, South China Sea.",
      policyDirection: "Restrictive",
    },
    impact: {
      equities: "Hang Seng & CSI 300 underperforming — capital outflows persist.",
      forex: "CNY weakness → Asian currencies under pressure.",
      commodities: "Copper, iron ore, steel: demand weak. LNG imports rising.",
      sentiment: "Deflation export risk for global margins.",
    },
    positives: ["EV & solar dominance", "AI research depth", "High savings rate"],
    negatives: ["Property debt", "Demographics", "Geopolitical isolation", "Deflation"],
  },
  Germany: {
    summary: "Industrial weakness and energy costs keep the eurozone's growth engine stuck in stagnation.",
    pivotalEvent: {
      title: "Energy shock after Russia sanctions",
      year: "2022",
      why: "Loss of cheap pipeline gas — structural drag on chemicals, autos and machinery.",
    },
    geopolitics: {
      governmentStability: "Moderate",
      politicalRisk: "Medium",
      tensions: "Political fragmentation, rise of AfD, NATO spending debate.",
      policyDirection: "Mixed",
    },
    impact: {
      equities: "DAX carried by US-facing exporters (SAP, Siemens) — autos & chemicals weak.",
      forex: "EUR/USD under pressure from ECB easing.",
      commodities: "High dependence on imported natural gas (LNG).",
      sentiment: "Barometer for European industry.",
    },
    positives: ["Export-strong Mittelstand", "Low public debt", "Stable institutions"],
    negatives: ["Energy costs", "China exposure", "Demographics", "Bureaucracy"],
  },
  Japan: {
    summary: "End of yield curve control and a weak yen drive a Nikkei rally — global carry-trade anchor.",
    pivotalEvent: {
      title: "BoJ exit from negative rates",
      year: "2024",
      why: "First hike since 2007 — ends 30 years of deflationary policy and reshapes global carry trades.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "Low",
      tensions: "China frictions, North Korea, deeper US alliance.",
      policyDirection: "Pro-growth",
    },
    impact: {
      equities: "Nikkei 225 near all-time highs — exporters benefit from a weak yen.",
      forex: "USD/JPY volatility → global carry-trade pain point.",
      commodities: "Pure importer — oil & LNG sensitive.",
      sentiment: "Global risk gauge: yen strength = risk-off.",
    },
    positives: ["Corporate governance reform", "Semiconductor renaissance", "Political stability"],
    negatives: ["World's highest public debt", "Demographics", "Energy import dependence"],
  },
  "United Kingdom": {
    summary: "Sticky inflation and weak growth keep the BoE on hold — GBP remains sensitive.",
    pivotalEvent: {
      title: "Brexit implementation",
      year: "2020",
      why: "Structural trade friction with the EU — lower trend growth, weaker GBP.",
    },
    geopolitics: {
      governmentStability: "Moderate",
      politicalRisk: "Medium",
      tensions: "EU relations, Northern Ireland, migration.",
      policyDirection: "Mixed",
    },
    impact: {
      equities: "FTSE 100 carried by energy & pharma — domestic plays weak.",
      forex: "GBP/USD reacts sharply to BoE expectations.",
      commodities: "Oil-major heavy index (Shell, BP).",
      sentiment: "Bridge market between US and EU.",
    },
    positives: ["Financial sector", "English language", "Legal system"],
    negatives: ["Sticky services inflation", "Brexit friction", "Low productivity"],
  },
  France: {
    summary: "High debt and political fragmentation widen the OAT-Bund spread — a drag on the euro.",
    pivotalEvent: {
      title: "Snap parliamentary elections",
      year: "2024",
      why: "Political stalemate complicates fiscal consolidation — markets demand a higher risk premium.",
    },
    geopolitics: {
      governmentStability: "Weak",
      politicalRisk: "High",
      tensions: "Domestic fragmentation, EU leadership role, Africa engagement.",
      policyDirection: "Unstable",
    },
    impact: {
      equities: "CAC 40 lives off luxury (LVMH) & pharma — banks under spread pressure.",
      forex: "OAT-spread widening weighs on EUR.",
      commodities: "Nuclear power exports → energy resilience.",
      sentiment: "Peripheral eurozone risks coming back.",
    },
    positives: ["Nuclear power", "Luxury industry", "Better demographics than Germany"],
    negatives: ["Public debt > 110% of GDP", "Political stalemate", "Social spending"],
  },
  India: {
    summary: "Fastest-growing major economy — structural equity rally, but rich valuations.",
    pivotalEvent: {
      title: "Digital infrastructure push (UPI, Aadhaar)",
      year: "2016",
      why: "Formalised the economy, broadened the tax base, drove the rise of digital consumers.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "Low",
      tensions: "China border, Pakistan, balancing US and Russia.",
      policyDirection: "Pro-growth",
    },
    impact: {
      equities: "Nifty 50 & Sensex at all-time highs — high P/E multiples.",
      forex: "INR stabilised by RBI interventions.",
      commodities: "Large oil & gold importer.",
      sentiment: "EM premium market — magnet for global flows.",
    },
    positives: ["Demographics", "Tech talent", "Domestic consumption", "China+1 strategy"],
    negatives: ["Valuations", "Infrastructure gaps", "Subsidy burden"],
  },
  Russia: {
    summary: "Sanctioned and isolated — energy exports and defence spending dominate the economy.",
    pivotalEvent: {
      title: "Ukraine war & sanctions",
      year: "2022",
      why: "Reshaped European energy, split global markets, created a new sanctions architecture.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "High",
      tensions: "Ukraine war, NATO, growing alignment with China.",
      policyDirection: "Restrictive",
    },
    impact: {
      equities: "MOEX cut off from the West — barely relevant globally.",
      forex: "RUB volatile, capital controls in place.",
      commodities: "Oil shadow fleet, gas re-routing to Asia, wheat exporter.",
      sentiment: "Geopolitical tail risk for energy prices.",
    },
    positives: ["Commodity reserves", "Low external debt"],
    negatives: ["Sanctions", "Brain drain", "War spending", "Demographics"],
  },
  Brazil: {
    summary: "High real rates attract carry flows — fiscal worries cap the upside.",
    pivotalEvent: {
      title: "Selic high-rate phase 2021–2024",
      year: "2021",
      why: "First major central bank to hike post-pandemic — template for EM policy and high real yields.",
    },
    geopolitics: {
      governmentStability: "Moderate",
      politicalRisk: "Medium",
      tensions: "Domestic polarisation, BRICS role, Amazon.",
      policyDirection: "Mixed",
    },
    impact: {
      equities: "Bovespa commodity-heavy — Vale and Petrobras dominate.",
      forex: "BRL carry-trade favourite, but fiscally sensitive.",
      commodities: "Iron ore, soy, sugar, oil — global top supplier.",
      sentiment: "LatAm sentiment barometer.",
    },
    positives: ["Commodities", "High real rates", "Young demographics"],
    negatives: ["Fiscal deficit", "Policy uncertainty", "Amazon risk"],
  },
  Canada: {
    summary: "US business-cycle proxy with commodity leverage — housing & consumer debt remain the weak spot.",
    pivotalEvent: {
      title: "Housing price boom 2020–2022",
      year: "2020",
      why: "Highest private debt in the G7 — consumers very sensitive to BoC rates.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "Low",
      tensions: "US trade dependence, China frictions.",
      policyDirection: "Pro-growth",
    },
    impact: {
      equities: "TSX = banks + energy + materials.",
      forex: "CAD tightly correlated with oil and US data.",
      commodities: "Oil exporter (WCS), uranium, potash.",
      sentiment: "Leading indicator for US consumption.",
    },
    positives: ["Commodities", "Political stability", "Immigration"],
    negatives: ["Housing bubble", "High consumer debt", "US dependence"],
  },
  "Saudi Arabia": {
    summary: "OPEC+ anchor — production decisions set the global oil price floor.",
    pivotalEvent: {
      title: "Vision 2030 & OPEC+ alliance",
      year: "2016",
      why: "Diversification away from oil + coordinated production cuts → new global energy equilibrium price.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "Medium",
      tensions: "Iran, Yemen, Israel normalisation.",
      policyDirection: "Pro-growth",
    },
    impact: {
      equities: "Tadawul dominated by Aramco.",
      forex: "SAR pegged to USD.",
      commodities: "Key swing producer for Brent.",
      sentiment: "Energy risk premium.",
    },
    positives: ["Low production costs", "Sovereign wealth (PIF)", "Pace of reforms"],
    negatives: ["Oil dependence", "Regional conflicts", "Demographic pressure"],
  },
  "South Korea": {
    summary: "Semiconductor cycle proxy — KOSPI hinges on memory prices and AI capex.",
    pivotalEvent: {
      title: "Global memory chip cycle",
      year: "2023",
      why: "Samsung and SK Hynix sit at the heart of the AI supply chain — the 2023 inventory correction is now turning into an upswing.",
    },
    geopolitics: {
      governmentStability: "Moderate",
      politicalRisk: "Medium",
      tensions: "North Korea, Japan relations, US-China balance.",
      policyDirection: "Pro-growth",
    },
    impact: {
      equities: "KOSPI = tech beta on the global AI story.",
      forex: "KRW sensitive to risk-off and semi cycles.",
      commodities: "Large LNG & oil importer.",
      sentiment: "Leading indicator for global tech demand.",
    },
    positives: ["Semiconductor leadership", "Industrial depth", "High FX reserves"],
    negatives: ["China exposure", "Demographics", "High household debt"],
  },
  Mexico: {
    summary: "Nearshoring beneficiary — Banxico keeps high real rates, MXN remains an EM carry favourite.",
    pivotalEvent: {
      title: "USMCA + nearshoring wave",
      year: "2020",
      why: "China diversification redirects FDI to Mexico — structural industrial expansion.",
    },
    geopolitics: {
      governmentStability: "Moderate",
      politicalRisk: "Medium",
      tensions: "US migration & tariff risk, drug cartels.",
      policyDirection: "Mixed",
    },
    impact: {
      equities: "Mexbol = consumer, banks, industry.",
      forex: "MXN carry-trade favourite among EMs.",
      commodities: "Oil exporter (Pemex), top silver producer.",
      sentiment: "Nearshoring proxy.",
    },
    positives: ["Nearshoring FDI", "USMCA access", "High real rates"],
    negatives: ["Security situation", "Pemex debt", "Political reforms"],
  },
  Australia: {
    summary: "China commodity proxy — iron ore and LNG drive the trade balance and AUD.",
    pivotalEvent: {
      title: "China commodity boom & cooldown",
      year: "2010",
      why: "A decade-long boom funded growth; the current China slowdown now weighs on iron ore prices.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "Low",
      tensions: "China trade, AUKUS, Pacific strategy.",
      policyDirection: "Pro-growth",
    },
    impact: {
      equities: "ASX 200 = banks + miners (BHP, Rio).",
      forex: "AUD = liquid China proxy.",
      commodities: "Iron ore, LNG, coal, top lithium supplier.",
      sentiment: "Asia-Pacific risk barometer.",
    },
    positives: ["Commodity reserves", "Political stability", "Migration"],
    negatives: ["House prices", "China dependence", "Consumer stress"],
  },
  "Türkiye": {
    summary: "End of heterodox policy — extreme rates aim to stabilise the lira, inflation remains sticky.",
    pivotalEvent: {
      title: "Central bank U-turn 2023",
      year: "2023",
      why: "Switch to orthodox policy (50% policy rate) — an attempt to end years of lira crisis.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "High",
      tensions: "NATO role, Syria, Eastern Mediterranean energy.",
      policyDirection: "Mixed",
    },
    impact: {
      equities: "BIST 100 inflation-driven — real returns weak.",
      forex: "TRY volatility remains extreme.",
      commodities: "Major energy importer.",
      sentiment: "EM tail-risk indicator.",
    },
    positives: ["Geographic location", "Young demographics", "Industrial base"],
    negatives: ["Inflation", "Low FX reserves", "Policy risk"],
  },
  Israel: {
    summary: "Regional escalation risks keep an oil risk premium in place — the tech sector shows resilience.",
    pivotalEvent: {
      title: "Middle East escalation since Oct 2023",
      year: "2023",
      why: "Armed conflict with Hamas/Hezbollah, confrontation with Iran → energy risk premium.",
    },
    geopolitics: {
      governmentStability: "Moderate",
      politicalRisk: "High",
      tensions: "Iran, Hezbollah, Gaza, regional axes.",
      policyDirection: "Mixed",
    },
    impact: {
      equities: "TA-35 resilient — tech (NVDA suppliers) is the engine.",
      forex: "ILS volatile around conflict headlines.",
      commodities: "Brent risk premium rises on escalation.",
      sentiment: "Global risk-off trigger if it escalates.",
    },
    positives: ["High-tech ecosystem", "Strong FX reserves", "Innovation capacity"],
    negatives: ["War costs", "Political polarisation", "Brain-drain risk"],
  },
  Iran: {
    summary: "Sanctions plus nuclear tensions → a permanent geopolitical oil risk premium.",
    pivotalEvent: {
      title: "JCPOA collapse & sanctions regime",
      year: "2018",
      why: "Withdrawal from the nuclear deal → oil sanctions, shadow tanker fleet, proxy conflicts.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "High",
      tensions: "Israel, US, nuclear programme, regional axes.",
      policyDirection: "Restrictive",
    },
    impact: {
      equities: "Local market — globally irrelevant.",
      forex: "Rial in hyperinflation.",
      commodities: "Shadow oil exports to China; Hormuz tail risk.",
      sentiment: "Geopolitical tail event.",
    },
    positives: ["Oil reserves", "Young demographics"],
    negatives: ["Sanctions", "Inflation", "Isolation", "Regime risk"],
  },
  Ukraine: {
    summary: "Active war — wheat, sunflower, fertiliser exports and European security dominate the picture.",
    pivotalEvent: {
      title: "Russian invasion",
      year: "2022",
      why: "Largest ground conflict in Europe since 1945 — redefined energy, food, and NATO architecture.",
    },
    geopolitics: {
      governmentStability: "Moderate",
      politicalRisk: "High",
      tensions: "War with Russia, dependence on Western aid.",
      policyDirection: "Unstable",
    },
    impact: {
      equities: "Local market frozen.",
      forex: "UAH supported by foreign aid.",
      commodities: "Wheat, corn, sunflower oil, fertiliser — global top supplier.",
      sentiment: "European tail risk.",
    },
    positives: ["Western support", "Agricultural potential"],
    negatives: ["War", "Infrastructure destruction", "Demographics"],
  },
  Switzerland: {
    summary: "Safe haven — CHF benefits from global risk aversion, SNB easing in its favour.",
    pivotalEvent: {
      title: "Credit Suisse rescue by UBS",
      year: "2023",
      why: "Consolidation of the Swiss banking system — one global mega-bank, with reputational questions.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "Low",
      tensions: "EU relations, neutrality debate, sanctions.",
      policyDirection: "Pro-growth",
    },
    impact: {
      equities: "SMI = Nestlé, Roche, Novartis — defensive.",
      forex: "CHF classic safe haven.",
      commodities: "Gold trading hub.",
      sentiment: "Risk-off beneficiary.",
    },
    positives: ["Political stability", "Strong currency", "Innovation"],
    negatives: ["Franc strength = export pressure", "Bank concentration"],
  },
  Netherlands: {
    summary: "ASML's EUV lithography monopoly makes the Netherlands a critical node in the AI supply chain.",
    pivotalEvent: {
      title: "EUV export controls on China",
      year: "2023",
      why: "US pressure on the Netherlands → ASML restrictions → a new chip geopolitics.",
    },
    geopolitics: {
      governmentStability: "Moderate",
      politicalRisk: "Low",
      tensions: "EU politics, US-China pressure on ASML.",
      policyDirection: "Mixed",
    },
    impact: {
      equities: "AEX dominated by ASML.",
      forex: "Part of the EUR bloc.",
      commodities: "Rotterdam = Europe's energy hub (LNG, oil).",
      sentiment: "Semiconductor supply-chain anchor.",
    },
    positives: ["ASML monopoly", "Logistics hub", "Pro-business"],
    negatives: ["Political fragmentation", "China exposure"],
  },
  "South Africa": {
    summary: "Top precious-metals producer — platinum, palladium, gold; the power crisis caps growth.",
    pivotalEvent: {
      title: "Escalating load-shedding crisis",
      year: "2022",
      why: "Power shortages block mining and industry — a structural drag on growth.",
    },
    geopolitics: {
      governmentStability: "Moderate",
      politicalRisk: "Medium",
      tensions: "BRICS role, closeness to Russia and China.",
      policyDirection: "Mixed",
    },
    impact: {
      equities: "JSE Top 40 = miners + Naspers (Tencent).",
      forex: "ZAR volatile, high carry component.",
      commodities: "Platinum, palladium, gold, coal, chrome.",
      sentiment: "Frontier EM sentiment barometer.",
    },
    positives: ["Commodities", "Developed financial markets"],
    negatives: ["Power crisis", "Unemployment", "Political tensions"],
  },
  "United Arab Emirates": {
    summary: "Stable energy exporter + global finance/crypto hub — most advanced diversification in the region.",
    pivotalEvent: {
      title: "ADQ/Mubadala sovereign strategy",
      year: "2017",
      why: "Aggressive diversification into tech, AI, sport, crypto — a new global capital power.",
    },
    geopolitics: {
      governmentStability: "Strong",
      politicalRisk: "Low",
      tensions: "Iran tensions, Yemen engagement.",
      policyDirection: "Pro-growth",
    },
    impact: {
      equities: "DFM/ADX growing (Aramco-style IPOs).",
      forex: "AED pegged to USD.",
      commodities: "Oil + aluminium + LNG.",
      sentiment: "MENA risk anchor.",
    },
    positives: ["Diversification", "Sovereign funds", "Political stability"],
    negatives: ["Regional risks", "Oil dependence (declining)"],
  },
  Argentina: {
    summary: "Milei shock reforms — extreme volatility, but disinflation and market optimism.",
    pivotalEvent: {
      title: "Milei reform program",
      year: "2023",
      why: "Radical liberalisation, dollarisation debate, subsidy cuts — a historic policy shift.",
    },
    geopolitics: {
      governmentStability: "Moderate",
      politicalRisk: "High",
      tensions: "IMF negotiations, China relations.",
      policyDirection: "Pro-growth",
    },
    impact: {
      equities: "Merval rally in USD terms.",
      forex: "ARS volatility extreme.",
      commodities: "Soy, corn, beef, lithium (Triangle).",
      sentiment: "EM reform story.",
    },
    positives: ["Reform momentum", "Lithium reserves", "Agriculture"],
    negatives: ["Inflation legacy", "Low FX reserves", "Social pressure"],
  },
  Italy: {
    summary: "High public debt + BTP spread remain the eurozone's risk barometer.",
    pivotalEvent: { title: "PNRR / EU recovery fund", year: "2021", why: "Largest recipient — investments support growth, but pace of reform is decisive." },
    geopolitics: { governmentStability: "Moderate", politicalRisk: "Medium", tensions: "EU fiscal rules, migration.", policyDirection: "Mixed" },
    impact: { equities: "FTSE MIB heavily driven by banks (UniCredit, Intesa).", forex: "BTP spread → EUR sentiment.", commodities: "LNG importer.", sentiment: "Peripheral eurozone indicator." },
    positives: ["Strong export industry", "Tourism", "EU funds"], negatives: ["Public debt > 135% of GDP", "Demographics", "Low productivity"],
  },
  Spain: {
    summary: "Eurozone outperformer — tourism & services drive growth.",
    pivotalEvent: { title: "Post-Covid tourism recovery", year: "2022", why: "Record tourist numbers support consumption & employment; IBEX surprises positively." },
    geopolitics: { governmentStability: "Moderate", politicalRisk: "Medium", tensions: "Catalonia question, EU politics.", policyDirection: "Mixed" },
    impact: { equities: "IBEX 35 dominated by banks & telecoms.", forex: "EUR anchor.", commodities: "Solar energy pioneer.", sentiment: "Southern Europe bellwether." },
    positives: ["Tourism", "Renewables", "Population inflows"], negatives: ["Youth unemployment", "Political fragmentation"],
  },
  Turkey: {
    summary: "Orthodox monetary turn — high rates, lira stabilised, inflation still high.",
    pivotalEvent: { title: "Rate turnaround under Şimşek", year: "2023", why: "Return to conventional monetary policy after years of the Erdogan doctrine." },
    geopolitics: { governmentStability: "Moderate", politicalRisk: "High", tensions: "NATO role, Syria, Russia balance.", policyDirection: "Mixed" },
    impact: { equities: "BIST 100 volatile in USD terms.", forex: "TRY carry-trade revival.", commodities: "Major energy importer.", sentiment: "EM reform story with question marks." },
    positives: ["Rate turnaround", "Young demographics", "Strategic location"], negatives: ["Inflation legacy", "FX reserves", "Political risks"],
  },
  Indonesia: {
    summary: "Nickel superpower — the battery supply chain makes IDX an EM growth star.",
    pivotalEvent: { title: "Nickel export ban & downstream strategy", year: "2020", why: "Forces processing in-country — Indonesia becomes an EV battery hub." },
    geopolitics: { governmentStability: "Moderate", politicalRisk: "Medium", tensions: "South China Sea.", policyDirection: "Pro-growth" },
    impact: { equities: "IDX = banks + commodities.", forex: "IDR defended by Bank Indonesia.", commodities: "Nickel, coal, palm oil.", sentiment: "ASEAN growth anchor." },
    positives: ["Demographics", "Nickel reserves", "Domestic consumption"], negatives: ["Infrastructure", "Corruption", "Commodity dependence"],
  },
  Vietnam: {
    summary: "China+1 beneficiary — FDI magnet for electronics & textiles.",
    pivotalEvent: { title: "Apple supply-chain shift", year: "2020", why: "Tim Cook makes Vietnam the second manufacturing pole." },
    geopolitics: { governmentStability: "Strong", politicalRisk: "Low", tensions: "South China Sea.", policyDirection: "Pro-growth" },
    impact: { equities: "VN-Index driven by banks & real estate.", forex: "VND tightly managed against USD.", commodities: "Coffee, rice.", sentiment: "Frontier-market success story." },
    positives: ["FDI wave", "Demographics", "Export strength"], negatives: ["Construction-boom risks", "Bank NPLs"],
  },
  Poland: {
    summary: "EU nearshoring beneficiary — defence spending & EU funds drive growth.",
    pivotalEvent: { title: "EU funds released after Tusk election", year: "2023", why: "€60bn inflows — investment boost and reform momentum." },
    geopolitics: { governmentStability: "Strong", politicalRisk: "Low", tensions: "Russia/Belarus border.", policyDirection: "Pro-growth" },
    impact: { equities: "WIG20 dominated by banks & energy.", forex: "PLN supported by NBP.", commodities: "Coal phase-out underway.", sentiment: "CEE anchor." },
    positives: ["EU funds", "Defence boom", "Stable demographics"], negatives: ["Coal-heavy energy mix", "Political polarisation"],
  },
  Sweden: {
    summary: "Highly cyclical industry + property stress — the Riksbank moves into easing mode.",
    pivotalEvent: { title: "NATO accession", year: "2024", why: "End of 200 years of neutrality — strategic realignment." },
    geopolitics: { governmentStability: "Strong", politicalRisk: "Low", tensions: "Russia (Baltic Sea).", policyDirection: "Pro-growth" },
    impact: { equities: "OMXS30 = industry + banks.", forex: "SEK cyclical.", commodities: "Iron ore, timber.", sentiment: "Northern Europe bellwether." },
    positives: ["Innovation capacity", "Commodities", "NATO"], negatives: ["Property stress", "High consumer debt"],
  },
  Norway: {
    summary: "Oil & gas + the NBIM sovereign wealth fund — global marginal buyer of equities.",
    pivotalEvent: { title: "Gas substitution for Russia in Europe", year: "2022", why: "Norway becomes the EU's biggest gas supplier." },
    geopolitics: { governmentStability: "Strong", politicalRisk: "Low", tensions: "NATO northern flank.", policyDirection: "Pro-growth" },
    impact: { equities: "OBX = Equinor, DNB.", forex: "NOK oil-correlated.", commodities: "Natural gas, Brent, salmon.", sentiment: "Global capital allocator via NBIM." },
    positives: ["$1.7T sovereign fund", "Energy", "Stability"], negatives: ["NOK volatility", "Climate transition"],
  },
  Chile: {
    summary: "Copper superpower + lithium reserves — pivotal role in the global energy transition.",
    pivotalEvent: { title: "National lithium strategy", year: "2023", why: "State control of lithium production." },
    geopolitics: { governmentStability: "Moderate", politicalRisk: "Medium", tensions: "Constitutional debates.", policyDirection: "Mixed" },
    impact: { equities: "IPSA shaped by Codelco-linked stakes & banks.", forex: "CLP copper-sensitive.", commodities: "Copper (28% of world), lithium.", sentiment: "LatAm investment-grade anchor." },
    positives: ["Commodity reserves", "Institutions", "Pension system"], negatives: ["Copper cycle", "Political volatility"],
  },
  Taiwan: {
    summary: "TSMC = global chip lifeline — the world's most geopolitically pivotal country.",
    pivotalEvent: { title: "Lai election & China tensions", year: "2024", why: "DPP win deepens tensions — Taiwan risk premium rises." },
    geopolitics: { governmentStability: "Strong", politicalRisk: "Medium", tensions: "China reunification doctrine.", policyDirection: "Pro-growth" },
    impact: { equities: "TAIEX dominated by TSMC, MediaTek.", forex: "TWD chip-cycle sensitive.", commodities: "Energy importer.", sentiment: "Global AI/tech tail risk." },
    positives: ["Chip monopoly", "Democracy", "High FX reserves"], negatives: ["Geopolitical tail risk", "China export dependence"],
  },
  Singapore: {
    summary: "Asia's finance & wealth hub — MAS uses FX rather than rates as its policy tool.",
    pivotalEvent: { title: "China-Hong Kong wealth flight", year: "2022", why: "Singapore becomes the primary recipient of Asian HNW flows." },
    geopolitics: { governmentStability: "Strong", politicalRisk: "Low", tensions: "US-China balance.", policyDirection: "Pro-growth" },
    impact: { equities: "STI dominated by DBS, OCBC, UOB.", forex: "SGD steered via the MAS band.", commodities: "Oil refining hub.", sentiment: "ASEAN stability anchor." },
    positives: ["Institutions", "Financial hub", "Political stability"], negatives: ["Demographics", "Exposure to external shocks"],
  },
};
