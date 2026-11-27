import { afterEach, describe, expect, it } from "bun:test";

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { readSecretFile, resolveFileSecrets } from "./file-secrets";

const tempFiles: string[] = [];

afterEach(() => {
  for (const file of tempFiles.splice(0)) {
    rmSync(file, { force: true });
  }
});

const secretFile = (content: string): string => {
  const file = join(mkdtempSync(join(tmpdir(), "freenary-secret-")), "secret.txt");
  writeFileSync(file, content);
  tempFiles.push(file);
  return file;
};

describe("resolveFileSecrets", () => {
  it("reads the value from the file and trims the trailing newline", () => {
    const source: NodeJS.ProcessEnv = {
      BETTER_AUTH_SECRET_FILE: secretFile("from-a-file\n"),
    };

    resolveFileSecrets(["BETTER_AUTH_SECRET"], source);

    expect(source.BETTER_AUTH_SECRET).toBe("from-a-file");
  });

  it("leaves the value alone when no _FILE variable is set", () => {
    const source: NodeJS.ProcessEnv = { DATABASE_URL: "postgres://localhost" };

    resolveFileSecrets(["DATABASE_URL"], source);

    expect(source.DATABASE_URL).toBe("postgres://localhost");
  });

  it("refuses to start when both the variable and its _FILE form are set", () => {
    const source: NodeJS.ProcessEnv = {
      BETTER_AUTH_SECRET: "plain-value",
      BETTER_AUTH_SECRET_FILE: secretFile("from-a-file\n"),
    };

    expect(() => resolveFileSecrets(["BETTER_AUTH_SECRET"], source)).toThrow(
      "BETTER_AUTH_SECRET and BETTER_AUTH_SECRET_FILE are both set; set only one"
    );
  });

  it("fails with a clear message when the file cannot be read", () => {
    const source: NodeJS.ProcessEnv = {
      DATABASE_URL_FILE: join(tmpdir(), "freenary-missing-secret.txt"),
    };

    expect(() => resolveFileSecrets(["DATABASE_URL"], source)).toThrow(
      "Cannot read DATABASE_URL from DATABASE_URL_FILE"
    );
  });
});

describe("readSecretFile", () => {
  it("keeps inner whitespace and only trims trailing newlines", () => {
    expect(readSecretFile(secretFile("a b\r\n"), "SOME_SECRET")).toBe("a b");
  });
});
