#!/usr/bin/env bun
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

import { icons } from "lucide-react";

import { gitConfig, repoBlobUrl } from "../src/shared/config/site";
import { isVersionId, NEXT_VERSION } from "../src/shared/lib/versions";
import { getMDXComponents } from "../src/shared/ui/mdx";
import {
  type DocPage,
  lineAt,
  type MetaFile,
  readMetaFiles,
  readPages,
  slugify,
} from "./docs-model";
import {
  CONTRACTION,
  ENV_VAR_OR_ENUM_NAME,
  isAllowedCodeLanguage,
  isAllowedFrontmatterKey,
  isOperatorOnlyCodeLanguage,
  ROADMAP_PHRASES,
  STE_BANNED_MODALS,
  STE_DESCRIPTION_WORD_LIMIT,
  STE_INSTRUCTION_WORD_LIMIT,
  STE_PARAGRAPH_SENTENCE_LIMIT,
  STE_WORD_SUBSTITUTIONS,
} from "./docs-rules";

type Severity = "error" | "warning";

type Finding = {
  file: string;
  line: number;
  rule: string;
  message: string;
  severity: Severity;
};

type Report = (
  severity: Severity,
  file: string,
  line: number,
  rule: string,
  message: string
) => void;

const CONTENT_DIR = "content/docs";
const BASE_ROUTE = "/docs";
const GUIDES_FOLDER = "guides";
const VERSION_LIST_FILE = "meta.json";
const REQUIRED_FRONTMATTER_FIELDS = ["title", "description", "icon"];
const PAGE_OR_META_FILE = /\.(?:mdx|json)$/;
const NON_PAGE_META_ENTRY =
  /^(?:---.*---|\.\.\..*|!.+|(?:external:)?\[.*\]\(.*\))$/;
