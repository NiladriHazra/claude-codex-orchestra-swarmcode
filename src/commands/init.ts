import { Command } from "commander";
import { checkbox, confirm, input, select } from "@inquirer/prompts";
import { healthCheckCli, type HealthCheckResult } from "../utils/detect.js";
import { writeConfig } from "../config/loader.js";
import { logger } from "../output/logger.js";
import type { Config, AgentConfig } from "../config/schema.js";
import chalk from "chalk";

interface KnownAgent {
  name: string;
  command: string;
  defaultAgent: () => AgentConfig;
}

const KNOWN_AGENTS: KnownAgent[] = [
  {
    name: "Claude Code",
    command: "claude",
    defaultAgent: () => ({
      displayName: "Claude Code",
      command: "claude",
      args: ["-p", "{{prompt}}", "--output-format", "text", "--verbose"],
      capabilities: [
        "implementation",
        "code-writing",
        "bug-fixing",
        "refactoring",
        "file-operations",
        "research",
        "testing",
      ],
      role: "Claude Code agent — Anthropic's coding CLI for implementation, analysis, and debugging",
      streamFormat: "text",
      enabled: true,
    }),
  },
  {
    name: "Codex CLI",
    command: "codex",
    defaultAgent: () => ({
      displayName: "Codex CLI",
      command: "codex",
      args: ["exec", "{{prompt}}", "-a", "on-request", "--sandbox", "danger-full-access", "-C", "."],
      capabilities: [
        "implementation",
        "code-writing",
        "bug-fixing",
        "refactoring",
        "file-operations",
        "testing",
      ],
      role: "Code implementer — writes, edits, and fixes code in a sandboxed environment (OpenAI)",
      streamFormat: "text",
      enabled: true,
    }),
  },
  {
    name: "Gemini CLI",
    command: "gemini",
    defaultAgent: () => ({
      displayName: "Gemini CLI",
      command: "gemini",
      args: ["-p", "{{prompt}}"],
      capabilities: [
        "implementation",
        "code-writing",
        "research",
        "bug-fixing",
        "refactoring",
      ],
      role: "Google Gemini coding agent — code generation, research, and analysis",
      streamFormat: "text",
      enabled: true,
    }),
  },
  {
    name: "Kimi Code",
    command: "kimi",
    defaultAgent: () => ({
      displayName: "Kimi Code",
      command: "kimi",
      args: ["--print", "-p", "{{prompt}}"],
      capabilities: [
        "implementation",
        "code-writing",
        "bug-fixing",
        "refactoring",
        "file-operations",
      ],
      role: "Kimi coding agent — code implementation and file operations (Moonshot AI)",
      streamFormat: "text",
      enabled: true,
    }),
  },
  {
    name: "Open Code",
    command: "opencode",
    defaultAgent: () => ({
      displayName: "Open Code",
      command: "opencode",
      args: ["run", "{{prompt}}"],
      capabilities: [
        "implementation",
        "code-writing",
        "bug-fixing",
        "refactoring",
        "file-operations",
      ],
      role: "Open Code agent — multi-model coding assistant",
      streamFormat: "text",
      enabled: true,
    }),
  },
  {
    name: "Aider",
    command: "aider",
    defaultAgent: () => ({
      displayName: "Aider",
      command: "aider",
      args: ["--message", "{{prompt}}", "--yes"],
      capabilities: [
        "implementation",
        "code-writing",
        "bug-fixing",
        "refactoring",
      ],
      role: "AI pair programming — edits code directly with git integration",
      streamFormat: "text",
      enabled: true,
    }),
  },
  {
    name: "GitHub Copilot CLI",
    command: "copilot",
    defaultAgent: () => ({
      displayName: "GitHub Copilot",
      command: "copilot",
      args: ["--prompt", "{{prompt}}"],
      capabilities: ["code-writing", "implementation"],
      role: "GitHub Copilot CLI — code suggestions and generation",
      streamFormat: "text",
      enabled: true,
    }),
  },
  {
    name: "Ollama",
    command: "ollama",
    defaultAgent: () => ({
      displayName: "Ollama",
      command: "ollama",
      args: ["run", "codellama", "{{prompt}}"],
      capabilities: ["implementation", "code-writing"],
      role: "Local LLM via Ollama — private, offline code generation",
      streamFormat: "text",
      enabled: true,
    }),
  },
];

