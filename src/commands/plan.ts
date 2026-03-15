import { Command } from "commander";
import { loadConfig } from "../config/loader.js";
import { orchestrate } from "../core/orchestrator.js";
import { logger } from "../output/logger.js";

export const planCommand = new Command("plan")
  .description("Show orchestration plan without executing (dry run)")
  .argument("<task>", "Task description")
  .action(async (task: string) => {
    try {
      const config = await loadConfig();
      await orchestrate(task, config, { dryRun: true });
    } catch (err) {
      logger.error(
        err instanceof Error ? err.message : "Unknown error occurred"
      );
      process.exit(1);
    }
  });
