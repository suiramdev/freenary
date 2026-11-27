import { env } from "@freenary/env/server";
import { LOCALE } from "../../assistant/turn";
import { MOCK_INSTITUTIONS } from "./catalog";
import { fixtureInstitutions } from "./fixture/replay";
import { fixtureSessionCode, mockSessionCode } from "./session";

export const MOCK_CONSENT_PATH = "/mock-bank/consent";
export const MOCK_CALLBACK_PATH = "/callback/mock";

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '"': "&quot;",
  "&": "&amp;",
  "'": "&#39;",
  "<": "&lt;",
  ">": "&gt;",
};

const HTML_SPECIAL = /["&'<>]/gu;

const escapeHtml = (text: string): string =>
  text.replaceAll(
    HTML_SPECIAL,
    (character) => HTML_ESCAPES[character] ?? character
  );

const plainResponse = (status: number, body: string): Response =>
  new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
    status,
  });

const callbackWith = (
  redirectUri: string,
  params: Record<string, string>
): string => {
  const target = new URL(redirectUri);
  for (const [key, entry] of Object.entries(params)) {
    target.searchParams.set(key, entry);
  }
  return target.toString();
};

const GENERATED_ORIGIN =
  "This is the mock banking provider. It stands in for the bank consent screen on a development stack, and every account and transaction it returns is generated.";
const FIXTURE_ORIGIN =
  "This is the mock banking provider. It stands in for the bank consent screen on a development stack, and it replays accounts and transactions from a fixture dataset.";
const GENERATED_ORIGIN_FR =
  "Ceci est le fournisseur bancaire fictif. Il remplace l’écran de consentement bancaire sur un environnement de développement, et chaque compte et chaque transaction qu’il renvoie sont générés.";
const FIXTURE_ORIGIN_FR =
  "Ceci est le fournisseur bancaire fictif. Il remplace l’écran de consentement bancaire sur un environnement de développement, et il rejoue les comptes et les transactions d’un fichier de données fictives.";

type ConsentLocale = "en" | "fr";

const CONSENT_LOCALES: readonly ConsentLocale[] = ["en", "fr"];

const CONSENT_COPY: Record<
  ConsentLocale,
  {
    approve: string;
    decline: string;
    fixtureOrigin: string;
    generatedOrigin: string;
    title: string;
  }
> = {
  en: {
    approve: "Approve",
    decline: "Decline",
    fixtureOrigin: FIXTURE_ORIGIN,
    generatedOrigin: GENERATED_ORIGIN,
    title: "Mock bank consent",
  },
  fr: {
    approve: "Approuver",
    decline: "Refuser",
    fixtureOrigin: FIXTURE_ORIGIN_FR,
    generatedOrigin: GENERATED_ORIGIN_FR,
    title: "Consentement de la banque fictive",
  },
};

/** Resolve a locale sent by the web app to a supported consent locale, falling back to English. */
export const resolveConsentLocale = (value: string | null): ConsentLocale => {
  if (!value || !LOCALE.test(value)) {
    return "en";
  }
  const language = value.split("-")[0]?.toLowerCase();
  return CONSENT_LOCALES.includes(language as ConsentLocale)
    ? (language as ConsentLocale)
    : "en";
};

const consentPage = (
  institutionName: string,
  origin: string,
  approveUrl: string,
  declineUrl: string,
  locale: ConsentLocale = "en"
): string => {
  const copy = CONSENT_COPY[locale];
  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${copy.title}</title>
    <style>
      body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f3f4f6;color:#111827}
      main{max-width:26rem;padding:2rem;border-radius:1rem;background:#fff;box-shadow:0 1px 3px #0002}
      a{display:inline-block;margin-top:1rem;margin-right:.75rem;padding:.5rem 1rem;border-radius:.5rem;text-decoration:none}
      .approve{background:#111827;color:#fff}
      .decline{border:1px solid #d1d5db;color:#111827}
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(institutionName)}</h1>
      <p>${escapeHtml(origin)}</p>
      <a class="decline" href="${escapeHtml(declineUrl)}">${copy.decline}</a>
      <a class="approve" href="${escapeHtml(approveUrl)}">${copy.approve}</a>
    </main>
  </body>
</html>`;
};

export const handleMockConsent = (request: Request): Response => {
  if (env.NODE_ENV === "production") {
    return plainResponse(404, "Not found");
  }
  const url = new URL(request.url);
  const search = url.searchParams;
  const institutionId = search.get("institution");
  const redirectUri = search.get("redirect_uri");
  const state = search.get("state");
  const locale = resolveConsentLocale(search.get("locale"));
  const copy = CONSENT_COPY[locale];
  const institution = MOCK_INSTITUTIONS.find(
    (candidate) => candidate.id === institutionId
  );
  if (!institution || !redirectUri || !state) {
    return plainResponse(400, "Invalid consent request");
  }
  const fixture = fixtureInstitutions.some(
    (candidate) => candidate.id === institution.id
  );
  const sessionCode = fixture ? fixtureSessionCode : mockSessionCode;
  const approveUrl = callbackWith(redirectUri, {
    code: sessionCode,
    state,
  });
  const declineUrl = callbackWith(redirectUri, {
    error: "access_denied",
    state,
  });
  return new Response(
    consentPage(
      institution.name,
      fixture ? copy.fixtureOrigin : copy.generatedOrigin,
      approveUrl,
      declineUrl,
      locale
    ),
    {
      headers: { "content-type": "text/html; charset=utf-8" },
    }
  );
};
