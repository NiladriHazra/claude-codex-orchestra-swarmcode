<div align="center">
<br />

# 🐝 swarmcode

### Run multiple AI coding agents as one team

Claude plans. Codex implements. Gemini researches. All from one terminal.

<br />

[![npm](https://img.shields.io/npm/v/@bytehumi/swarmcode?color=yellow&label=npm)](https://www.npmjs.com/package/@bytehumi/swarmcode)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-green)](https://nodejs.org)

<br />
</div>

<img src="https://pub-51091dcf1e9d4b04bb2e74f489c4f346.r2.dev/4befa3436aff0e0db63d351886e1ea4627dbdf23f46d848e030286c6775160a3.png" alt="swarmcode terminal" width="100%" />

## Install

```bash
npm install -g @bytehumi/swarmcode
```

## Get started

```bash
swarmcode init    # detect CLIs, pick brain + agents
swarmcode         # launch the swarm
```

## What happens when you run it

You type a task. The brain (Claude, Codex, or whichever you picked) splits the work into waves and fires off multiple agents in parallel:

> **Wave 1** - Codex scaffolds the project
>
> **Wave 2** - Codex builds components, Gemini writes types, Kimi creates hooks *(parallel)*
>
> **Wave 3** - Codex wires everything together
>
> **Verify** - Brain checks: builds? runs? all connected?

Each wave commits to git. You see the diff after every step.

## Agents

| | Agent | What it does | CLI |
|---|---|---|---|
| **Brain** | Claude Code | Plans, reviews, coordinates the swarm | `claude` |
| **Brain** | Codex CLI | Can also be the brain, or an implementer | `codex` |
| | Gemini CLI | Research, code generation, analysis | `gemini` |
| | Kimi Code | Implementation, file operations | `kimi` |
| | Open Code | Multi-model coding | `opencode` |
| | Aider | Pair programming with git | `aider` |
| | Ollama | Local, private models | `ollama` |
| | *Custom* | Any CLI that takes a prompt | `your-cli` |

Any agent can be the **brain** or a **sub-agent**. You choose during `swarmcode init`.

## Commands

| Command | Description |
|---|---|
| `swarmcode` | Interactive mode |
| `swarmcode init` | Setup wizard |
| `swarmcode run "task"` | One-shot mode |
| `swarmcode plan "task"` | Dry run |
| `swarmcode providers` | List agents |
| `swarmcode providers --test` | Health check agents |
| `swarmcode config` | View config |

## How orchestration works

**Plan, check, execute.** The brain follows a strict loop:

1. **Analyze** the codebase
2. **Plan** - break work into small tasks, assign to agents
3. **Check** - validate the plan before running (dependencies, file conflicts)
4. **Execute** - fire agents in parallel waves
5. **Commit + diff** - atomic git commit per wave
6. **Verify** - do files exist? real code? all wired? builds clean?
7. **Fix** - if broken, run a fix wave
8. **Repeat** until done

**Parallel waves** - independent tasks run at the same time across different agents. Wave 2 doesn't start until Wave 1 finishes. Two agents never touch the same file in one wave.

**Atomic commits** - every wave produces a git commit with a full diff, so you always know what changed and which agent did it.

**Verification** - after all waves, the brain checks from your perspective: files exist, code is real (not stubs), everything is wired together, and it builds without errors.

**Auto-fix vs escalate** - the brain auto-fixes bugs, missing deps, and type errors. It escalates architectural changes to you.

## Config

`.swarmcode.yml` in your project:

```yaml
version: 1

orchestrator:
  command: claude

agents:
  codex-cli:
    displayName: Codex CLI
    command: codex
    args: ["exec", "{{prompt}}", "-a", "on-request", "--sandbox", "danger-full-access", "-C", "."]
    capabilities: [implementation, code-writing, bug-fixing, refactoring, testing]
    role: Code implementer
    enabled: true
```

Add any CLI as a custom agent:

```yaml
agents:
  my-model:
    displayName: My Model
    command: ollama
    args: ["run", "codellama", "{{prompt}}"]
    capabilities: [implementation, code-writing]
    role: Local code generation
    enabled: true
```

## Development

```bash
git clone https://github.com/niladri-hazra/swarmcode.git
cd swarmcode
npm install
npm test
npm run build
```

<div align="center">

<br />

MIT License &bull; [Niladri Hazra](https://x.com/bytehumi) &bull; [@bytehumi](https://x.com/bytehumi)

<br />

If this helped you, give it a star :)

</div>
