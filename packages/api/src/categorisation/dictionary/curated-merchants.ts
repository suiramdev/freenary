/**
 * Hand-curated merchant supplement for categories NSI structurally under-covers.
 *
 * NSI indexes OSM points of interest — retail shops, restaurants, fuel stations —
 * so utilities, telecoms, rail operators, insurers, and subscription services are
 * sparse or absent. This list fills those gaps with major French/EU recurring-payment
 * merchants that matter most for a budgeting product.
 *
 * Every entry carries `source: "curated"` in the artifact for auditability.
 * Curated entries take precedence over NSI entries with the same normalisedName.
 */

import type { SpendingCategory } from "../../lib/mcc-categories";

interface CuratedEntry {
  name: string;
  aliases: string[];
  domains: string[];
  category: SpendingCategory;
}

export const CURATED_MERCHANTS: CuratedEntry[] = [
  // ── Energy ──
  {
    aliases: ["EDF Clients Particuliers", "EDF ENR", "EDF Entreprises"],
    category: "utilities",
    domains: ["edf.fr"],
    name: "EDF",
  },
  {
    aliases: ["Engie Home Services", "Engie Particuliers"],
    category: "utilities",
    domains: ["particuliers.engie.fr"],
    name: "Engie",
  },
  {
    aliases: ["Total Energies", "TotalEnergies Marketing France"],
    category: "utilities",
    domains: ["totalenergies.fr"],
    name: "TotalEnergies",
  },
  {
    aliases: [],
    category: "utilities",
    domains: ["enercoop.fr"],
    name: "Enercoop",
  },

  // ── Water ──
  {
    aliases: ["Veolia Eau", "Veolia Environnement"],
    category: "utilities",
    domains: ["veolia.fr"],
    name: "Veolia",
  },
  {
    aliases: ["Suez Eau France", "Lydec"],
    category: "utilities",
    domains: ["suez.com"],
    name: "Suez",
  },
  {
    aliases: ["Saur SAS"],
    category: "utilities",
    domains: ["saur.com"],
    name: "Saur",
  },

  // ── Telecom / ISP ──
  {
    aliases: ["Orange France", "Orange SA"],
    category: "utilities",
    domains: ["orange.fr"],
    name: "Orange",
  },
  {
    aliases: ["SFR Fibre", "SFR Mobile"],
    category: "utilities",
    domains: ["sfr.fr"],
    name: "SFR",
  },
  {
    aliases: ["Free Mobile", "Free Haut Debit", "Free SAS", "Iliad"],
    category: "utilities",
    domains: ["free.fr"],
    name: "Free",
  },
  {
    aliases: ["Bouygues Tel", "B&You"],
    category: "utilities",
    domains: ["bouyguestelecom.fr"],
    name: "Bouygues Telecom",
  },
  {
    aliases: [],
    category: "utilities",
    domains: ["sosh.fr"],
    name: "Sosh",
  },
  {
    aliases: ["Red SFR"],
    category: "utilities",
    domains: ["red-by-sfr.fr"],
    name: "Red by SFR",
  },

  // ── Transport / Rail ──
  {
    aliases: ["SNCF Connect", "SNCF Voyageurs", "SNCF Gares Connexions"],
    category: "transport",
    domains: ["sncf.com", "sncf-connect.com"],
    name: "SNCF",
  },
  {
    aliases: ["Trainline EU", "Captain Train"],
    category: "transport",
    domains: ["trainline.fr", "trainline.eu"],
    name: "Trainline",
  },
  {
    aliases: ["RATP Dev"],
    category: "transport",
    domains: ["ratp.fr"],
    name: "RATP",
  },
  {
    aliases: ["IDFM", "Navigo", "Ile de France Mobilites"],
    category: "transport",
    domains: ["iledefrance-mobilites.fr"],
    name: "Île-de-France Mobilités",
  },
  {
    aliases: ["Bla Bla Car", "BlaBlaBus"],
    category: "transport",
    domains: ["blablacar.fr"],
    name: "BlaBlaCar",
  },
  {
    aliases: ["Uber BV"],
    category: "transport",
    domains: ["uber.com"],
    name: "Uber",
  },
  {
    aliases: [],
    category: "dining",
    domains: ["ubereats.com"],
    name: "Uber Eats",
  },
  {
    aliases: ["Bolt Technology"],
    category: "transport",
    domains: ["bolt.eu"],
    name: "Bolt",
  },

  // ── Insurance ──
  {
    aliases: ["AXA France", "AXA Assurances"],
    category: "insurance",
    domains: ["axa.fr"],
    name: "AXA",
  },
  {
    aliases: ["MAIF Assurances"],
    category: "insurance",
    domains: ["maif.fr"],
    name: "MAIF",
  },
  {
    aliases: ["MACIF Assurances"],
    category: "insurance",
    domains: ["macif.fr"],
    name: "MACIF",
  },
  {
    aliases: ["MAAF Assurances"],
    category: "insurance",
    domains: ["maaf.com"],
    name: "MAAF",
  },
  {
    aliases: ["Matmut Assurances"],
    category: "insurance",
    domains: ["matmut.fr"],
    name: "Matmut",
  },
  {
    aliases: ["Groupama Assurances"],
    category: "insurance",
    domains: ["groupama.fr"],
    name: "Groupama",
  },
  {
    aliases: ["Allianz France", "Allianz IARD"],
    category: "insurance",
    domains: ["allianz.fr"],
    name: "Allianz",
  },
  {
    aliases: ["April Assurances"],
    category: "insurance",
    domains: ["april.fr"],
    name: "April",
  },

  // ── Streaming / Subscriptions ──
  {
    aliases: ["Netflix International"],
    category: "subscriptions",
    domains: ["netflix.com"],
    name: "Netflix",
  },
  {
    aliases: ["Spotify AB"],
    category: "subscriptions",
    domains: ["spotify.com"],
    name: "Spotify",
  },
  {
    aliases: ["Disney Plus", "The Walt Disney Company"],
    category: "subscriptions",
    domains: ["disneyplus.com"],
    name: "Disney+",
  },
  {
    aliases: ["Canal Plus", "Canal+ France", "Groupe Canal+"],
    category: "subscriptions",
    domains: ["canalplus.com"],
    name: "Canal+",
  },
  {
    aliases: ["Deezer SA"],
    category: "subscriptions",
    domains: ["deezer.com"],
    name: "Deezer",
  },
  {
    aliases: ["Amazon Prime Video", "Amazon Digital"],
    category: "subscriptions",
    domains: ["primevideo.com"],
    name: "Amazon Prime",
  },
  {
    aliases: ["YouTube Music", "Google YouTube"],
    category: "subscriptions",
    domains: ["youtube.com"],
    name: "YouTube Premium",
  },
  {
    aliases: ["Apple.com/bill", "iTunes", "Apple Services"],
    category: "subscriptions",
    domains: ["apple.com"],
    name: "Apple",
  },
  {
    aliases: ["Google Cloud", "Google One", "Google Storage", "Google Ireland"],
    category: "subscriptions",
    domains: ["google.com"],
    name: "Google",
  },
  {
    aliases: ["Microsoft 365", "Microsoft Ireland", "Xbox Game Pass"],
    category: "subscriptions",
    domains: ["microsoft.com"],
    name: "Microsoft",
  },
  {
    aliases: ["Adobe Systems", "Adobe Creative Cloud"],
    category: "subscriptions",
    domains: ["adobe.com"],
    name: "Adobe",
  },
  {
    aliases: ["OVHcloud", "OVH SAS"],
    category: "subscriptions",
    domains: ["ovhcloud.com", "ovh.com"],
    name: "OVH",
  },
  {
    aliases: ["Scaleway SAS", "Online SAS"],
    category: "subscriptions",
    domains: ["scaleway.com"],
    name: "Scaleway",
  },

  // ── Health ──
  {
    aliases: [],
    category: "health",
    domains: ["doctolib.fr"],
    name: "Doctolib",
  },
  {
    aliases: ["CPAM", "Assurance Maladie"],
    category: "health",
    domains: ["ameli.fr"],
    name: "Ameli",
  },

  // ── E-commerce NSI lacks ──
  {
    aliases: ["Cdiscount SA"],
    category: "shopping",
    domains: ["cdiscount.com"],
    name: "Cdiscount",
  },
  {
    aliases: ["Vinted UAB"],
    category: "shopping",
    domains: ["vinted.fr"],
    name: "Vinted",
  },
  {
    aliases: ["Le Bon Coin", "LBC France"],
    category: "shopping",
    domains: ["leboncoin.fr"],
    name: "Leboncoin",
  },
  {
    aliases: ["BackMarket"],
    category: "shopping",
    domains: ["backmarket.fr"],
    name: "Back Market",
  },
  {
    aliases: ["Mano Mano"],
    category: "shopping",
    domains: ["manomano.fr"],
    name: "ManoMano",
  },
  {
    aliases: ["Vente-Privée", "Vente Privee"],
    category: "shopping",
    domains: ["veepee.fr"],
    name: "Veepee",
  },

  // ── Supermarkets with country-qualified NSI names ──
  {
    aliases: ["Monop'"],
    category: "groceries",
    domains: ["monoprix.fr"],
    name: "Monoprix",
  },
  {
    aliases: [
      "Carrefour Market",
      "Carrefour City",
      "Carrefour Express",
      "Carrefour Contact",
    ],
    category: "groceries",
    domains: ["carrefour.fr"],
    name: "Carrefour",
  },

  // ── Fuel brands whose NSI convenience-store tag incorrectly overrides transport ──
  {
    aliases: ["Esso Express"],
    category: "transport",
    domains: ["esso.fr"],
    name: "Esso",
  },
  {
    aliases: ["Shell Express"],
    category: "transport",
    domains: ["shell.fr"],
    name: "Shell",
  },
];
