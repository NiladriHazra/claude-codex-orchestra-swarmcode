import type { Config } from "../config/schema.js";
import { formatEnabledAgentDetails } from "./orchestrator-agents.js";
import { buildOrchestratorPromptTemplate } from "./orchestrator-sections.js";

export function buildOrchestratorPrompt(config: Config): string {
  const agentDetails = formatEnabledAgentDetails(config.agents);
  return buildOrchestratorPromptTemplate(agentDetails);
}
