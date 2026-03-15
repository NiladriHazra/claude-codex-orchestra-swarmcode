import { Command } from "commander";
import { loadConfig } from "../config/loader.js";
import { healthCheckCli } from "../utils/detect.js";
import { logger } from "../output/logger.js";
import chalk from "chalk";

export const providersCommand = new Command("providers")
  .description("List configured agents and orchestrator")
  .option("--test", "Run health checks on each agent")
  .action(async (opts) => {
    try {
      const config = await loadConfig();

      // Show orchestrator
      console.log(chalk.bold.cyan("\nOrchestrator:"));

      if (opts.test) {
        const h = await healthCheckCli(config.orchestrator.command);
        const status = !h.installed
          ? chalk.red("✗ not installed")
          : h.configured
            ? chalk.green(`✓ ready ${h.version ?? ""}`)
            : chalk.yellow(`⚠ ${h.error} ${h.version ?? ""}`);
        console.log(`  ${chalk.bold(config.orchestrator.command)} — ${status}`);
      } else {
        console.log(`  ${chalk.bold(config.orchestrator.command)}`);
        if (config.orchestrator.model) {
          console.log(`    Model: ${config.orchestrator.model}`);
        }
      }

      // Show agents
      console.log(chalk.bold.cyan("\nSub-agents:"));
      for (const [name, agentConfig] of Object.entries(config.agents)) {
        const enabled = agentConfig.enabled
          ? chalk.green("enabled")
          : chalk.dim("disabled");

        if (opts.test) {
          const h = await healthCheckCli(agentConfig.command);
          const status = !h.installed
            ? chalk.red("✗ not installed")
            : h.configured
              ? chalk.green(`✓ ready ${h.version ?? ""}`)
              : chalk.yellow(`⚠ ${h.error} ${h.version ?? ""}`);
          console.log(
            `  ${chalk.bold(agentConfig.displayName)} (${name}) [${enabled}] — ${status}`
          );
        } else {
          console.log(
            `  ${chalk.bold(agentConfig.displayName)} (${name}) [${enabled}]`
          );
          console.log(`    Role: ${agentConfig.role}`);
          console.log(
            `    Capabilities: ${agentConfig.capabilities.join(", ")}`
          );
        }
      }
      console.log();
    } catch (err) {
      logger.error(
        err instanceof Error ? err.message : "Unknown error occurred"
      );
      process.exit(1);
    }
  });
