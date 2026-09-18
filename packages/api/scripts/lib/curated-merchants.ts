import type { CuratedEntry } from "./types";

const ENERGY_SUPPLIERS: CuratedEntry[] = [
  { category: "energy", name: "EDF" },
  { category: "energy", name: "Engie" },
  { category: "energy", name: "TotalEnergies" },
  { category: "energy", name: "Enercoop" },
];

const WATER_UTILITIES: CuratedEntry[] = [
  { category: "water", name: "Veolia" },
  { category: "water", name: "Suez" },
  { category: "water", name: "Saur" },
];

const TELECOM_AND_INTERNET_PROVIDERS: CuratedEntry[] = [
  { category: "telecom", name: "Orange" },
  { category: "telecom", name: "SFR" },
  { category: "telecom", name: "Free" },
  { category: "telecom", name: "Bouygues Telecom" },
  { category: "telecom", name: "Sosh" },
  { category: "telecom", name: "Red by SFR" },
];

const TRANSPORT_BRANDS: CuratedEntry[] = [
  { category: "public-transport", name: "SNCF" },
  { category: "public-transport", name: "Trainline" },
  { category: "public-transport", name: "RATP" },
  { category: "public-transport", name: "Île-de-France Mobilités" },
  { category: "public-transport", name: "BlaBlaCar" },
  { category: "taxi", name: "Uber" },
  { category: "takeaway", name: "Uber Eats" },
  { category: "taxi", name: "Bolt" },
];

const MULTI_LINE_INSURERS: CuratedEntry[] = [
  { category: "other-insurance", name: "AXA" },
  { category: "other-insurance", name: "MAIF" },
  { category: "other-insurance", name: "MACIF" },
  { category: "other-insurance", name: "MAAF" },
  { category: "other-insurance", name: "Matmut" },
  { category: "other-insurance", name: "Groupama" },
  { category: "other-insurance", name: "Allianz" },
];

const HEALTH_INSURERS: CuratedEntry[] = [
  { category: "health-insurance", name: "April" },
];

const STREAMING_SERVICES: CuratedEntry[] = [
  { category: "streaming", name: "Netflix" },
  { category: "streaming", name: "Spotify" },
  { category: "streaming", name: "Disney+" },
  { category: "streaming", name: "Canal+" },
  { category: "streaming", name: "Deezer" },
  { category: "streaming", name: "Amazon Prime" },
  { category: "streaming", name: "YouTube Premium" },
];

const APP_AND_CLOUD_STOREFRONTS: CuratedEntry[] = [
  { category: "software", name: "Apple" },
  { category: "software", name: "Google" },
  { category: "software", name: "Microsoft" },
  { category: "software", name: "Adobe" },
  { category: "software", name: "OVH" },
  { category: "software", name: "Scaleway" },
];

const HEALTH_SERVICES: CuratedEntry[] = [
  { category: "medical", name: "Doctolib" },
  { category: "medical", name: "Ameli" },
];

const ECOMMERCE_MISSING_FROM_NSI: CuratedEntry[] = [
  { category: "other-shopping", name: "Cdiscount" },
  { category: "clothing", name: "Vinted" },
  { category: "other-shopping", name: "Leboncoin" },
  { category: "electronics", name: "Back Market" },
  { category: "home-maintenance", name: "ManoMano" },
  { category: "other-shopping", name: "Veepee" },
];

const SUPERMARKETS_WITH_COUNTRY_QUALIFIED_NSI_NAMES: CuratedEntry[] = [
  { category: "groceries", name: "Monoprix" },
  { category: "groceries", name: "Carrefour" },
];

const FUEL_BRANDS_NSI_TAGS_AS_CONVENIENCE_STORES: CuratedEntry[] = [
  { category: "fuel", name: "Esso" },
  { category: "fuel", name: "Shell" },
];

export const CURATED_MERCHANTS: CuratedEntry[] = [
  ...ENERGY_SUPPLIERS,
  ...WATER_UTILITIES,
  ...TELECOM_AND_INTERNET_PROVIDERS,
  ...TRANSPORT_BRANDS,
  ...MULTI_LINE_INSURERS,
  ...HEALTH_INSURERS,
  ...STREAMING_SERVICES,
  ...APP_AND_CLOUD_STOREFRONTS,
  ...HEALTH_SERVICES,
  ...ECOMMERCE_MISSING_FROM_NSI,
  ...SUPERMARKETS_WITH_COUNTRY_QUALIFIED_NSI_NAMES,
  ...FUEL_BRANDS_NSI_TAGS_AS_CONVENIENCE_STORES,
];
