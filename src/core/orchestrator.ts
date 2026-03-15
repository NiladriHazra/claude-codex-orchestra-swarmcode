import type { Config, AgentConfig } from "../config/schema.js";
import { spawnProcess } from "../utils/process.js";
import { substituteTemplateArgs } from "../utils/template.js";
import { logger } from "../output/logger.js";

export interface OrchestratorOptions {
  confirm?: boolean;
  dryRun?: boolean;
}

interface DelegationBlock {
  agent: string;
  task: string;
}

function buildSystemPrompt(agents: Record<string, AgentConfig>): string {
  const agentDescriptions = Object.entries(agents)
    .filter(([_, a]) => a.enabled)
    .map(
      ([name, a]) =>
        `  - **${name}** (${a.displayName}): ${a.role}\n    Capabilities: ${a.capabilities.join(", ")}`
    )
    .join("\n");

  return `You are the orchestrator of a multi-agent AI coding system called "swarmcode".

You have access to the following sub-agents that you can delegate work to:

${agentDescriptions}

## How to delegate

When you want a sub-agent to do work, output a delegation block in EXACTLY this format:

\`\`\`delegate
agent: <agent-name>
task: <detailed task description with full context>
\`\`\`

The system will intercept this, run the sub-agent, and feed you back the result so you can continue.

### Parallel delegation

When tasks are **independent** and can run at the same time, output MULTIPLE delegation blocks in a single response. They will run in parallel and you'll get all results back together:

\`\`\`delegate
agent: <agent-A>
task: <task for agent A>
\`\`\`

\`\`\`delegate
agent: <agent-B>
task: <task for agent B>
\`\`\`

Use parallel delegation when:
- Tasks don't depend on each other's output
- Different agents can work on different files/features simultaneously
- You want to speed up the overall workflow

Use sequential delegation (one block at a time) when a task depends on the result of a previous one.

## Your role as orchestrator

1. **Analyze** the user's request
2. **Plan** — break complex tasks into steps, decide which agent handles each
3. **Delegate** — output delegation blocks for implementation work. Use parallel blocks for independent tasks.
4. **Review** — when you get results back, review them and decide next steps
5. **Synthesize** — provide a final summary to the user

## Guidelines

- YOU handle: planning, architecture, code review, research, explaining code, documentation
- DELEGATE to sub-agents: writing code, editing files, fixing bugs, running tests, refactoring
- For simple questions/explanations, just answer directly
- When delegating, give the agent FULL context (file paths, what to change, why)
- You can delegate multiple tasks in parallel (multiple blocks) or in sequence (one at a time)
- After delegation results come back, review the work and decide if more is needed`;
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
    if (firstMatchIndex === undefined) firstMatchIndex = match.index;
    lastMatchEnd = match.index + match[0].length;

    const block = match[1];
    const agentMatch = block.match(/^agent:\s*(.+)$/m);
    const taskMatch = block.match(/^task:\s*([\s\S]+?)$/m);

    if (agentMatch && taskMatch) {
      delegations.push({ agent: agentMatch[1].trim(), task: taskMatch[1].trim() });
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

function parseDelegation(output: string): {
  textBefore: string;
  delegation: DelegationBlock | null;
  textAfter: string;
} {
  const { textBefore, delegations, textAfter } = parseDelegations(output);
  return {
    textBefore,
    delegation: delegations.length > 0 ? delegations[0] : null,
    textAfter,
  };
}

async function runAgent(
  agentConfig: AgentConfig,
  task: string,
  onChunk?: (text: string) => void,
  signal?: AbortSignal
): Promise<{ output: string; exitCode: number | null; durationMs: number }> {
  const args = substituteTemplateArgs(agentConfig.args, { prompt: task });
  const start = Date.now();
  let output = "";

  const result = await spawnProcess({
    command: agentConfig.command,
    args,
    onStdout: (chunk) => { output += chunk; onChunk?.(chunk); },
    onStderr: (chunk) => { onChunk?.(chunk); },
    signal,
  });

  return { output: output || result.stdout, exitCode: result.exitCode, durationMs: Date.now() - start };
}

export async function orchestrate(
  task: string,
  config: Config,
  options: OrchestratorOptions = {}
): Promise<void> {
  const systemPrompt = buildSystemPrompt(config.agents);
  const abortController = new AbortController();

  const onSignal = () => abortController.abort();
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  try {
    let conversationContext = "";
    let currentPrompt = task;
    let iteration = 0;
    const maxIterations = 10;

    while (iteration < maxIterations) {
      iteration++;

      if (config.output.showPhases) {
        logger.phase("Orchestrator", iteration === 1 ? "Analyzing and planning..." : "Reviewing and continuing...");
      }

      const fullPrompt = conversationContext
        ? `${systemPrompt}\n\n## Conversation so far:\n${conversationContext}\n\n## Continue:\n${currentPrompt}`
        : `${systemPrompt}\n\n## User task:\n${currentPrompt}`;

      if (options.dryRun) {
        logger.info("Orchestration plan (dry run):");
        console.log(`  Orchestrator: ${config.orchestrator.command}`);
        console.log(`  Task: "${task}"`);
        console.log(`  Available agents:`);
        for (const [name, agent] of Object.entries(config.agents)) {
          if (agent.enabled) console.log(`    - ${agent.displayName} (${name}): ${agent.role}`);
        }
        return;
      }

      const orchArgs = substituteTemplateArgs(config.orchestrator.args, { prompt: fullPrompt });
      let orchOutput = "";

      const orchResult = await spawnProcess({
        command: config.orchestrator.command,
        args: orchArgs,
        onStdout: (chunk) => {
          orchOutput += chunk;
          if (!chunk.includes("```delegate")) process.stdout.write(chunk);
        },
        onStderr: () => {},
        signal: abortController.signal,
      });

      if (orchResult.exitCode !== 0 && !abortController.signal.aborted) {
        logger.error(`Orchestrator exited with code ${orchResult.exitCode}`);
        if (orchResult.stderr.trim()) logger.error(orchResult.stderr.trim());
        return;
      }

      const { textBefore, delegations, textAfter } = parseDelegations(orchOutput);

      if (delegations.length === 0) break;

      const validDelegations: { delegation: DelegationBlock; agentConfig: AgentConfig }[] = [];
      let hasInvalid = false;

      for (const delegation of delegations) {
        const agentConfig = config.agents[delegation.agent];
        if (!agentConfig || !agentConfig.enabled) {
          logger.error(`Agent "${delegation.agent}" not found or disabled.`);
          conversationContext += `\nOrchestrator: ${textBefore}\n\n[Delegation to "${delegation.agent}" failed: agent not available]\n`;
          hasInvalid = true;
        } else {
          validDelegations.push({ delegation, agentConfig });
        }
      }

      if (hasInvalid && validDelegations.length === 0) {
        currentPrompt = "Those agents are not available. Handle it yourself or try different agents.";
        continue;
      }

      if (options.confirm) {
        const { confirm } = await import("@inquirer/prompts");
        const agentNames = validDelegations.map((d) => d.agentConfig.displayName).join(", ");
        const proceed = await confirm({
          message: validDelegations.length > 1
            ? `Delegate to ${agentNames} in parallel?`
            : `Delegate to ${agentNames}?`,
        });
        if (!proceed) {
          conversationContext += `\nOrchestrator: ${textBefore}\n\n[User declined delegation]\n`;
          currentPrompt = "The user declined this delegation. Try a different approach.";
          continue;
        }
      }

      console.log();
      for (const { delegation, agentConfig } of validDelegations) {
        logger.delegation(agentConfig.displayName, delegation.task);
      }

      if (validDelegations.length > 1) {
        logger.phase("Parallel", `Running ${validDelegations.length} agents in parallel...`);
      }

      const agentResults = await Promise.all(
        validDelegations.map(async ({ delegation, agentConfig }) => {
          logger.agentStart(agentConfig.displayName);

          const result = await runAgent(
            agentConfig,
            delegation.task,
            (chunk) => logger.agentOutput(agentConfig.displayName, chunk),
            abortController.signal
          );

          const seconds = (result.durationMs / 1000).toFixed(1);
          console.log();
          if (result.exitCode === 0) {
            logger.agentDone(agentConfig.displayName, seconds);
          } else {
            logger.agentFailed(agentConfig.displayName, result.exitCode, seconds);
          }

          return { delegation, agentConfig, result };
        })
      );

      conversationContext += `\nOrchestrator: ${textBefore}\n`;

      const maxCharsPerAgent = validDelegations.length > 1
        ? Math.floor(8000 / validDelegations.length)
        : 8000;

      for (const { agentConfig, result } of agentResults) {
        const truncated = result.output.length > maxCharsPerAgent
          ? result.output.slice(0, maxCharsPerAgent) + "\n... [truncated]"
          : result.output;
        conversationContext += `\n[Delegated to ${agentConfig.displayName}]\nResult (exit ${result.exitCode}):\n${truncated}\n`;
      }

      currentPrompt = textAfter || "The agent(s) finished. Review results, delegate more if needed, or summarize what was done.";
    }

    if (iteration >= maxIterations) logger.warn("Max orchestration iterations reached.");
  } finally {
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
  }
}