// CLIs that can serve as orchestrator (brain)
const ORCHESTRATOR_CLIS = [
  { name: "Claude Code", command: "claude" },
  { name: "Codex CLI", command: "codex" },
  { name: "Gemini CLI", command: "gemini" },
  { name: "Kimi Code", command: "kimi" },
  { name: "Open Code", command: "opencode" },
];

function formatHealthStatus(result: HealthCheckResult): string {
  if (!result.installed) {
    return chalk.dim("not installed");
  }
  const ver = result.version ? chalk.dim(` (${result.version})`) : "";
  if (result.configured) {
    return chalk.green(`✓ ready${ver}`);
  }
  return chalk.yellow(`⚠ installed but: ${result.error}${ver}`);
}

export const initCommand = new Command("init")
  .description("Interactive setup wizard")
  .action(async () => {
    try {
      console.log(chalk.bold.cyan("\n  Swarmcode Setup\n"));

      // 1. Scan and health-check ALL CLIs
      logger.info("Scanning and verifying AI coding CLIs...\n");

      const allCommands = [
        ...new Set([
          ...ORCHESTRATOR_CLIS.map((o) => o.command),
          ...KNOWN_AGENTS.map((a) => a.command),
        ]),
      ];

      // Run health checks in parallel
      const healthResults: Record<string, HealthCheckResult> = {};
      await Promise.all(
        allCommands.map(async (cmd) => {
          process.stdout.write(chalk.dim(`  checking ${cmd}...`));
          healthResults[cmd] = await healthCheckCli(cmd);
          // Clear the "checking" line and write result
          process.stdout.write(
            `\r  ${chalk.bold(cmd)}: ${formatHealthStatus(healthResults[cmd])}          \n`
          );
        })
      );

      // 2. Pick orchestrator — only show ones that are fully configured
      console.log();
      const readyOrchestrators = ORCHESTRATOR_CLIS.filter(
        (o) => healthResults[o.command]?.installed
      );
      const configuredOrchestrators = ORCHESTRATOR_CLIS.filter(
        (o) => healthResults[o.command]?.configured
      );

      if (readyOrchestrators.length === 0) {
        logger.error(
          "No orchestrator CLI found! Install at least one of: claude, codex, gemini, kimi, opencode"
        );
        return;
      }

      let orchestratorCommand: string;
      if (configuredOrchestrators.length === 1) {
        orchestratorCommand = configuredOrchestrators[0].command;
        logger.success(
          `Using ${configuredOrchestrators[0].name} as orchestrator (only one ready)`
        );
      } else {
        orchestratorCommand = await select({
          message:
            "Which CLI should be the orchestrator (the brain that plans and delegates)?",
          choices: readyOrchestrators.map((o) => {
            const h = healthResults[o.command];
            const status = h?.configured
              ? chalk.green("ready")
              : chalk.yellow("needs setup");
            return {
              name: `${o.name} (${o.command}) [${status}]`,
              value: o.command,
            };
          }),
        });
      }

      // Warn if orchestrator isn't fully configured
      const orchHealth = healthResults[orchestratorCommand];
      if (orchHealth && !orchHealth.configured) {
        logger.warn(
          `${orchestratorCommand} is installed but not fully configured: ${orchHealth.error}`
        );
        const continueAnyway = await confirm({
          message: "Continue anyway?",
          default: true,
        });
        if (!continueAnyway) return;
      }

      const orchestratorArgs: Record<string, string[]> = {
        claude: ["-p", "{{prompt}}", "--output-format", "text", "--verbose"],
        codex: ["exec", "{{prompt}}", "--full-auto"],
        gemini: ["-p", "{{prompt}}"],
        kimi: ["--print", "-p", "{{prompt}}"],
        opencode: ["run", "{{prompt}}"],
      };

      // 3. Pick sub-agents
      console.log();
      const availableAgents = KNOWN_AGENTS.filter(
        (a) => a.command !== orchestratorCommand
      );

      const enabledAgents = await checkbox({
        message: "Which CLIs should be available as sub-agents?",
        choices: availableAgents.map((a) => {
          const h = healthResults[a.command];
          const status = !h?.installed
            ? chalk.dim("not installed")
            : h.configured
              ? chalk.green("ready")
              : chalk.yellow("needs setup");
          return {
            name: `${a.name} (${a.command}) [${status}]`,
            value: a,
            checked: h?.configured ?? false,
          };
        }),
      });

      // Warn about agents that aren't configured
      const unconfiguredAgents = enabledAgents.filter(
        (a) => !healthResults[a.command]?.configured
      );
      if (unconfiguredAgents.length > 0) {
        console.log();
        for (const a of unconfiguredAgents) {
          const h = healthResults[a.command];
          if (!h?.installed) {
            logger.warn(
              `${a.name} (${a.command}) is not installed — will be unavailable until installed`
            );
          } else {
            logger.warn(
              `${a.name} (${a.command}): ${h?.error ?? "not configured"}`
            );
          }
        }
      }

      // 4. Custom agent option
      const addCustom = await confirm({
        message: "Add a custom CLI agent?",
        default: false,
      });

      const agents: Record<string, AgentConfig> = {};

      for (const agent of enabledAgents) {
        const key =
          agent.command === "codex"
            ? "codex-cli"
            : agent.command === "claude"
              ? "claude-code"
              : agent.command;
        agents[key] = agent.defaultAgent();
      }

      if (addCustom) {
        const customName = await input({
          message: "Agent name (e.g., my-model):",
        });
        const customCommand = await input({
          message: "CLI command:",
        });
        const customArgs = await input({
          message:
            'Args (use {{prompt}} for task), e.g.: run --prompt "{{prompt}}"',
        });
        const customRole = await input({
          message: "Role description:",
          default: "Custom coding agent",
        });

        agents[customName] = {
          displayName: customName,
          command: customCommand,
          args: customArgs.split(/\s+/),
          capabilities: ["implementation", "code-writing"],
          role: customRole,
          streamFormat: "text",
          enabled: true,
        };
      }

      // 5. Confirmation preference
      console.log();
      const confirmDelegation = await confirm({
        message: "Require confirmation before delegating to sub-agents?",
        default: false,
      });

      // 6. Build and write config
      const config: Config = {
        version: 1,
        orchestrator: {
          provider: "claude-code",
          command: orchestratorCommand,
          args: orchestratorArgs[orchestratorCommand] ?? ["{{prompt}}"],
        },
        agents,
        confirm: confirmDelegation,
        output: {
          showPhases: true,
          showDelegation: true,
        },
      };

      const filePath = await writeConfig(config);

      // 7. Final summary
      console.log();
      logger.success(`Config written to ${filePath}\n`);

      const orchName =
        ORCHESTRATOR_CLIS.find((o) => o.command === orchestratorCommand)
          ?.name ?? orchestratorCommand;

      console.log(chalk.bold("  Setup Summary:\n"));
      console.log(
        `  Orchestrator: ${chalk.cyan(orchName)} ${orchHealth?.configured ? chalk.green("✓") : chalk.yellow("⚠")}`
      );

      for (const [key, agent] of Object.entries(agents)) {
        const h = healthResults[agent.command];
        const status = h?.configured
          ? chalk.green("✓")
          : h?.installed
            ? chalk.yellow("⚠")
            : chalk.red("✗");
        console.log(`  Sub-agent:    ${chalk.cyan(agent.displayName)} ${status}`);
      }

      console.log(chalk.bold("\n  Start orchestra:\n"));
      console.log(
        `  ${chalk.cyan("orchestra")}              ${chalk.dim("# interactive mode")}`
      );
      console.log(
        `  ${chalk.cyan('orchestra run "task"')}   ${chalk.dim("# one-shot mode")}`
      );
      console.log();
    } catch (err) {
      if ((err as Error).name === "ExitPromptError") return;
      logger.error(
        err instanceof Error ? err.message : "Unknown error occurred"
      );
      process.exit(1);
    }
  });
