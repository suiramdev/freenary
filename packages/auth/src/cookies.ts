/** Exported because it surfaces in `createAuth`'s inferred return type. */
export interface AuthCookiePolicy {
  httpOnly: true;
  sameSite: "lax" | "none";
  secure: boolean;
}

/**
 * The session, trusted-device and two-factor cookies are only sent cross-site
 * when the deployment forces it.
 *
 * Browsers judge same-site by registrable domain, which cannot be derived from
 * a hostname without a public-suffix list. So the two cases we can prove get
 * `Lax`: identical hostnames, and a declared `cookieDomain` — the operator
 * naming the parent both origins sit under. Anything else falls back to `None`,
 * which browsers honour only over HTTPS; that combination is refused in
 * production rather than shipped as a login whose cookie the browser drops.
 */
export const resolveCookiePolicy = (
  authUrl: string,
  webOrigin: string,
  isProduction: boolean,
  cookieDomain?: string
): AuthCookiePolicy => {
  const api = new URL(authUrl);
  const web = new URL(webOrigin);
  // A declared domain the browser would not domain-match is worse than none:
  // it emits `Lax; Domain=…`, the browser discards the Set-Cookie, and sign-in
  // answers 200 while nobody is ever signed in. Hosts are compared folded,
  // since a Domain match is case-insensitive. Only the leading dot is stripped,
  // because that is the one RFC 6265 §5.2.3 ignores — the raw value is what
  // reaches the browser, so anything else has to be refused, not tidied.
  const declared = cookieDomain?.toLowerCase().replace(/^\./u, "");
  const covers = (host: string) =>
    declared !== undefined &&
    (host === declared || host.endsWith(`.${declared}`));

  if (declared !== undefined) {
    // A single label is a public suffix — `.com`, `.local` — and browsers
    // refuse a cookie scoped to one. A multi-label suffix like `.co.uk` is
    // refused too, and telling that apart needs a public-suffix list we do not
    // ship; this catches the mistake anyone actually makes.
    if (declared.endsWith(".")) {
      throw new Error(
        `AUTH_COOKIE_DOMAIN (${cookieDomain}) ends in a dot, which browsers do not strip, so no host would match it. Drop the trailing dot.`
      );
    }
    if (!declared.includes(".")) {
      throw new Error(
        `AUTH_COOKIE_DOMAIN (${cookieDomain}) is a single label, which browsers treat as a public suffix and refuse to scope a cookie to. Declare the domain both origins sit under, e.g. ".example.com".`
      );
    }
    if (
      !(
        covers(api.hostname.toLowerCase()) && covers(web.hostname.toLowerCase())
      )
    ) {
      throw new Error(
        `AUTH_COOKIE_DOMAIN (${cookieDomain}) is not a parent of both ${api.hostname} and ${web.hostname}, so browsers would drop the session cookie. Declare the domain both origins sit under, or leave it unset.`
      );
    }
  }

  const isSameSite = declared !== undefined || api.hostname === web.hostname;
  const secure = api.protocol === "https:";

  if (!(isSameSite || secure)) {
    const message = `The API (${api.origin}) and the web app (${web.origin}) are on different hosts, so the session cookie needs SameSite=None — which browsers reject over plain HTTP. Serve BETTER_AUTH_URL over HTTPS, put both behind one hostname, or set AUTH_COOKIE_DOMAIN to the parent domain they share.`;
    if (isProduction) {
      throw new Error(message);
    }
    console.warn(`[auth] ${message}`);
  }

  return { httpOnly: true, sameSite: isSameSite ? "lax" : "none", secure };
};
