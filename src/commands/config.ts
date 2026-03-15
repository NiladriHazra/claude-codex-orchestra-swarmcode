import { Command } from "commander";
import { loadConfig } from "../config/loader.js";
import { logger } from "../output/logger.js";
import { stringify as yamlStringify } from "yaml";

export const configCommand = new Command("config")
  .description("View configuration")
  .argument("[key]", "Config key to view (dot-notation, e.g. orchestrator.command)")
  .action(async (key?: string) => {
    try {
      const config = await loadConfig();

      if (!key) {
        console.log(yamlStringify(config, { indent: 2 }));
        return;
      }

      const parts = key.split(".");
      let current: unknown = config;
      for (const part of parts) {
        if (current && typeof current === "object" && part in current) {
          current = (current as Record<string, unknown>)[part];
        } else {
          logger.error(`Config key '${key}' not found`);
          process.exit(1);
        }
      }

      if (typeof current === "object") {
        console.log(yamlStringify(current, { indent: 2 }));
      } else {
        console.log(String(current));
      }
    } catch (err) {
      logger.error(
        err instanceof Error ? err.message : "Unknown error occurred"
      );
      process.exit(1);
    }
  });
