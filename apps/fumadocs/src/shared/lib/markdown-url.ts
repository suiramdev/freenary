import { docsRoute } from "../config/site";

const MARKDOWN_EXTENSION = /\.md$/;

const FOLDER_INDEX_SLUG = "index";

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
