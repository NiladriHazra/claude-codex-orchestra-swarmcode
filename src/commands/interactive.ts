import { spawn, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { writeFile, unlink, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../config/loader.js";
import { logger } from "../output/logger.js";
import { detectCli } from "../utils/detect.js";
import { buildOrchestratorPrompt } from "../prompts/orchestrator.js";
import chalk from "chalk";
import type { Config } from "../config/schema.js";

function buildOrchArgs(
  command: string,
  mcpConfigPath: string,
  systemPrompt: string,
  model?: string
): string[] {
  switch (command) {
    case "claude":
      return [
        "--mcp-config",
        mcpConfigPath,
        "--append-system-prompt",
        systemPrompt,
        "--allowedTools",
        "Read,Grep,Glob,Bash,mcp__swarmcode__orchestra_agents",
        ...(model ? ["--model", model] : []),
      ];
    case "codex":
      return [...(model ? ["-c", `model="${model}"`] : [])];
    case "gemini":
      return [...(model ? ["-m", model] : [])];
    case "kimi":
      return [...(model ? ["--model", model] : [])];
    case "opencode":
      return [...(model ? ["-m", model] : [])];
    default:
      return [];
  }
}

function registerMcpWithCodex(mcpServerPath: string, cwd: string): void {
  try {
    try {
      execFileSync("codex", ["mcp", "remove", "swarmcode"], { stdio: "ignore" });
    } catch {}

    execFileSync(
      "codex",
      ["mcp", "add", "swarmcode", "--env", `SWARMCODE_CWD=${cwd}`, "--", "node", mcpServerPath],
      { stdio: "ignore" }
    );
  } catch (err) {
    logger.warn(`Could not register MCP with Codex: ${err instanceof Error ? err.message : err}`);
  }
}

async function writeCodexInstructions(systemPrompt: string, cwd: string): Promise<string> {
  const filePath = join(cwd, "CODEX.md");
  if (!existsSync(filePath)) {
    await writeFile(filePath, `<!-- swarmcode-managed -->\n${systemPrompt}\n`);
    return filePath;
  }
  return "";
}

function buildMcpConfigJson(mcpServerPath: string, cwd: string): string {
  return JSON.stringify({
    mcpServers: {
      swarmcode: {
        command: "node",
        args: [mcpServerPath],
        cwd,
        env: { SWARMCODE_CWD: cwd },
      },
    },
  });
}

export async function startInteractive(): Promise<void> {
  let config: Config;
  try {
    config = await loadConfig();
  } catch {
    logger.error("Failed to load config. Run 'swarmcode init' first.");
    process.exit(1);
  }

  const orchCommand = config.orchestrator.command;

  const orchCheck = await detectCli(orchCommand);
  if (!orchCheck.available) {
    logger.error(`Orchestrator CLI '${orchCommand}' not found. Run 'swarmcode init'.`);
    process.exit(1);
  }

  const enabledAgents: string[] = [];
  for (const [_, agent] of Object.entries(config.agents)) {
    if (!agent.enabled) continue;
    const check = await detectCli(agent.command);
    if (check.available) {
      enabledAgents.push(agent.displayName);
    } else {
      logger.warn(`Agent '${agent.displayName}' (${agent.command}) not found — will be unavailable`);
      agent.enabled = false;
    }
  }

  const mcpServerPath = getMcpServerPath();
  const cwd = process.cwd();
  const systemPrompt = buildOrchestratorPrompt(config);
  const cleanupPaths: string[] = [];

  let orchArgs: string[];

  if (orchCommand === "claude") {
    const tmpDir = await mkdtemp(join(tmpdir(), "swarmcode-"));
    const mcpConfigPath = join(tmpDir, "mcp.json");
    await writeFile(mcpConfigPath, buildMcpConfigJson(mcpServerPath, cwd));
    cleanupPaths.push(mcpConfigPath);
    orchArgs = buildOrchArgs(orchCommand, mcpConfigPath, systemPrompt, config.orchestrator.model);
  } else if (orchCommand === "codex") {
    logger.info("Registering swarmcode MCP server with Codex...");
    registerMcpWithCodex(mcpServerPath, cwd);
    const codexMdPath = await writeCodexInstructions(systemPrompt, cwd);
    if (codexMdPath) cleanupPaths.push(codexMdPath);
    orchArgs = buildOrchArgs(orchCommand, "", systemPrompt, config.orchestrator.model);
  } else {
    const tmpDir = await mkdtemp(join(tmpdir(), "swarmcode-"));
    const mcpConfigPath = join(tmpDir, "mcp.json");
    await writeFile(mcpConfigPath, buildMcpConfigJson(mcpServerPath, cwd));
    cleanupPaths.push(mcpConfigPath);
    orchArgs = buildOrchArgs(orchCommand, mcpConfigPath, systemPrompt, config.orchestrator.model);

    if (orchCommand === "gemini") {
      const geminiMdPath = join(cwd, "GEMINI.md");
      if (!existsSync(geminiMdPath)) {
        await writeFile(geminiMdPath, `<!-- swarmcode-managed -->\n${systemPrompt}\n`);
        cleanupPaths.push(geminiMdPath);
      }
    }
  }

  console.log(chalk.bold.cyan("\n  🐝 Swarmcode"));
  console.log(chalk.dim(`  Brain: ${orchCommand} | Agents: ${enabledAgents.join(", ") || "none"}`));
  console.log(chalk.dim(`  Launching ${orchCommand} with agent tools...\n`));

  const child = spawn(orchCommand, orchArgs, {
    stdio: "inherit",
    cwd,
    env: process.env,
  });

  const cleanup = async () => {
    for (const p of cleanupPaths) {
      try { await unlink(p); } catch {}
    }
    if (orchCommand === "codex") {
      try { execFileSync("codex", ["mcp", "remove", "swarmcode"], { stdio: "ignore" }); } catch {}
    }
  };

  child.on("close", async (code) => { await cleanup(); process.exit(code ?? 0); });
  child.on("error", async (err) => { await cleanup(); logger.error(`Failed to start ${orchCommand}: ${err.message}`); process.exit(1); });
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
}

function getMcpServerPath(): string {
  const thisFile = fileURLToPath(import.meta.url);
  const thisDir = join(thisFile, "..");

  const sameLevelPath = join(thisDir, "mcp", "server.js");
  if (existsSync(sameLevelPath)) return sameLevelPath;

  const fromBinPath = join(thisDir, "..", "mcp", "server.js");
  if (existsSync(fromBinPath)) return fromBinPath;

  const devPath = join(thisDir, "..", "mcp", "server.ts");
  if (existsSync(devPath)) return devPath;

  const rootPath = join(thisDir, "..", "..", "dist", "mcp", "server.js");
  if (existsSync(rootPath)) return rootPath;

  throw new Error(`Could not find swarmcode MCP server. Searched:\n  ${sameLevelPath}\n  ${fromBinPath}\n  ${rootPath}`);
}
