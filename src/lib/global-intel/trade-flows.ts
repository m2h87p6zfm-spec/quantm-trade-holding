import type { TradeFlow } from "./types";

export const TRADE_FLOWS: TradeFlow[] = [
  { id: "us-cn-pacific", kind: "trade", label: "Trans-Pacific trade", from: [-118.2, 33.7], to: [121.5, 31.2], status: "tense", note: "Tariff & tech-export controls weigh on flows." },
  { id: "hormuz-asia", kind: "energy", label: "Gulf → Asia crude", from: [56.3, 26.6], to: [103.8, 1.3], status: "tense", note: "Strait of Hormuz risk premium on Brent." },
  { id: "redsea-suez", kind: "supply", label: "Red Sea / Suez", from: [43.3, 12.6], to: [32.5, 30.0], status: "disrupted", note: "Container traffic rerouted around the Cape." },
  { id: "cape-reroute", kind: "supply", label: "Cape of Good Hope reroute", from: [43.3, 12.6], to: [18.4, -33.9], status: "disrupted", note: "Asia–Europe containers detour adds 10–14 days." },
  { id: "ru-eu-gas", kind: "energy", label: "RU → EU gas (legacy)", from: [37.6, 55.7], to: [13.4, 52.5], status: "disrupted", note: "Pipeline flows collapsed; EU depends on LNG." },
  { id: "us-eu-lng", kind: "energy", label: "US Gulf → EU LNG", from: [-94.8, 29.7], to: [-9.1, 38.7], status: "stable", note: "Backbone of Europe's post-Russia gas supply." },
  { id: "qatar-eu-lng", kind: "energy", label: "Qatar → EU LNG", from: [51.5, 25.3], to: [12.5, 41.9], status: "tense", note: "Long-haul LNG; Red Sea risk reroutes cargoes." },
  { id: "ru-asia-oil", kind: "energy", label: "RU → India/China crude", from: [49.1, 55.8], to: [78.0, 22.0], status: "stable", note: "Shadow-fleet routing supports discounted Urals." },
  { id: "sa-eu", kind: "energy", label: "Saudi → Europe crude", from: [46.7, 24.6], to: [2.3, 46.6], status: "stable", note: "Replacing Russian barrels into the EU." },
  { id: "us-mx-near", kind: "trade", label: "Mexico → US nearshoring", from: [-99.1, 19.4], to: [-97.0, 38.0], status: "stable", note: "USMCA-driven FDI from China to Mexico." },
  { id: "br-cn-soy", kind: "commodity", label: "Brazil → China soy/iron", from: [-43.2, -22.9], to: [121.5, 31.2], status: "stable", note: "Backbone of Chinese food & steel input demand." },
  { id: "au-cn-iron", kind: "commodity", label: "Australia → China iron ore", from: [115.9, -31.9], to: [121.5, 31.2], status: "stable", note: "Largest single bulk-trade lane globally." },
  { id: "asia-us-chips", kind: "supply", label: "TW/KR → US semiconductors", from: [121.5, 25.0], to: [-122.4, 37.4], status: "stable", note: "Critical AI/tech supply chain." },
  { id: "cl-cn-copper", kind: "commodity", label: "Chile → China copper", from: [-70.6, -33.4], to: [121.5, 31.2], status: "stable", note: "Electrification & EV demand keep copper bid." },
  { id: "panama", kind: "trade", label: "Panama Canal lane", from: [-79.5, 8.9], to: [-122.4, 37.4], status: "tense", note: "Drought-driven transit limits crimp throughput." },
  { id: "bosphorus-grain", kind: "commodity", label: "Black Sea grain corridor", from: [31.3, 46.5], to: [29.0, 41.0], status: "tense", note: "Wheat & corn flows hostage to conflict risk." },
  { id: "africa-cn-minerals", kind: "supply", label: "DRC → China cobalt/Li", from: [27.5, -11.7], to: [121.5, 31.2], status: "stable", note: "EV battery supply chain backbone." },
  { id: "au-jp-lng", kind: "energy", label: "Australia → Japan LNG", from: [115.9, -20.3], to: [139.7, 35.7], status: "stable", note: "Largest single-source LNG flow to Asia." },
  { id: "no-eu-gas", kind: "energy", label: "Norway → EU gas", from: [5.3, 60.4], to: [6.8, 51.2], status: "stable", note: "Largest pipeline supplier to Europe today." },
  { id: "ca-us-oil", kind: "energy", label: "Canada → US crude", from: [-114.0, 51.0], to: [-95.4, 29.7], status: "stable", note: "Heavy crude into Gulf Coast refineries." },
];
