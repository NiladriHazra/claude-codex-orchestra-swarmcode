import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig } from "../config/loader.js";
import { spawnProcess } from "../utils/process.js";
import { substituteTemplateArgs } from "../utils/template.js";

async function main() {
  const cwd = process.env["SWARMCODE_CWD"] || process.cwd();
  const config = await loadConfig(cwd);

  const mcpServer = new McpServer(
    { name: "swarmcode", version: "0.1.0" },
    { capabilities: { logging: {} } }
  );

  function log(level: "info" | "warning" | "error", message: string) {
    try {
      mcpServer.server.sendLoggingMessage({ level, data: message });
    } catch {
      process.stderr.write(`[swarmcode] ${message}\n`);
    }
  }

  for (const [agentName, agentConfig] of Object.entries(config.agents)) {
    if (!agentConfig.enabled) continue;

    const toolName = `delegate_to_${agentName.replace(/-/g, "_")}`;

    mcpServer.tool(
      toolName,
      `Delegate a task to ${agentConfig.displayName}. ${agentConfig.role}. Best for: ${agentConfig.capabilities.join(", ")}.`,
      {
        task: z.string().describe("Detailed task description with full context"),
      },
      async ({ task }) => {
        const args = substituteTemplateArgs(agentConfig.args, { prompt: task });

        try {
          log("info", `▶ Delegating to ${agentConfig.displayName}...`);
          process.stderr.write(`\n┌─ Swarmcode: Delegating to ${agentConfig.displayName}...\n│\n`);

          let lineCount = 0;
          let lastLogTime = Date.now();

          const result = await spawnProcess({
            command: agentConfig.command,
            args,
            cwd,
            timeout: 600000,
            onStdout: (chunk) => {
              for (const line of chunk.split("\n")) {
                if (line.trim()) {
                  lineCount++;
                  process.stderr.write(`│  ${line}\n`);
                  const now = Date.now();
                  if (now - lastLogTime > 3000) {
                    log("info", `[${agentConfig.displayName}] ${lineCount} lines... ${line.slice(0, 80)}`);
                    lastLogTime = now;
                  }
                }
              }
            },
            onStderr: (chunk) => {
              for (const line of chunk.split("\n")) {
                if (line.trim()) process.stderr.write(`│  ${line}\n`);
              }
            },
          });

          const output = result.stdout || result.stderr || "(no output)";
          const status = result.exitCode === 0 ? "completed successfully" : `failed (exit code ${result.exitCode})`;

          process.stderr.write(`│\n└─ ${agentConfig.displayName} ${status} (${lineCount} lines)\n\n`);
          log("info", `✓ ${agentConfig.displayName} ${status}`);

          return { content: [{ type: "text" as const, text: `[${agentConfig.displayName}] Task ${status}:\n\n${output}` }] };
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Unknown error";
          process.stderr.write(`│\n└─ ✗ ${agentConfig.displayName} error: ${errMsg}\n\n`);
          log("error", `✗ ${agentConfig.displayName} error: ${errMsg}`);
          return { content: [{ type: "text" as const, text: `[${agentConfig.displayName}] Error: ${errMsg}` }], isError: true };
        }
      }
    );
  }

  mcpServer.tool(
    "orchestra_agents",
    "List all available sub-agents, their capabilities, and roles.",
    {},
    async () => {
      const agentList = Object.entries(config.agents)
        .filter(([_, a]) => a.enabled)
        .map(([name, a]) => `- ${a.displayName} (delegate_to_${name.replace(/-/g, "_")}): ${a.role}\n  Capabilities: ${a.capabilities.join(", ")}`)
        .join("\n\n");

      return { content: [{ type: "text" as const, text: `Available Swarmcode Agents:\n\n${agentList}` }] };
    }
  );

  await mcpServer.connect(new StdioServerTransport());
}

main().catch((err) => {
  process.stderr.write(`Swarmcode MCP server error: ${err}\n`);
  process.exit(1);
});
