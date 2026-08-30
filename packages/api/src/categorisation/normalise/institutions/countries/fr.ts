import type { TransactionChannel } from "../../types";
import { capture } from "../capture-groups";
import type { InstitutionDef } from "../definitions";
import type { CountryProfile } from "./types";

// ── Date parsers ─────────────────────────────────────────────────────────

/** DD/MM/YY or DDMMYY or DD/MM/YYYY or DDMMYYYY → yyyy-mm-dd */
const parseBoursoDate = (raw: string): string | undefined => {
  const digits = raw.replaceAll("/", "");
  if (digits.length === 6) {
    return `20${digits.slice(4, 6)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
  }
  if (digits.length === 8) {
    return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
  }
  return undefined;
};

/** DDMMYY → yyyy-mm-dd */
const parseBnpDate = (raw: string): string | undefined => {
  if (raw.length === 6) {
    return `20${raw.slice(4, 6)}-${raw.slice(2, 4)}-${raw.slice(0, 2)}`;
  }
  return undefined;
};

/** DD/MM/YYYY → yyyy-mm-dd; day+month only → undefined */
const parseCaDate = (raw: string): string | undefined => {
  const parts = raw.split(/[/-]/u);
  if (parts.length === 3 && parts[2]?.length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return undefined;
};

/** DD.MM.YY → yyyy-mm-dd */
const parseLbpDate = (raw: string): string | undefined => {
  const parts = raw.split(".");
  if (parts.length === 3 && parts[2]?.length === 2) {
    return `20${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return undefined;
};

/** DD/MM/YY → yyyy-mm-dd */
const parseLclDate = (raw: string): string | undefined => {
  const parts = raw.split("/");
  if (parts.length === 3 && parts[2]?.length === 2) {
    return `20${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return undefined;
};

// ── Regex patterns ───────────────────────────────────────────────────────

// Boursorama
const BOURSO_CARTE_RE =
  /^CARTE\s+(?<date>\d{2}\/??\d{2}\/??\d{2,4})\s+(?<payee>.+?)(?:\s+\d+)?(?:\s+CB\*(?<card>\d{4}))?\s*$/iu;
const BOURSO_RETRAIT_RE =
  /^RETRAIT\s+DAB\s+(?<date>\d{2}\/??\d{2}\/??\d{2,4})\s+(?<payee>.+?)\s+CB\*(?<card>\d{4,})\s*$/iu;
const BOURSO_AVOIR_RE =
  /^AVOIR\s+(?<date>\d{2}\/??\d{2}\/??\d{2,4})\s+(?<payee>.+?)\s+CB\*(?<card>\d{4,})\s*$/iu;
const BOURSO_PRLV_RE = /^PRLV\s+SEPA\s+(?<payee>.+)/iu;
const BOURSO_VIR_RE = /^VIR(?:\s+(?:SEPA|INST))?\s+(?<payee>.+)/iu;
const BOURSO_ECH_PRET_RE = /^ECH\s+PRET\s*:\s*(?<payee>.+)/iu;

// BNP Paribas
const BNP_FACTURE_RE =
  /^FACTURE\s+CARTE\s+DU\s+(?<date>\d{6})\s+(?<payee>.+?)(?:\s+CARTE\s+(?<card>\d{4}))?\s*$/iu;
const BNP_PRLV_RE =
  /^PRLV(?:\s+EUROPEEN)?\s+SEPA\s+(?<payee>.+?)(?:\s+MDT\/\S+)?(?:\s+ECH\/\S+)?(?:\s+ID\s+\S+)?\s*$/iu;
const BNP_VIR_RE = /^VIR(?:EMENT)?\s+(?:SEPA\s+|INST\s+)?(?<payee>.+)/iu;
const BNP_RETRAIT_RE = /^RETRAIT\s+DAB\s+(?<payee>.+)/iu;
const BNP_CHQ_RE = /^CHQ?\s+(?<payee>.+)/iu;
const BNP_FRAIS_RE = /^(?:FRAIS|COTISATION|COMMISSION)\s+(?<payee>.+)/iu;

// Crédit Agricole
const CA_CARTE_RE =
  /^PAIEMENT\s+PAR\s+CARTE\s+(?<payee>.+?)\s+(?<date>\d{2}\/\d{2})\s*$/iu;
const CA_PRELEV_FULL_RE =
  /^PRELEVEMENT\s+(?<payee>.+?)\s+(?<date>\d{2}\/\d{2}\/\d{4})\s*$/iu;
const CA_PRELEV_SHORT_RE =
  /^PRELEVEMENT\s+(?<payee>.+?)\s+(?<date>\d{2}-\d{2})\s*$/iu;
const CA_PRELEV_BARE_RE = /^PRELEVEMENT\s+(?<payee>.+)/iu;
const CA_VIR_RE = /^VIR(?:EMENT)?\s+(?:SEPA\s+)?(?<payee>.+)/iu;
const CA_RETRAIT_RE = /^RETRAIT\s+DAB\s+(?<payee>.+)/iu;
const CA_CHQ_RE = /^(?:CHEQUE|CHQ)\s+(?<payee>.+)/iu;
const CA_FRAIS_RE = /^(?:FRAIS|COTISATION|COMMISSION)\s+(?<payee>.+)/iu;

// Société Générale
const SG_CARTE_RE =
  /^CARTE\s+(?<card>\w+)\s+(?<date>\d{2}\/\d{2})\s+(?<payee>.+)\s*$/iu;
const SG_DATE_SLASH_RE = /^(?<date>\d{4})\/(?<payee>.+)\s*$/u;
const SG_VIR_POUR_RE =
  /^VIR\s+POUR\s*:\s*(?<payee>.+?)\s+REF\s*:\s*\S+\s+MOTIF\s*:\s*(?<motif>.+)\s*$/iu;
const SG_VIR_RE = /^VIR(?:EMENT)?\s+(?:SEPA\s+)?(?<payee>.+)/iu;
const SG_PRLV_RE = /^PRLV\s+(?:SEPA\s+)?(?<payee>.+)/iu;
const SG_RETRAIT_RE = /^RETRAIT\s+DAB\s+(?<payee>.+)/iu;
const SG_FRAIS_RE = /^(?:FRAIS|COTISATION|COMMISSION)\s+(?<payee>.+)/iu;

// Crédit Mutuel / CIC
const CM_PAIEMENT_RE =
  /^PAIEMENT\s+(?:PSC|CB|MOB)\s+(?<date>\d{4})\s+(?<payee>.+?)\s+(?:CARTE\s*|PAYWEB)(?<card>\d+)\s*$/iu;
const CM_PAIEMENT_NO_CARD_RE =
  /^PAIEMENT\s+(?:PSC|CB|MOB)\s+(?<date>\d{4})\s+(?<payee>.+)\s*$/iu;
const CM_PRLV_RE = /^PRLV\s+(?:SEPA\s+)?(?<payee>.+)/iu;
const CM_VIR_RE = /^VIR(?:EMENT)?\s+(?:SEPA\s+)?(?<payee>.+)/iu;
const CM_RETRAIT_RE = /^RETRAIT\s+DAB\s+(?<payee>.+)/iu;
const CM_CHQ_RE = /^(?:CHEQUE|CHQ)\s+(?<payee>.+)/iu;
const CM_FRAIS_RE = /^(?:FRAIS|COTISATION|COMMISSION)\s+(?<payee>.+)/iu;

// LCL
const LCL_CB_RE = /^CB\s+(?<payee>.+?)\s+(?<date>\d{2}\/\d{2}\/\d{2})\s*$/iu;
const LCL_PRLV_RE = /^PRLV\s+(?:SEPA\s+)?(?<payee>.+)/iu;
const LCL_VIR_RE = /^VIR(?:EMENT)?\s+(?:SEPA\s+)?(?<payee>.+)/iu;
const LCL_RETRAIT_RE = /^RETRAIT\s+DAB\s+(?<payee>.+)/iu;
const LCL_CHQ_RE = /^(?:CHEQUE|CHQ)\s+(?<payee>.+)/iu;
const LCL_FRAIS_RE = /^(?:FRAIS|COTISATION|COMMISSION)\s+(?<payee>.+)/iu;

// La Banque Postale
const LBP_ACHAT_CB_RE =
  /^ACHAT\s+CB\s+(?<payee>.+?)\s+(?<date>\d{2}\.\d{2}\.\d{2})\s*$/iu;
const LBP_PRLV_RE = /^PRLV\s+(?:SEPA\s+)?(?<payee>.+)/iu;
const LBP_VIR_RE = /^VIR(?:EMENT)?\s+(?:SEPA\s+)?(?<payee>.+)/iu;
const LBP_RETRAIT_RE = /^RETRAIT\s+DAB\s+(?<payee>.+)/iu;
const LBP_CHQ_RE = /^(?:CHEQUE|CHQ)\s+(?<payee>.+)/iu;
const LBP_FRAIS_RE = /^(?:FRAIS|COTISATION|COMMISSION)\s+(?<payee>.+)/iu;

// ── Line filters ─────────────────────────────────────────────────────────

const BOURSO_REF_LINE_RE = /^R[ée]f\s*:\s/iu;
const BOURSO_BACKSLASH_LOC_RE = /\\.+$/u;
const stripBoursoLocation = (text: string): string =>
  text.replace(BOURSO_BACKSLASH_LOC_RE, "").trim();

// ── Institution definitions ──────────────────────────────────────────────

const institutions: readonly InstitutionDef[] = [
  {
    bics: ["BOUSFRPP"],
    cleanPayee: stripBoursoLocation,
    id: "boursorama",
    names: ["boursorama", "boursobank"],
    noiseLines: [BOURSO_REF_LINE_RE],
    patterns: [
      { channel: "atm", dateParser: parseBoursoDate, re: BOURSO_RETRAIT_RE },
      { channel: "card", dateParser: parseBoursoDate, re: BOURSO_AVOIR_RE },
      { channel: "card", dateParser: parseBoursoDate, re: BOURSO_CARTE_RE },
      { channel: "direct-debit", re: BOURSO_PRLV_RE },
      { channel: "transfer", re: BOURSO_VIR_RE },
      { channel: "loan", re: BOURSO_ECH_PRET_RE },
    ],
  },
  {
    bics: ["BNPAFR", "BNPAFRPP"],
    id: "bnp-paribas",
    names: ["bnp", "bnp paribas"],
    patterns: [
      { channel: "card", dateParser: parseBnpDate, re: BNP_FACTURE_RE },
      { channel: "direct-debit", re: BNP_PRLV_RE },
      { channel: "atm", re: BNP_RETRAIT_RE },
      { channel: "transfer", re: BNP_VIR_RE },
      { channel: "cheque", re: BNP_CHQ_RE },
      { channel: "fee", re: BNP_FRAIS_RE },
    ],
  },
  {
    bics: ["AGRIFR", "AGRIFRPP"],
    id: "credit-agricole",
    names: ["credit agricole", "crédit agricole"],
    patterns: [
      { channel: "card", re: CA_CARTE_RE },
      {
        channel: "direct-debit",
        dateParser: parseCaDate,
        re: CA_PRELEV_FULL_RE,
      },
      { channel: "direct-debit", re: CA_PRELEV_SHORT_RE },
      { channel: "direct-debit", re: CA_PRELEV_BARE_RE },
      { channel: "atm", re: CA_RETRAIT_RE },
      { channel: "transfer", re: CA_VIR_RE },
      { channel: "cheque", re: CA_CHQ_RE },
      { channel: "fee", re: CA_FRAIS_RE },
    ],
  },
  {
    bics: ["SOGEFR", "SOGEFRPP"],
    id: "societe-generale",
    names: ["sg ", "societe generale", "société générale"],
    patterns: [
      { channel: "card", re: SG_CARTE_RE },
      {
        channel: "transfer",
        extractPayee: (groups) =>
          capture(groups, "motif") ?? capture(groups, "payee"),
        re: SG_VIR_POUR_RE,
      },
      { channel: "unknown", re: SG_DATE_SLASH_RE },
      { channel: "direct-debit", re: SG_PRLV_RE },
      { channel: "atm", re: SG_RETRAIT_RE },
      { channel: "transfer", re: SG_VIR_RE },
      { channel: "fee", re: SG_FRAIS_RE },
    ],
  },
  {
    bics: ["CMCIFR", "CMCIFRPP"],
    id: "credit-mutuel",
    names: ["cic", "credit mutuel", "crédit mutuel"],
    patterns: [
      { channel: "card", re: CM_PAIEMENT_RE },
      { channel: "card", re: CM_PAIEMENT_NO_CARD_RE },
      { channel: "direct-debit", re: CM_PRLV_RE },
      { channel: "atm", re: CM_RETRAIT_RE },
      { channel: "transfer", re: CM_VIR_RE },
      { channel: "cheque", re: CM_CHQ_RE },
      { channel: "fee", re: CM_FRAIS_RE },
    ],
  },
  {
    bics: ["CRLYFR", "CRLYFRPP"],
    id: "lcl",
    names: ["lcl", "le credit lyonnais"],
    patterns: [
      { channel: "card", dateParser: parseLclDate, re: LCL_CB_RE },
      { channel: "direct-debit", re: LCL_PRLV_RE },
      { channel: "atm", re: LCL_RETRAIT_RE },
      { channel: "transfer", re: LCL_VIR_RE },
      { channel: "cheque", re: LCL_CHQ_RE },
      { channel: "fee", re: LCL_FRAIS_RE },
    ],
  },
  {
    bics: ["PSSTFR", "PSSTFRPP"],
    id: "la-banque-postale",
    names: ["banque postale", "la banque postale"],
    patterns: [
      { channel: "card", dateParser: parseLbpDate, re: LBP_ACHAT_CB_RE },
      { channel: "direct-debit", re: LBP_PRLV_RE },
      { channel: "atm", re: LBP_RETRAIT_RE },
      { channel: "transfer", re: LBP_VIR_RE },
      { channel: "cheque", re: LBP_CHQ_RE },
      { channel: "fee", re: LBP_FRAIS_RE },
    ],
  },
];

// ── Channel-verb patterns (French generic fallback) ──────────────────────

const verbPatterns: [RegExp, TransactionChannel][] = [
  [/^PAIEMENT\s+PAR\s+CARTE(?:\s+|$)/iu, "card"],
  [/^FACTURE\s+CARTE(?:\s+|$)/iu, "card"],
  [/^PAIEMENT\s+(?:PSC|CB|MOB)(?:\s+|$)/iu, "card"],
  [/^PRLV\s+(?:EUROPEEN\s+)?SEPA(?:\s+|$)/iu, "direct-debit"],
  [/^PRELEVEMENT(?:\s+SEPA)?(?:\s+|$)/iu, "direct-debit"],
  [/^RETRAIT\s+DAB(?:\s+|$)/iu, "atm"],
  [/^RETRAIT(?:\s+|$)/iu, "atm"],
  [/^VIR(?:EMENT)?(?:\s+(?:SEPA|INST))?(?:\s+|$)/iu, "transfer"],
  [/^ACHAT\s+CB(?:\s+|$)/iu, "card"],
  [/^CARTE(?:\s+|$)/iu, "card"],
  [/^CB(?:\s+|$)/iu, "card"],
  [/^(?:CHEQUE|CHQ)(?:\s+|$)/iu, "cheque"],
  [/^ECH\s+PRET\s*:?\s*/iu, "loan"],
  [/^(?:FRAIS|COTISATION|COMMISSION)(?:\s+|$)/iu, "fee"],
];

// ── Trailing noise (French) ──────────────────────────────────────────────

const trailingNoise: RegExp[] = [
  // Reference suffixes: REF: ..., MDT/..., ECH/..., ID ...
  /\s+(?:REF\s*:\s*\S+|MDT\/\S+|ECH\/\S+|ID\s+\S+)$/iu,
  // Trailing date, card or reference chunks
  /\s+(?:CARTE\s+\d{4,}|CB\*?\d{4,}|\d{2}[./]\d{2}(?:[./]\d{2,4})?)$/iu,
];

// ── Profile ──────────────────────────────────────────────────────────────

export const fr: CountryProfile = {
  code: "FR",
  institutions,
  trailingNoise,
  verbPatterns,
};
