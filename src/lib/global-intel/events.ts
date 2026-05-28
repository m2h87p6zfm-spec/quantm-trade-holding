import type { GlobalEvent } from "./types";

export const EVENTS: GlobalEvent[] = [
  {
    id: "ukr-war", type: "negative", category: "Conflict", title: "Ukraine–Russia conflict",
    location: "Eastern Europe", coords: [31.2, 49], date: "Ongoing",
    summary:
      "Russia is still at war with Ukraine, and it isn't ending soon. Europe lost cheap Russian gas and now pays more for energy, while Western countries keep raising defence spending. Any disruption to Ukrainian grain exports also pushes food prices up.",
    newsQuery: "Ukraine Russia war markets energy defence",
    impact: { commodities: "Wheat, gas, oil premium", fx: "EUR risk premium", regions: "EU industry" },
  },
  {
    id: "mideast", type: "negative", category: "Conflict", title: "Middle East tensions",
    location: "Israel / Gaza", coords: [34.8, 31.5], date: "Ongoing",
    summary:
      "The Israel–Gaza war and tensions with Iran sit right next to the world's biggest oil region. Even without a real supply cut, traders add a 'fear premium' to oil, which feeds into inflation. When things escalate, money flows into safe havens like the US dollar and gold.",
    newsQuery: "Israel Gaza Middle East oil markets escalation",
    impact: { commodities: "Brent risk premium", fx: "Safe-haven flows" },
  },
  {
    id: "redsea", type: "negative", category: "Supply Chain", title: "Red Sea shipping disruption",
    location: "Bab el-Mandeb", coords: [43, 13], date: "Ongoing",
    summary:
      "Attacks in the Red Sea force ships to sail around Africa instead of using the Suez Canal. That adds about two weeks and 30% extra cost to Asia–Europe trips, lifting freight rates sharply. The longer it lasts, the more it pushes up prices for European retailers and carmakers.",
    newsQuery: "Red Sea Houthi shipping container freight rates",
    impact: { commodities: "Container rates +", equities: "Shipping, retailers" },
  },
  {
    id: "taiwan", type: "watch", category: "Geopolitics", title: "Taiwan Strait risk",
    location: "Taiwan", coords: [121, 23.7], date: "Watch",
    summary:
      "Taiwan makes about 90% of the world's most advanced chips through TSMC, so any conflict there would shock the entire tech industry. Even routine Chinese military pressure is enough to wobble chip and AI stocks. A real blockade would be a worst-case scenario for global markets.",
    newsQuery: "Taiwan China semiconductor TSMC tensions",
    impact: { equities: "Semis, AI supply chain" },
  },
  {
    id: "us-pol", type: "watch", category: "Politics", title: "US policy cycle",
    location: "Washington, DC", coords: [-77, 38.9], date: "2025–26",
    summary:
      "The US is juggling new tariffs, big tax decisions, and political pressure on the Federal Reserve all at once. Tariffs act like a tax on imports, lifting prices on goods and squeezing retailers and carmakers. The uncertainty is the main reason US bond yields and the dollar keep jumping around.",
    newsQuery: "US tariffs Federal Reserve fiscal policy markets",
    impact: { fx: "DXY", equities: "Sector rotation" },
  },
  {
    id: "ai-capex", type: "positive", category: "Capex", title: "AI capex super-cycle",
    location: "US West Coast", coords: [-122, 37.4], date: "2024–",
    summary:
      "Big tech companies like Microsoft, Meta, Google and Amazon are spending over $200 billion a year building AI data centres. That money flows straight into chips (Nvidia), memory, networking gear, power equipment, and even nuclear power. The main risk is that it's concentrated in a few buyers, so one of them cutting spend hits the whole chain.",
    newsQuery: "AI capex hyperscaler datacenter Nvidia spending",
    impact: { equities: "Semis, utilities, industrials" },
  },
  {
    id: "india-growth", type: "positive", category: "Growth", title: "India structural growth",
    location: "Mumbai", coords: [72.8, 19], date: "Ongoing",
    summary:
      "India is the fastest-growing big economy, around 6–7% per year, helped by companies moving production out of China and a huge young consumer base. Foreign and local investors keep buying Indian stocks, which has lifted the Nifty index. The downside is that valuations are already high, so any global shock hits harder.",
    newsQuery: "India economy stocks Nifty foreign inflows",
    impact: { equities: "Nifty/Sensex", fx: "INR" },
  },
  {
    id: "opec", type: "watch", category: "Commodities", title: "OPEC+ production policy",
    location: "Riyadh", coords: [46.7, 24.7], date: "Recurring",
    summary:
      "Saudi Arabia and Russia lead OPEC+ and are keeping millions of barrels per day off the market to support prices. That's why oil hasn't fallen further despite weak Chinese demand. Every OPEC+ meeting moves oil prices and oil-linked currencies like the Canadian dollar and Norwegian krone.",
    newsQuery: "OPEC oil production cuts Saudi Arabia Russia",
    impact: { commodities: "Brent crude", fx: "Petro-FX" },
  },
  {
    id: "boj-exit", type: "positive", category: "Policy", title: "BoJ policy normalisation",
    location: "Tokyo", coords: [139.7, 35.7], date: "2024–",
    summary:
      "After 20 years of near-zero rates, Japan is slowly raising them again. That matters globally because investors borrowed cheap yen to invest everywhere else — and now they may have to unwind those trades. A hawkish surprise from Japan can shake US tech and emerging-market currencies.",
    newsQuery: "Bank of Japan rate hike yen JGB normalisation",
    impact: { fx: "USD/JPY carry", equities: "Banks, Nikkei" },
  },
  {
    id: "milei", type: "positive", category: "Reform", title: "Argentina reform program",
    location: "Buenos Aires", coords: [-58.4, -34.6], date: "2023–",
    summary:
      "President Milei is running tough reforms — big spending cuts, deregulation, and slowly removing currency controls. Inflation is dropping fast and Argentine stocks have rallied sharply in dollar terms. The risk is that any social pushback or IMF dispute could quickly reverse the trade.",
    newsQuery: "Argentina Milei economy peso Merval reform",
    impact: { equities: "Merval", fx: "ARS volatile" },
  },
  {
    id: "de-ind", type: "negative", category: "Economy", title: "German industrial stagnation",
    location: "Berlin", coords: [13.4, 52.5], date: "Structural",
    summary:
      "Germany's industry was built on cheap Russian gas, strong Chinese demand, and combustion-engine cars — and all three are now broken. Chemicals, carmakers and machinery firms are stuck in a long earnings slump. This drags on the euro and keeps the DAX dependent on a few global winners like SAP and Siemens.",
    newsQuery: "Germany economy industry recession DAX",
    impact: { equities: "Autos, Chemie", fx: "EUR drag" },
  },
  {
    id: "fr-pol", type: "watch", category: "Politics", title: "France fiscal & political risk",
    location: "Paris", coords: [2.35, 48.85], date: "Ongoing",
    summary:
      "France is running a big budget deficit with no clear majority to fix it, so investors now demand higher yields on French bonds. The fear is that France slowly slides from 'safe core Europe' towards risky periphery. Each budget vote or rating downgrade headline can move the euro and French bank stocks.",
    newsQuery: "France OAT spread deficit politics budget",
    impact: { fx: "EUR", equities: "French banks" },
  },
  {
    id: "cn-prop", type: "negative", category: "Economy", title: "China property deleveraging",
    location: "Beijing", coords: [116.4, 39.9], date: "2021–",
    summary:
      "Chinese real estate used to be a quarter of the economy and is now shrinking, with giants like Evergrande and Country Garden in default. Since most Chinese household wealth sits in property, that hurts consumer spending and demand for iron ore, copper and luxury goods. Beijing keeps adding small stimulus but won't launch a giant rescue.",
    newsQuery: "China property real estate Evergrande PBoC stimulus",
    impact: { commodities: "Iron ore, copper", equities: "HSI" },
  },
  {
    id: "kr-chips", type: "positive", category: "Cycle", title: "Memory chip up-cycle",
    location: "Seoul", coords: [127, 37.5], date: "2024–",
    summary:
      "AI needs huge amounts of memory chips, and only SK Hynix and Samsung can make the most advanced type (HBM) at scale. Memory prices are rising again and order books are full for over a year. The catch: memory is the most cyclical part of tech, so swings can be sharp in both directions.",
    newsQuery: "memory chips HBM Samsung SK Hynix AI demand",
    impact: { equities: "KOSPI, semis" },
  },
];
