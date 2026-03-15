import type { Config } from "./schema.js";

export const DEFAULT_CONFIG: Config = {
  version: 1,
  orchestrator: {
    provider: "claude-code",
    command: "claude",
    args: ["-p", "{{prompt}}", "--output-format", "text", "--verbose"],
  },
  agents: {
    "codex-cli": {
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
    },
  },
  confirm: false,
  output: {
    showPhases: true,
    showDelegation: true,
  },
};
