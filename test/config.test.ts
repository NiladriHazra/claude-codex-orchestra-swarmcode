import { describe, it, expect } from "vitest";
import { ConfigSchema } from "../src/config/schema.js";
import { DEFAULT_CONFIG } from "../src/config/defaults.js";

describe("ConfigSchema", () => {
  it("validates the default config", () => {
    const result = ConfigSchema.parse(DEFAULT_CONFIG);
    expect(result.version).toBe(1);
    expect(result.orchestrator.provider).toBe("claude-code");
  });

  it("applies defaults for minimal config", () => {
    const result = ConfigSchema.parse({
      agents: {
        "codex-cli": {
          displayName: "Codex",
          command: "codex",
          args: ["exec", "{{prompt}}"],
          capabilities: ["implementation"],
          role: "Implementer",
        },
      },
    });
    expect(result.version).toBe(1);
    expect(result.orchestrator.command).toBe("claude");
    expect(result.confirm).toBe(false);
    expect(result.output.showPhases).toBe(true);
    expect(result.agents["codex-cli"].streamFormat).toBe("text");
    expect(result.agents["codex-cli"].enabled).toBe(true);
  });

  it("rejects config with no agents", () => {
    // agents is required, so empty object should still work
    const result = ConfigSchema.parse({ agents: {} });
    expect(Object.keys(result.agents)).toHaveLength(0);
  });

  it("validates agent config fields", () => {
    expect(() =>
      ConfigSchema.parse({
        agents: {
          test: {
            displayName: "Test",
            command: "test",
            // missing required fields: args, capabilities, role
          },
        },
      })
    ).toThrow();
  });
});
