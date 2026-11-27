import { readFileSync } from "node:fs";

/**
 * Read a secret from a file named by `<NAME>_FILE`, the Docker secrets
 * convention. The file content is used as-is apart from trailing newlines,
 * so a value written with a trailing newline (as `echo` does) is not changed
 * by it.
 */
export const readSecretFile = (path: string, name: string): string => {
  try {
    return readFileSync(path, "utf8").replace(/[\r\n]+$/u, "");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot read ${name} from ${name}_FILE (${path}): ${detail}`);
  }
};

/**
 * Resolve `<NAME>_FILE` variables into `<NAME>` before the environment is
 * validated. Setting both `<NAME>` and `<NAME>_FILE` is an error, so a
 * deployment cannot silently pick one of two different values.
 */
export const resolveFileSecrets = (
  names: readonly string[],
  source: NodeJS.ProcessEnv = process.env
): void => {
  for (const name of names) {
    const filePath = source[`${name}_FILE`];
    if (!filePath) {
      continue;
    }
    if (source[name]) {
      throw new Error(`${name} and ${name}_FILE are both set; set only one`);
    }
    source[name] = readSecretFile(filePath, name);
  }
};
