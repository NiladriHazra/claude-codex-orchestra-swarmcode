import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG } from "../src/config/defaults.js";

interface DelegationBlock {
  agent: string;
  task: string;
}

function parseDelegations(output: string): {
  textBefore: string;
  delegations: DelegationBlock[];
  textAfter: string;
} {
  const delegateRegex = /```delegate\s*\n([\s\S]*?)```/g;
  const delegations: DelegationBlock[] = [];
  let firstMatchIndex: number | undefined;
  let lastMatchEnd = 0;
  let match: RegExpExecArray | null;

  while ((match = delegateRegex.exec(output)) !== null) {
    if (firstMatchIndex === undefined) {
      firstMatchIndex = match.index;
    }
    lastMatchEnd = match.index + match[0].length;

    const block = match[1];
    const agentMatch = block.match(/^agent:\s*(.+)$/m);
    const taskMatch = block.match(/^task:\s*([\s\S]+?)$/m);

    if (agentMatch && taskMatch) {
      delegations.push({
        agent: agentMatch[1].trim(),
        task: taskMatch[1].trim(),
      });
    }
  }

  if (delegations.length === 0) {
    return { textBefore: output, delegations: [], textAfter: "" };
  }

  return {
    textBefore: output.slice(0, firstMatchIndex).trim(),
    delegations,
    textAfter: output.slice(lastMatchEnd).trim(),
  };
}

function parseDelegation(output: string) {
  const { textBefore, delegations, textAfter } = parseDelegations(output);
  return {
    textBefore,
    delegation: delegations.length > 0 ? delegations[0] : null,
    textAfter,
  };
}

describe("parseDelegation", () => {
  it("returns null delegation when no block present", () => {
    const result = parseDelegation("Just some text from Claude");
    expect(result.delegation).toBeNull();
    expect(result.textBefore).toBe("Just some text from Claude");
  });

  it("parses a delegation block", () => {
    const output = `I'll delegate this to Codex.

\`\`\`delegate
agent: codex-cli
task: implement the login function in src/auth.ts
\`\`\`

Let me review once that's done.`;

    const result = parseDelegation(output);
    expect(result.delegation).not.toBeNull();
    expect(result.delegation!.agent).toBe("codex-cli");
    expect(result.delegation!.task).toBe(
      "implement the login function in src/auth.ts"
    );
    expect(result.textBefore).toBe("I'll delegate this to Codex.");
    expect(result.textAfter).toBe("Let me review once that's done.");
  });

  it("handles delegation block at start of output", () => {
    const output = `\`\`\`delegate
agent: codex-cli
task: fix the bug
\`\`\``;

    const result = parseDelegation(output);
    expect(result.delegation!.agent).toBe("codex-cli");
    expect(result.delegation!.task).toBe("fix the bug");
    expect(result.textBefore).toBe("");
  });

  it("handles malformed delegation block", () => {
    const output = `\`\`\`delegate
no valid fields here
\`\`\``;

    const result = parseDelegation(output);
    expect(result.delegation).toBeNull();
  });
});

describe("parseDelegations (parallel)", () => {
  it("returns empty delegations when no block present", () => {
    const result = parseDelegations("Just some text");
    expect(result.delegations).toEqual([]);
    expect(result.textBefore).toBe("Just some text");
  });

  it("parses a single delegation block", () => {
    const output = `Planning done.

\`\`\`delegate
agent: codex-cli
task: write the function
\`\`\`

Review next.`;

    const result = parseDelegations(output);
    expect(result.delegations).toHaveLength(1);
    expect(result.delegations[0].agent).toBe("codex-cli");
    expect(result.delegations[0].task).toBe("write the function");
    expect(result.textBefore).toBe("Planning done.");
    expect(result.textAfter).toBe("Review next.");
  });

  it("parses multiple parallel delegation blocks", () => {
    const output = `I'll run these in parallel:

\`\`\`delegate
agent: codex-cli
task: implement the login function in src/auth.ts
\`\`\`

\`\`\`delegate
agent: gemini
task: write unit tests for the login function in test/auth.test.ts
\`\`\`

I'll review both results when done.`;

    const result = parseDelegations(output);
    expect(result.delegations).toHaveLength(2);
    expect(result.delegations[0].agent).toBe("codex-cli");
    expect(result.delegations[0].task).toBe(
      "implement the login function in src/auth.ts"
    );
    expect(result.delegations[1].agent).toBe("gemini");
    expect(result.delegations[1].task).toBe(
      "write unit tests for the login function in test/auth.test.ts"
    );
    expect(result.textBefore).toBe("I'll run these in parallel:");
    expect(result.textAfter).toBe("I'll review both results when done.");
  });

  it("parses three parallel delegation blocks", () => {
    const output = `\`\`\`delegate
agent: codex-cli
task: task A
\`\`\`

\`\`\`delegate
agent: gemini
task: task B
\`\`\`

\`\`\`delegate
agent: claude
task: task C
\`\`\``;

    const result = parseDelegations(output);
    expect(result.delegations).toHaveLength(3);
    expect(result.delegations[0].agent).toBe("codex-cli");
    expect(result.delegations[1].agent).toBe("gemini");
    expect(result.delegations[2].agent).toBe("claude");
  });

  it("skips malformed blocks among valid ones", () => {
    const output = `\`\`\`delegate
agent: codex-cli
task: valid task
\`\`\`

\`\`\`delegate
this is malformed
\`\`\`

\`\`\`delegate
agent: gemini
task: another valid task
\`\`\``;

    const result = parseDelegations(output);
    expect(result.delegations).toHaveLength(2);
    expect(result.delegations[0].agent).toBe("codex-cli");
    expect(result.delegations[1].agent).toBe("gemini");
  });
});

describe("DEFAULT_CONFIG", () => {
  it("has an orchestrator configured", () => {
    expect(DEFAULT_CONFIG.orchestrator.command).toBe("claude");
    expect(DEFAULT_CONFIG.orchestrator.provider).toBe("claude-code");
  });

  it("has codex-cli as a default agent", () => {
    expect(DEFAULT_CONFIG.agents["codex-cli"]).toBeDefined();
    expect(DEFAULT_CONFIG.agents["codex-cli"].enabled).toBe(true);
    expect(DEFAULT_CONFIG.agents["codex-cli"].command).toBe("codex");
  });

  it("codex args include {{prompt}} placeholder", () => {
    expect(DEFAULT_CONFIG.agents["codex-cli"].args).toContain("{{prompt}}");
  });
});
