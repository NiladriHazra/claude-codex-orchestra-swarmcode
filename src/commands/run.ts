import { Command } from "commander";
import { loadConfig } from "../config/loader.js";
import { orchestrate } from "../core/orchestrator.js";
import { logger } from "../output/logger.js";

export const runCommand = new Command("run")
  .description("Run a task with multi-agent orchestration")
  .argument("<task>", "Task description")
  .option("--confirm", "Ask for confirmation before each delegation")
  .option("--dry-run", "Show orchestration setup without executing")
  .action(async (task: string, opts) => {
    try {
      const config = await loadConfig();
      const shouldConfirm = opts.confirm || config.confirm;

      await orchestrate(task, config, {
        confirm: shouldConfirm,
        dryRun: opts.dryRun,
      });
    } catch (err) {
      if ((err as Error).name === "ExitPromptError") return;
      logger.error(
        err instanceof Error ? err.message : "Unknown error occurred"
      );
      process.exit(1);
    }
  });