const META_ENTRY_PREFIX = /^\.\//;
const PAGE_EXTENSION = /\.mdx$/;
const TRAILING_SLASH = /\/$/;
const SENTENCE_TRAILING_MARKUP = '[*_`")\\]]{0,2}';
const SENTENCE_OPENING_MARKUP = "[*_`\"'[(A-Z]";
const SENTENCE_SPLIT = new RegExp(
  `(?<=[.!?]${SENTENCE_TRAILING_MARKUP})\\s+(?=${SENTENCE_OPENING_MARKUP})`
);
const PARAGRAPH_SPLIT = /\n[ \t]*\n/;
const MARKDOWN_TABLE_ROW = /^[ \t]*\|/;
const LIST_ITEM = /^[ \t]*(?:[-*+]|\d+\.)\s/;
const WORD = /[\w'’-]+/g;
const ANCHOR_LINK = /^([^#]*)(?:#(.+))?$/;
const RULE_DISABLE_DIRECTIVE = /docs-check disable:\s*([\w\s,-]+)/g;
const NO_DISABLED_RULES: ReadonlySet<string> = new Set();

const findings: Finding[] = [];

const versionOf = (relativePath: string) => relativePath.split("/")[0];

const reporterFor =
  (disabledRules: ReadonlySet<string>): Report =>
  (severity, file, line, rule, message) => {
    if (disabledRules.has(rule)) {
      return;
    }

    findings.push({ file, line, message, rule, severity });
  };

const rulesDisabledByPage = (raw: string): ReadonlySet<string> => {
  const disabled = new Set<string>();
  RULE_DISABLE_DIRECTIVE.lastIndex = 0;
  let directive = RULE_DISABLE_DIRECTIVE.exec(raw);

  while (directive) {
    for (const rule of directive[1].split(",")) {
      disabled.add(rule.trim());
    }

    directive = RULE_DISABLE_DIRECTIVE.exec(raw);
  }

  return disabled;
};

const checkFrontmatter = (page: DocPage, report: Report) => {
  const { frontmatter, frontmatterLineByKey, relativePath } = page;

  for (const field of REQUIRED_FRONTMATTER_FIELDS) {
    if (!frontmatter.get(field)) {
      report(
        "error",
        relativePath,
        1,
        "frontmatter",
        `no \`${field}\` in the frontmatter. Every page carries a title, a description and an icon.`
      );
    }
  }

  for (const key of frontmatter.keys()) {
    if (!isAllowedFrontmatterKey(key)) {
      report(
        "error",
        relativePath,
        frontmatterLineByKey.get(key) ?? 1,
        "frontmatter",
        `\`${key}\` is not a frontmatter field. Use title, description, icon or full.`
      );
    }
  }

  const icon = frontmatter.get("icon");

  if (icon && !Object.hasOwn(icons, icon)) {
    report(
      "error",
      relativePath,
      frontmatterLineByKey.get("icon") ?? 1,
      "icon",
      `\`${icon}\` is not in lucide's \`icons\` record, so it renders nothing. Use the canonical PascalCase name.`
    );
  }

  if (frontmatter.get("title")?.toLowerCase() === "overview") {
    report(
      "error",
      relativePath,
      frontmatterLineByKey.get("title") ?? 1,
      "no-overview",
      "no page carries the title `Overview`. Name the page after its subject."
    );
  }
};

const checkFences = (page: DocPage, report: Report) => {
  const isGuide = page.relativePath.split("/")[1] === GUIDES_FOLDER;

  for (const fence of page.fences) {
    const line = lineAt(page.raw, fence.index);

    if (fence.language === "") {
      report(
        "error",
        page.relativePath,
        line,
        "code-fence",
        "the fence names no language. Name a Shiki language on every fence."
      );
      continue;
    }

    if (!isAllowedCodeLanguage(fence.language)) {
      const hint =
        fence.language === "env"
          ? " Write `dotenv` for an environment file."
          : "";
      report(
        "error",
        page.relativePath,
        line,
        "code-fence",
        `\`${fence.language}\` is not one of the languages this site uses.${hint}`
      );
      continue;
    }

    if (isGuide && isOperatorOnlyCodeLanguage(fence.language)) {
      report(
        "error",
        page.relativePath,
        line,
        "guides-audience",
        `a \`${fence.language}\` block belongs in self-hosting/ or contributing/. A guide names no command, file or variable.`
      );
    }
  }
};

const checkComponents = (
  page: DocPage,
  registered: ReadonlySet<string>,
  report: Report
) => {
  for (const component of page.components) {
    if (!registered.has(component.name)) {
      report(
        "error",
        page.relativePath,
        lineAt(page.raw, component.index),
        "component",
        `\`${component.name}\` is not registered in src/shared/ui/mdx.tsx, so it renders nothing.`
      );
    }
  }
};

const checkLinks = (
  page: DocPage,
  pageByUrl: ReadonlyMap<string, DocPage>,
  report: Report
) => {
  for (const link of page.links) {
    const line = lineAt(page.raw, link.index);
    const { target } = link;

    if (target.endsWith(".mdx") || target.startsWith("../")) {
      report(
        "error",
        page.relativePath,
        line,
        "link",
        `\`${target}\` is a relative file link. Write the absolute site path, without an extension.`
      );
      continue;
    }

    if (!target.startsWith(BASE_ROUTE)) {
      continue;
    }

    const parts = ANCHOR_LINK.exec(target);
    const written = (parts?.[1] ?? target).replace(TRAILING_SLASH, "");
    const anchor = parts?.[2];
    const pathInsideRoute = written.slice(BASE_ROUTE.length + 1);
    const [first] = pathInsideRoute.split("/");

    if (isVersionId(first)) {
      report(
        "error",
        page.relativePath,
        line,
        "link",
        `\`${target}\` names a version. Write \`${BASE_ROUTE}/${pathInsideRoute
          .split("/")
          .slice(1)
          .join("/")}\`, which resolves inside the version the reader is on.`
      );
      continue;
    }

    const targetPage = pageByUrl.get(
      `${BASE_ROUTE}/${versionOf(page.relativePath)}${written.slice(
        BASE_ROUTE.length
      )}`
    );

    if (!targetPage) {
      report(
        "error",
        page.relativePath,
        line,
        "link",
        `\`${target}\` resolves to no page.`
      );
      continue;
    }

    if (anchor && !targetPage.anchorIds.has(anchor)) {
      report(
        "error",
        page.relativePath,
        line,
        "link",
        `\`${target}\` names no heading on ${targetPage.relativePath}.`
      );
    }
  }
};

const checkRepoLinksArePinned = (page: DocPage, report: Report) => {
  const movingBranchLinkTarget = `](${repoBlobUrl(gitConfig.branch)}`;
  let index = page.raw.indexOf(movingBranchLinkTarget);

  while (index !== -1) {
    report(
      "error",
      page.relativePath,
      lineAt(page.raw, index),
      "link",
      `a repository link names \`${gitConfig.branch}\`. A released page pins it: \`/blob/v${versionOf(page.relativePath)}.0/\`, or whichever patch tag holds the code the page describes.`
    );
    index = page.raw.indexOf(
      movingBranchLinkTarget,
      index + movingBranchLinkTarget.length
    );
  }
};

const checkVersionExamplesArePinned = (page: DocPage, report: Report) => {
  const movingVersionExampleLine = "\nFREENARY_VERSION=main\n";
  let index = page.raw.indexOf(movingVersionExampleLine);

  while (index !== -1) {
    report(
      "error",
      page.relativePath,
      lineAt(page.raw, index + 1),
      "version",
      `\`FREENARY_VERSION=main\` names the moving branch. A released page pins it: \`FREENARY_VERSION=${versionOf(page.relativePath)}\`.`
    );
    index = page.raw.indexOf(
      movingVersionExampleLine,
      index + movingVersionExampleLine.length
    );
  }
};

const checkMeta = (
  meta: MetaFile,
  pages: readonly DocPage[],
  root: string,
  report: Report
) => {
  const rel = relative(root, meta.absolutePath);
  const prefix = meta.folder === "" ? "" : `${meta.folder}/`;
  const owned = new Set<string>();

  for (const page of pages) {
    if (!page.relativePath.startsWith(prefix)) {
      continue;
    }

    const tail = page.relativePath
      .slice(prefix.length)
      .replace(PAGE_EXTENSION, "");
    const [head, ...rest] = tail.split("/");

    if (rest.length === 0) {
      owned.add(head);
    } else if (rest.length === 1 && rest[0] === "index") {
      owned.add(head);
    }
  }

  const listed = new Set<string>();

  for (const entry of meta.pages) {
    if (NON_PAGE_META_ENTRY.test(entry)) {
      continue;
    }

    const name = entry.replace(META_ENTRY_PREFIX, "");

    if (listed.has(name)) {
      report(
        "error",
        rel,
        1,
        "meta",
        `\`${name}\` appears twice in \`pages\`.`
      );
    }

    listed.add(name);

    if (!owned.has(name)) {
      report(
        "error",
        rel,
        1,
        "meta",
        `\`${name}\` names no page or folder here.`
      );
    }
  }

  for (const name of owned) {
    if (!listed.has(name)) {
      report(
        "error",
        rel,
        1,
        "meta",
        `\`${name}\` is missing from \`pages\`, so it lands last and unordered.`
      );
    }
  }
};

const checkPhrases = (page: DocPage, report: Report) => {
  const { maskedProse, relativePath } = page;

  const flag = (
    pattern: RegExp,
    rule: string,
    message: (hit: string) => string
  ) => {
    pattern.lastIndex = 0;
    let match = pattern.exec(maskedProse);

    while (match) {
      report(
        "error",
        relativePath,
        lineAt(maskedProse, match.index),
        rule,
        message(match[0])
      );
      match = pattern.exec(maskedProse);
    }
  };

  for (const phrase of ROADMAP_PHRASES) {
    flag(
      phrase,
      "no-roadmap",
      (hit) => `\`${hit}\` is roadmap language. State what the code does now.`
    );
  }

  flag(
    CONTRACTION,
    "ste-contraction",
    (hit) => `\`${hit}\` is a contraction. ASD-STE100 allows none.`
  );

  for (const [pattern, approvedTerm] of STE_WORD_SUBSTITUTIONS) {
    flag(pattern, "ste-word", (hit) => `\`${hit}\` — write "${approvedTerm}".`);
  }

  for (const [pattern, approvedTerm] of STE_BANNED_MODALS) {
    flag(
      pattern,
      "ste-modal",
      (hit) => `\`${hit}\` — write "${approvedTerm}".`
    );
  }

  if (relativePath.split("/")[1] === GUIDES_FOLDER) {
    flag(
      ENV_VAR_OR_ENUM_NAME,
      "guides-audience",
      (hit) =>
        `\`${hit}\` is an environment variable or an enum value. It belongs in self-hosting/ or contributing/.`
    );
  }
};

const checkHeadings = (page: DocPage, report: Report) => {
  for (const heading of page.headings) {
    if (heading.text.trim().toLowerCase() === "overview") {
      report(
        "error",
        page.relativePath,
        lineAt(page.raw, heading.index),
        "no-overview",
        "no heading is called `Overview`. Name it after its subject."
      );
    }
  }
};

const isMeasurableProse = (block: string): boolean => {
  const trimmed = block.trim();

  if (trimmed === "" || trimmed.startsWith("#")) {
    return false;
  }

  return !MARKDOWN_TABLE_ROW.test(trimmed);
};

const listItemsOrWholeParagraph = (paragraph: string): string[] => {
  const lines = paragraph.split("\n");

  return lines.some((line) => LIST_ITEM.test(line)) ? lines : [paragraph];
};

const checkSentenceLength = (
  page: DocPage,
  unit: string,
  start: number,
  report: Report
) => {
  const sentences = unit
    .trim()
    .split(SENTENCE_SPLIT)
    .filter((sentence) => sentence.trim() !== "");

  for (const sentence of sentences) {
    const words = sentence.match(WORD)?.length ?? 0;

    if (words <= STE_INSTRUCTION_WORD_LIMIT) {
      continue;
    }

    report(
      words > STE_DESCRIPTION_WORD_LIMIT ? "error" : "warning",
      page.relativePath,
      lineAt(page.maskedProse, page.maskedProse.indexOf(sentence, start)),
      "ste-sentence",
      `${words} words in one sentence. The limit is ${STE_INSTRUCTION_WORD_LIMIT} for an instruction and ${STE_DESCRIPTION_WORD_LIMIT} for a description.`
    );
  }

  return sentences.length;
};

const checkSentences = (page: DocPage, report: Report) => {
  let cursor = 0;

  for (const paragraph of page.maskedProse.split(PARAGRAPH_SPLIT)) {
    const paragraphStart = page.maskedProse.indexOf(paragraph, cursor);
    cursor = paragraphStart + paragraph.length;
    const units = listItemsOrWholeParagraph(paragraph);
    let sentenceCount = 0;

    for (const unit of units) {
      if (!isMeasurableProse(unit)) {
        continue;
      }

      sentenceCount += checkSentenceLength(
        page,
        unit,
        page.maskedProse.indexOf(unit, paragraphStart),
        report
      );
    }

    if (units.length === 1 && sentenceCount > STE_PARAGRAPH_SENTENCE_LIMIT) {
      report(
        "warning",
        page.relativePath,
        lineAt(page.maskedProse, paragraphStart),
        "ste-paragraph",
        `${sentenceCount} sentences in one paragraph. ASD-STE100 allows ${STE_PARAGRAPH_SENTENCE_LIMIT}.`
      );
    }
  }
};

const checkAuthoredLanguage = (page: DocPage, report: Report) => {
  checkHeadings(page, report);
  checkPhrases(page, report);
  checkSentences(page, report);
};

const checkDuplicateAnchors = (page: DocPage, report: Report) => {
  const seen = new Set<string>();

  for (const heading of page.headings) {
    const slug = slugify(heading.text);

    if (seen.has(slug)) {
      report(
        "warning",
        page.relativePath,
        lineAt(page.raw, heading.index),
        "anchor",
        `\`${slug}\` is the anchor of two headings, so a link to it is ambiguous.`
      );
    }

    seen.add(slug);
  }
};

const checkVersions = async (
  pages: readonly DocPage[],
  metas: readonly MetaFile[],
  report: Report
) => {
  const entries = await readdir(CONTENT_DIR, { withFileTypes: true });
  const metaByFolder = new Map<string, MetaFile>();

  for (const meta of metas) {
    metaByFolder.set(meta.folder, meta);
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      if (
        PAGE_OR_META_FILE.test(entry.name) &&
        entry.name !== VERSION_LIST_FILE
      ) {
        report(
          "error",
          entry.name,
          1,
          "version",
          `\`${entry.name}\` sits outside every version. Move it into \`${NEXT_VERSION}/\`.`
        );
      }

      continue;
    }

    const file = join(CONTENT_DIR, entry.name, VERSION_LIST_FILE);

    if (!isVersionId(entry.name)) {
      report(
        "error",
        relative(CONTENT_DIR, file),
        1,
        "version",
        `\`${entry.name}\` is not a version. A folder under content/docs is \`${NEXT_VERSION}\` or \`X.Y\`.`
      );
      continue;
    }

    if (
      !pages.some((page) => page.relativePath === `${entry.name}/index.mdx`)
    ) {
      report(
        "error",
        relative(CONTENT_DIR, file),
        1,
        "version",
        `\`${entry.name}\` has no index.mdx, so the version dropdown has nowhere to land.`
      );
    }

    const meta = metaByFolder.get(entry.name);

    if (!meta) {
      report(
        "error",
        relative(CONTENT_DIR, file),
        1,
        "version",
        `\`${entry.name}\` has no meta.json.`
      );
      continue;
    }

    if (meta.root !== true) {
      report(
        "error",
        relative(CONTENT_DIR, meta.absolutePath),
        1,
        "version",
        'no `"root": true`, so the sidebar mixes every version and no dropdown appears.'
      );
    }

    if (meta.title !== entry.name) {
      report(
        "error",
        relative(CONTENT_DIR, meta.absolutePath),
        1,
        "version",
        `the title is \`${String(meta.title)}\`; the dropdown labels this version \`${entry.name}\`.`
      );
    }
  }
};

const strict = process.argv.includes("--strict");
const pages = await readPages(CONTENT_DIR, BASE_ROUTE);
const metas = await readMetaFiles(CONTENT_DIR);
const registeredComponents = new Set(Object.keys(getMDXComponents()));
const pageByUrl = new Map<string, DocPage>();

for (const page of pages) {
  pageByUrl.set(page.url, page);
}

if (pages.length === 0) {
  console.error(
    `No .mdx pages under ${CONTENT_DIR}. Run this from apps/fumadocs.`
  );
  process.exit(1);
}

for (const page of pages) {
  const report = reporterFor(rulesDisabledByPage(page.raw));

  checkFrontmatter(page, report);
  checkFences(page, report);
  checkComponents(page, registeredComponents, report);
  checkLinks(page, pageByUrl, report);

  if (versionOf(page.relativePath) === NEXT_VERSION) {
    checkAuthoredLanguage(page, report);
  } else {
    checkRepoLinksArePinned(page, report);
    checkVersionExamplesArePinned(page, report);
  }
}

const reportStructure = reporterFor(NO_DISABLED_RULES);

for (const meta of metas) {
  checkMeta(meta, pages, CONTENT_DIR, reportStructure);
}

await checkVersions(pages, metas, reportStructure);

for (const page of pages) {
  checkDuplicateAnchors(page, reportStructure);
}

findings.sort(
  (left, right) => left.file.localeCompare(right.file) || left.line - right.line
);

for (const [index, finding] of findings.entries()) {
  if (findings[index - 1]?.file !== finding.file) {
    console.log(`\n${CONTENT_DIR}/${finding.file}`);
  }

  const mark = finding.severity === "error" ? "error" : " warn";

  console.log(
    `  ${mark}  ${finding.line}:  ${finding.rule}  ${finding.message}`
  );
}

const errors = findings.filter(
  (finding) => finding.severity === "error"
).length;
const warnings = findings.length - errors;

console.log(
  `\n${pages.length} pages, ${metas.length} meta files: ${errors} errors, ${warnings} warnings.`
);

if (errors > 0 || (strict && warnings > 0)) {
  process.exit(1);
}
