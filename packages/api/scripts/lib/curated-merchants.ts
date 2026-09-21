import type { CuratedEntry } from "./types";

const ENERGY_SUPPLIERS: CuratedEntry[] = [
  { category: "bills-utilities", name: "EDF" },
  { category: "bills-utilities", name: "Engie" },
  { category: "bills-utilities", name: "TotalEnergies" },
  { category: "bills-utilities", name: "Enercoop" },
];

const WATER_UTILITIES: CuratedEntry[] = [
  { category: "bills-utilities", name: "Veolia" },
  { category: "bills-utilities", name: "Suez" },
  { category: "bills-utilities", name: "Saur" },
];

const TELECOM_AND_INTERNET_PROVIDERS: CuratedEntry[] = [
  { category: "bills-utilities", name: "Orange" },
  { category: "bills-utilities", name: "SFR" },
  { category: "bills-utilities", name: "Free" },
  { category: "bills-utilities", name: "Bouygues Telecom" },
  { category: "bills-utilities", name: "Sosh" },
  { category: "bills-utilities", name: "Red by SFR" },
];

const TRANSPORT_BRANDS: CuratedEntry[] = [
  { category: "transport-travel", name: "SNCF" },
  { category: "transport-travel", name: "Trainline" },
  { category: "transport-travel", name: "RATP" },
  { category: "transport-travel", name: "Île-de-France Mobilités" },
  { category: "transport-travel", name: "BlaBlaCar" },
  { category: "transport-travel", name: "Uber" },
  { category: "restaurants", name: "Uber Eats" },
  { category: "transport-travel", name: "Bolt" },
];

const HEALTH_INSURERS: CuratedEntry[] = [
  { category: "bills-utilities", name: "April" },
];

const STREAMING_SERVICES: CuratedEntry[] = [
  { category: "subscriptions", name: "Netflix" },
  { category: "subscriptions", name: "Spotify" },
  { category: "subscriptions", name: "Disney+" },
  { category: "subscriptions", name: "Canal+" },
  { category: "subscriptions", name: "Deezer" },
  { category: "subscriptions", name: "Amazon Prime" },
  { category: "subscriptions", name: "YouTube Premium" },
];

const APP_AND_CLOUD_STOREFRONTS: CuratedEntry[] = [
  { category: "subscriptions", name: "Apple" },
  { category: "subscriptions", name: "Google" },
  { category: "subscriptions", name: "Microsoft" },
  { category: "subscriptions", name: "Adobe" },
  { category: "subscriptions", name: "OVH" },
  { category: "subscriptions", name: "Scaleway" },
];

const HEALTH_SERVICES: CuratedEntry[] = [
  { category: "health", name: "Doctolib" },
  { category: "health", name: "Ameli" },
];

const ECOMMERCE_MISSING_FROM_NSI: CuratedEntry[] = [
  { category: "shopping", name: "Cdiscount" },
  { category: "shopping", name: "Vinted" },
  { category: "shopping", name: "Leboncoin" },
  { category: "shopping", name: "Back Market" },
  { category: "bills-utilities", name: "ManoMano" },
  { category: "shopping", name: "Veepee" },
];

const SUPERMARKETS_WITH_COUNTRY_QUALIFIED_NSI_NAMES: CuratedEntry[] = [
  { category: "groceries", name: "Monoprix" },
  { category: "groceries", name: "Carrefour" },
];

const FUEL_BRANDS_NSI_TAGS_AS_CONVENIENCE_STORES: CuratedEntry[] = [
  { category: "car-fuel", name: "Esso" },
  { category: "car-fuel", name: "Shell" },
];

export const CURATED_MERCHANTS: CuratedEntry[] = [
  ...ENERGY_SUPPLIERS,
  ...WATER_UTILITIES,
  ...TELECOM_AND_INTERNET_PROVIDERS,
  ...TRANSPORT_BRANDS,
  ...HEALTH_INSURERS,
  ...STREAMING_SERVICES,
  ...APP_AND_CLOUD_STOREFRONTS,
  ...HEALTH_SERVICES,
  ...ECOMMERCE_MISSING_FROM_NSI,
  ...SUPERMARKETS_WITH_COUNTRY_QUALIFIED_NSI_NAMES,
  ...FUEL_BRANDS_NSI_TAGS_AS_CONVENIENCE_STORES,
];
