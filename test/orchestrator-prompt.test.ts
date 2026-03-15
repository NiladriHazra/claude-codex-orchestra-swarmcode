import { describe, expect, it } from "vitest";
import type { Config } from "../src/config/schema.js";
import { buildOrchestratorPrompt } from "../src/prompts/orchestrator.js";

const testConfig: Config = {
  version: 1,
  orchestrator: {
    provider: "claude-code",
    command: "claude",
    args: ["-p", "{{prompt}}"],
  },
  agents: {
    "codex-cli": {
      displayName: "Codex CLI",
      command: "codex",
      args: ["exec", "{{prompt}}", "--json"],
      capabilities: ["typescript", "tests"],
      role: "Implementation and fixes",
      streamFormat: "text",
      enabled: true,
    },
    gemini: {
      displayName: "Gemini CLI",
      command: "gemini",
      args: ["-p", "{{prompt}}"],
      capabilities: ["research"],
      role: "Analysis",
      streamFormat: "text",
      enabled: false,
    },
    kimi: {
      displayName: "Kimi Code",
      command: "kimi",
      args: ["--print", "-p", "{{prompt}}"],
      capabilities: ["refactoring", "tests"],
      role: "Focused code generation",
      streamFormat: "text",
      enabled: true,
    },
  },
  confirm: false,
  output: { showPhases: true, showDelegation: true },
};

describe("buildOrchestratorPrompt", () => {
  const prompt = buildOrchestratorPrompt(testConfig);

  it("includes enabled agents and excludes disabled ones", () => {
    expect(prompt).toContain("Codex CLI (codex-cli)");
    expect(prompt).toContain("Kimi Code (kimi)");
    expect(prompt).not.toContain("Gemini CLI (gemini)");
  });

  it("includes agent run commands", () => {
    expect(prompt).toContain('codex exec "<TASK>" --json');
    expect(prompt).toContain('kimi --print -p "<TASK>"');
  });

  it("includes wave-based execution section", () => {
    expect(prompt).toContain("WAVE-BASED PARALLEL EXECUTION");
    expect(prompt).toContain("Wave 1");
    expect(prompt).toContain("Wave 2");
    expect(prompt).toContain("File conflict rule");
  });

  it("includes plan-check-execute loop", () => {
    expect(prompt).toContain("PLAN");
    expect(prompt).toContain("CHECK");
    expect(prompt).toContain("EXECUTE");
    expect(prompt).toContain("self-validate");
  });

  it("includes atomic commits section", () => {
    expect(prompt).toContain("ATOMIC COMMITS");
    expect(prompt).toContain("git add -A");
    expect(prompt).toContain("git diff --cached");
  });

  it("includes goal-backward verification", () => {
    expect(prompt).toContain("GOAL-BACKWARD VERIFICATION");
    expect(prompt).toContain("Exists");
    expect(prompt).toContain("Substantive");
    expect(prompt).toContain("Wired");
    expect(prompt).toContain("Runs");
  });

  it("includes context isolation guidance", () => {
    expect(prompt).toContain("CONTEXT ISOLATION");
    expect(prompt).toContain("FRESH, FOCUSED prompt");
  });

  it("includes deviation autonomy rules", () => {
    expect(prompt).toContain("DEVIATION AUTONOMY");
    expect(prompt).toContain("Auto-fix");
    expect(prompt).toContain("Escalate");
  });

  it("includes critical rules", () => {
    expect(prompt).toContain("NEVER use Write or Edit");
    expect(prompt).toContain("MAXIMIZE PARALLELISM");
  });
});
