import { z } from "zod";

export const AgentConfigSchema = z.object({
  displayName: z.string(),
  command: z.string(),
  args: z.array(z.string()),
  capabilities: z.array(z.string()),
  role: z.string(),
  streamFormat: z.enum(["stream-json", "line", "text"]).default("text"),
  enabled: z.boolean().default(true),
});

export const OrchestratorConfigSchema = z.object({
  provider: z.string().default("claude-code"),
  command: z.string().default("claude"),
  args: z
    .array(z.string())
    .default(["-p", "{{prompt}}", "--output-format", "text", "--verbose"]),
  model: z.string().optional(),
});

export const OutputConfigSchema = z.object({
  showPhases: z.boolean().default(true),
  showDelegation: z.boolean().default(true),
});

export const ConfigSchema = z.object({
  version: z.number().default(1),
  orchestrator: OrchestratorConfigSchema.default({
    provider: "claude-code",
    command: "claude",
    args: ["-p", "{{prompt}}", "--output-format", "text", "--verbose"],
  }),
  agents: z.record(z.string(), AgentConfigSchema),
  confirm: z.boolean().default(false),
  output: OutputConfigSchema.default({
    showPhases: true,
    showDelegation: true,
  }),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type OrchestratorConfig = z.infer<typeof OrchestratorConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;
