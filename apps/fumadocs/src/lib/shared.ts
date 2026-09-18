export const appName = "Freenary";
export const docsRoute = "/docs";
export const docsImageRoute = "/og/docs";

export const gitConfig = {
  user: "suiramdev",
  repo: "freenary",
  branch: "main",
};

const MARKDOWN_EXTENSION = /\.md$/;

const FOLDER_INDEX_SLUG = "index";

export const repoBlobUrl = (ref: string) =>
  `https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${ref}/`;

export function encodeMarkdownUrl(slugs: string[], locale: string = "") {
  const segments = [...slugs];

  if (segments.length === 0) {
    segments.push("index.md");
  } else {
    segments[segments.length - 1] += ".md";
  }

  return (
    "/" +
    [locale, ...docsRoute.split("/"), ...segments].filter(Boolean).join("/")
  );
}

export function decodeMarkdownUrl(segments: string[]): string[] {
  if (segments.length === 0) return [];

  const slugs = [...segments];
  slugs[slugs.length - 1] = slugs[slugs.length - 1].replace(
    MARKDOWN_EXTENSION,
    ""
  );

  if (slugs.at(-1) === FOLDER_INDEX_SLUG) slugs.pop();

  return slugs;
}
