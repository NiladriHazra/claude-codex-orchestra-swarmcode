import type { AgentConfig } from "../config/schema.js";

function formatAgentDetail(name: string, agent: AgentConfig): string {
  const args = agent.args
    .map((arg) => (arg === "{{prompt}}" ? '"<TASK>"' : arg))
    .join(" ");

  return `### ${agent.displayName} (${name})
  Run via Bash: ${agent.command} ${args}
  Role: ${agent.role}
  Best for: ${agent.capabilities.join(", ")}`;
}

export function formatEnabledAgentDetails(
  agents: Record<string, AgentConfig>
): string {
  return Object.entries(agents)
    .filter(([, agent]) => agent.enabled)
    .map(([name, agent]) => formatAgentDetail(name, agent))
    .join("\n\n");
}
