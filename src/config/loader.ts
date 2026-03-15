import { cosmiconfig } from "cosmiconfig";
import { stringify as yamlStringify } from "yaml";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ConfigSchema, type Config } from "./schema.js";
import { DEFAULT_CONFIG } from "./defaults.js";

const explorer = cosmiconfig("swarmcode", {
  searchPlaces: [
    ".swarmcode.yml",
    ".swarmcode.yaml",
    ".swarmcode.json",
    ".swarmcoderc",
    ".swarmcoderc.yml",
    ".swarmcoderc.yaml",
    ".swarmcoderc.json",
  ],
});

export async function loadConfig(searchFrom?: string): Promise<Config> {
  const result = await explorer.search(searchFrom);
  if (!result || result.isEmpty) return DEFAULT_CONFIG;
  return ConfigSchema.parse(result.config);
}

export async function writeConfig(
  config: Config,
  dir: string = process.cwd()
): Promise<string> {
  const filePath = join(dir, ".swarmcode.yml");
  const content = yamlStringify(config, { indent: 2 });
  await writeFile(filePath, content, "utf-8");
  return filePath;
}
