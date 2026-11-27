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
  "This is the mock banking provider. It stands in for the bank consent screen on a development stack, and replays the accounts and transactions of a fixture file.";
const GENERATED_ORIGIN_FR =
  "Ceci est le fournisseur bancaire fictif. Il remplace l’écran de consentement bancaire sur un environnement de développement, et chaque compte et chaque transaction qu’il renvoie sont générés.";
const FIXTURE_ORIGIN_FR =
  "Ceci est le fournisseur bancaire fictif. Il remplace l’écran de consentement bancaire sur un environnement de développement, et rejoue les comptes et les transactions d’un fichier de données fictives.";

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
h1{font-size:1.25rem;margin:0 0 .5rem}
p{color:#57534e;line-height:1.5}
nav{display:flex;gap:.75rem;margin-top:1.5rem}
a{flex:1;text-align:center;padding:.6rem 1rem;border-radius:.5rem;text-decoration:none;font-weight:600}
.approve{background:#1c1917;color:#fff}
.decline{border:1px solid #d6d3d1;color:#1c1917}
</style>
</head>
<body>
<main>
<h1>${escapeHtml(institutionName)}</h1>
<p>${escapeHtml(origin)}</p>
<nav>
<a class="decline" href="${escapeHtml(declineUrl)}">${copy.decline}</a>
<a class="approve" href="${escapeHtml(approveUrl)}">${copy.approve}</a>
</nav>
</main>
</body>
</html>`;
};

export const handleMockConsent = (request: Request): Response => {
  if (env.NODE_ENV === "production") {
    return plainResponse(404, "Not Found");
  }
  const search = new URL(request.url).searchParams;
  const institutionId = search.get("institution");
  const redirectUri = search.get("redirect_uri");
  const state = search.get("state");
  const locale = resolveConsentLocale(search.get("locale"));
  const copy = CONSENT_COPY[locale];
  if (redirectUri !== `${env.CORS_ORIGIN}${MOCK_CALLBACK_PATH}`) {
    return plainResponse(400, "redirect_uri is not this instance's callback");
  }
  if (!(state && institutionId)) {
    return plainResponse(400, "Missing state or unknown institution");
  }
  const fixture = fixtureInstitutions().find(
    (candidate) => candidate.id === institutionId
  );
  const institution =
    fixture ??
    MOCK_INSTITUTIONS.find((candidate) => candidate.id === institutionId);
  if (!institution) {
    return plainResponse(400, "Missing state or unknown institution");
  }
  const approveUrl = callbackWith(redirectUri, {
    code: fixture
      ? fixtureSessionCode(fixture.id)
      : mockSessionCode(new Date()),
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
