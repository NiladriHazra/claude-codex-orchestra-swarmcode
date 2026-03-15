<div align="center">

<img src="https://pub-51091dcf1e9d4b04bb2e74f489c4f346.r2.dev/4befa3436aff0e0db63d351886e1ea4627dbdf23f46d848e030286c6775160a3.png" alt="swarmcode" width="120" />

# swarmcode

**Run multiple AI coding agents as one team.**

Claude Code plans the work. Codex writes the code. Gemini handles research.
All coordinated automatically from a single terminal.

[![npm version](https://img.shields.io/npm/v/swarmcode.svg)](https://www.npmjs.com/package/swarmcode)
[![license](https://img.shields.io/npm/l/swarmcode.svg)](https://github.com/niladri-hazra/swarmcode/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/swarmcode.svg)](https://nodejs.org)

[Install](#install) &bull; [Quick Start](#quick-start) &bull; [How It Works](#how-it-works) &bull; [Agents](#supported-agents) &bull; [Config](#configuration)

</div>

---

## The problem

You have Claude Code, Codex CLI, Gemini CLI, Kimi, and maybe more installed. Each one is good at different things. But using them means jumping between terminals, copy-pasting context, and manually coordinating who does what.

**swarmcode fixes this.** One command, one terminal. The brain plans, the agents execute, everything stays in sync.

## What it does

```
$ swarmcode

  🐝 swarmcode

  brain    claude
  agents   Codex CLI, Gemini CLI, Kimi Code
  swarm    3 agents ready

  launching claude with swarm tools...
```

You get Claude Code's full interactive interface — but now it can delegate work to your other AI CLIs. It reads your codebase, plans the work, splits it across agents, runs them in parallel, reviews the output, and keeps going until the job is done.

## How it works

```
You: "build a todo app with auth"
```

```
┌─────────────────────────────────────────────────────────┐
│                    🐝 swarmcode                         │
│                                                         │
│  ┌──────────┐                                           │
│  │  Brain    │  Claude Code                             │
│  │ (plans)   │  "I'll split this into 3 waves..."      │
│  └────┬─────┘                                           │
│       │                                                 │
│  Wave 1 ─────────────────────────────────               │
│  │                                                      │
│  └─► codex: scaffold Next.js project                    │
│                                                         │
│  Wave 2 ─────────────────────────────────               │
│  │                                                      │
│  ├─► codex:  build components     ──┐                   │
│  ├─► gemini: create types          ─┤  parallel         │
│  └─► kimi:   write hooks          ──┘                   │
│                                                         │
│  Wave 3 ─────────────────────────────────               │
│  │                                                      │
│  └─► codex: wire everything + auth                      │
│                                                         │
│  Verify ──────────────────────────────                  │
│  │                                                      │
│  └─► brain: build passes? runs? all wired?              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### The orchestration loop

```
   Plan          Split across agents       Execute in parallel
    │                    │                        │
    ▼                    ▼                        ▼
┌────────┐    ┌───────────────────┐    ┌──────────────────┐
│ Analyze │───►│ Wave 1: setup     │───►│ codex ───────►   │
│ codebase│    │ Wave 2: parallel  │    │ gemini ──────►   │
│ + plan  │    │ Wave 3: integrate │    │ kimi ────────►   │
└────────┘    └───────────────────┘    └────────┬─────────┘
                                                │
                                     ┌──────────▼─────────┐
                                     │  git diff + commit  │
                                     │  review + verify    │
                                     │  fix if broken      │
                                     └────────────────────┘
```

Each wave produces an atomic git commit with a full diff, so you see exactly what changed after every step.

## Supported agents

| Agent | Best for | CLI |
|---|---|---|
| **Claude Code** | Planning, code review, architecture, research | `claude` |
| **Codex CLI** | Code implementation, bug fixes, refactoring | `codex` |
| **Gemini CLI** | Research, code generation, analysis | `gemini` |
| **Kimi Code** | Implementation, file operations | `kimi` |
| **Open Code** | Multi-model coding | `opencode` |
| **Aider** | Pair programming with git integration | `aider` |
| **Ollama** | Local/private code generation | `ollama` |
| **Custom** | Anything — any CLI that accepts a prompt | `your-cli` |

> Any of these can be the **brain** (orchestrator) or a **sub-agent**. You pick during setup.

## Install

```bash
npm install -g swarmcode
```

**Requirements:**
- Node.js 18+
- At least one orchestrator CLI (Claude Code, Codex, Gemini, Kimi, or Open Code)
- At least one sub-agent CLI

## Quick start

```bash
# 1. Detect CLIs, pick brain + agents, health check everything
swarmcode init

# 2. Launch the swarm
swarmcode
```

Two commands. That's it.

## Setup

`swarmcode init` finds every AI coding CLI on your machine and checks if it's properly configured:

```
  Swarmcode Setup

  Scanning and verifying AI coding CLIs...

  claude:   ✓ ready (2.1.76)
  codex:    ✓ ready (0.114.0)
  gemini:   ✓ ready (0.2.1)
  kimi:     ✓ ready (1.1)
  opencode: ⚠ installed but: not authenticated
  aider:    not installed
  ollama:   not installed

? Which CLI should be the orchestrator (the brain)?
  > Claude Code (claude) [ready]
    Codex CLI (codex) [ready]
    Gemini CLI (gemini) [ready]

? Which CLIs should be available as sub-agents?
  > [x] Codex CLI [ready]
    [x] Gemini CLI [ready]
    [x] Kimi Code [ready]
    [ ] Open Code [needs setup]
```

Writes `.swarmcode.yml` to your project. Edit anytime.

## Commands

| Command | What it does |
|---|---|
| `swarmcode` | Interactive mode — full orchestration |
| `swarmcode init` | Setup wizard — detect and configure agents |
| `swarmcode run "task"` | One-shot — run a task and exit |
| `swarmcode plan "task"` | Dry run — show plan without executing |
| `swarmcode providers` | List configured agents |
| `swarmcode providers --test` | Health check all agents |
| `swarmcode config` | View current config |

## How orchestration works

### Wave-based parallel execution

Work is split into waves. Independent tasks within a wave run in parallel across different agents.

```
Wave 1 (sequential — setup):
  └── codex: initialize project

Wave 2 (parallel — no dependencies between these):
  ├── codex:  build components
  ├── gemini: create types and interfaces
  └── kimi:   write hooks and utilities

Wave 3 (sequential — depends on wave 2):
  └── codex: wire everything together

Verify:
  └── brain: files exist? real code? all wired? builds clean?
```

**Rule:** Two agents never touch the same file in the same wave.

### Atomic commits

After every wave:

```diff
  6 files changed, 320 insertions(+)

+ export function useTodos() {
+   const [todos, setTodos] = useState<Todo[]>([]);
+   ...
+ }
```

One commit per wave. Clean git history. Easy to see which wave broke what.

### Goal-backward verification

After all waves, the brain checks from YOUR perspective:

| Check | Question |
|---|---|
| **Exists** | Do all expected files exist? |
| **Substantive** | Real implementations, not empty stubs? |
| **Wired** | Components connected? Imports resolve? Data flows? |
| **Runs** | Builds without errors? Starts up? |

If anything fails, a fix wave runs automatically.

### Context isolation

Each agent gets a focused prompt — just the file paths, interfaces, and behavior it needs. No conversation history dump. Keeps agents fast, prevents context rot.

### Deviation handling

| Type | Action |
|---|---|
| Bug fixes, missing deps, type errors | Auto-fixed by the brain |
| Architectural changes, scope expansion | Escalated to you |

## Configuration

`.swarmcode.yml` in your project root:

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

  gemini:
    displayName: Gemini CLI
    command: gemini
    args: ["-p", "{{prompt}}"]
    capabilities: [implementation, research, code-writing]
    role: Research and code generation
    enabled: true

confirm: false
```

### Adding a custom agent

Any CLI that takes a prompt works:

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

`{{prompt}}` gets replaced with the task at runtime.

## Architecture

```
swarmcode
│
├── Launches orchestrator CLI interactively (Claude/Codex/Gemini/...)
├── Injects MCP server → gives brain tools to run other agents
├── Injects system prompt → teaches brain wave-based orchestration
│
└── Brain (orchestrator):
    ├── Plans work, builds dependency graph
    ├── Splits into waves, assigns agents
    ├── Runs agents via Bash (output streams live)
    ├── Commits + diffs after each wave
    ├── Verifies: exists → substantive → wired → runs
    └── Fixes issues, continues until done
```

## Development

```bash
git clone https://github.com/niladri-hazra/swarmcode.git
cd swarmcode
npm install
npm test            # 29 tests
npm run typecheck   # TypeScript check
npm run build       # Build to dist/
npm run dev -- init # Run locally without building
```

## License

[MIT](LICENSE)

---

<div align="center">

Built by **[Niladri Hazra](https://x.com/bytehumi)**

[![Twitter](https://img.shields.io/badge/𝕏-@bytehumi-black?style=flat&logo=x&logoColor=white)](https://x.com/bytehumi)

</div>
