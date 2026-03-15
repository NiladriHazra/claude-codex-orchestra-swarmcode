# swarmcode

Run multiple AI coding agents as one team. Claude Code plans the work, Codex writes the code, Gemini handles research — all coordinated automatically from a single terminal.

![swarmcode terminal](https://pub-51091dcf1e9d4b04bb2e74f489c4f346.r2.dev/196c0e8468f1f582dbe3a8d8d657b32bae92bdaf7175bb174d197351f6bdba14.png)

## What it does

You type `swarmcode` and get Claude Code's interactive interface — but supercharged with the ability to delegate work to other AI coding CLIs running in parallel.

Instead of manually switching between Claude, Codex, Gemini, and Kimi, swarmcode picks the right agent for each task and runs them simultaneously. One agent builds components while another writes types and a third handles hooks. 3x the speed, zero context switching.

## How it works

```
You: "build a todo app with auth"

swarmcode (Claude as brain):
  Wave 1: codex → scaffold project
  Wave 2: codex → components | gemini → types | kimi → hooks  (parallel)
  Wave 3: codex → wire everything up
  Wave 4: verify → does it build? does it run?
```

The orchestrator breaks your task into waves. Independent tasks within a wave run in parallel across different agents. Each wave commits its changes so you see diffs in real time.

## Supported agents

| Agent | Role | Command |
|---|---|---|
| Claude Code | Orchestrator brain (plans, reviews, coordinates) | `claude` |
| Codex CLI | Code implementation, bug fixes, refactoring | `codex` |
| Gemini CLI | Research, code generation, analysis | `gemini` |
| Kimi Code | Implementation, file operations | `kimi` |
| Open Code | Multi-model coding assistant | `opencode` |
| Aider | AI pair programming with git integration | `aider` |
| Ollama | Local/private code generation | `ollama` |

Any CLI that accepts a prompt and writes code can be added as a custom agent.

## Install

```bash
npm install -g swarmcode
```

Requirements:
- Node.js 18+
- At least one orchestrator CLI installed (Claude Code, Codex, Gemini, Kimi, or Open Code)
- At least one sub-agent CLI installed

## Quick start

```bash
# 1. Set up — detects your installed CLIs, picks brain + agents
swarmcode init

# 2. Run — launches the orchestrator with agent tools
swarmcode
```

That's it. Type your task and the swarm handles it.

## Setup walkthrough

`swarmcode init` scans your machine for AI coding CLIs and health-checks each one:

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
  > [x] Codex CLI (codex) [ready]
    [x] Gemini CLI (gemini) [ready]
    [x] Kimi Code (kimi) [ready]
    [ ] Open Code (opencode) [needs setup]
```

Writes a `.swarmcode.yml` config file. Edit it anytime to add agents, change roles, or tweak commands.

## CLI commands

```bash
swarmcode                    # Interactive mode — full agent orchestration
swarmcode init               # Setup wizard — detect and configure agents
swarmcode run "task"         # One-shot mode — run a task and exit
swarmcode plan "task"        # Dry run — show the plan without executing
swarmcode providers          # List configured agents
swarmcode providers --test   # Health check all agents
swarmcode config             # View current configuration
```

## How orchestration works

### Wave-based parallel execution

swarmcode splits work into waves based on dependencies:

```
Wave 1 (setup):
  └─ codex: initialize project

Wave 2 (parallel — no interdependencies):
  ├─ codex: build components
  ├─ gemini: create types and interfaces
  └─ kimi: write hooks and utilities

Wave 3 (depends on wave 2):
  └─ codex: wire everything together

Wave 4 (verification):
  └─ brain: does it build? does it run? are all pieces connected?
```

Tasks in the same wave run in parallel. The next wave starts after the current one finishes. Files are never assigned to two agents in the same wave.

### Atomic commits per wave

After every wave, swarmcode commits the changes and shows a full diff:

```
  6 files changed, 320 insertions(+)

+ export function useTodos() {
+   const [todos, setTodos] = useState<Todo[]>([]);
+   ...
+ }
```

Clean git history where each commit = one wave of work.

### Goal-backward verification

After all waves complete, the orchestrator verifies from your perspective:

1. Do all expected files exist?
2. Are they real implementations (not stubs)?
3. Are components wired together (imports resolve, data flows)?
4. Does it build and run without errors?

If something is broken, it spawns a fix wave automatically.

### Context isolation

Each agent gets a focused prompt with only what it needs — file paths, interfaces to implement, expected behavior. No conversation history dump. This keeps agents fast and prevents context rot on long sessions.

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

Any CLI that accepts a prompt works. Add it to `.swarmcode.yml`:

```yaml
agents:
  my-local-model:
    displayName: My Model
    command: ollama
    args: ["run", "codellama", "{{prompt}}"]
    capabilities: [implementation, code-writing]
    role: Local code generation
    enabled: true
```

The `{{prompt}}` placeholder gets replaced with the task description at runtime.

## Architecture

```
swarmcode
├── Launches orchestrator CLI (Claude/Codex/Gemini) interactively
├── Injects MCP server with agent delegation tools
├── Injects system prompt with orchestration instructions
└── Agents run via Bash — output streams live in the terminal

Orchestrator (brain):
├── Plans work, splits into waves
├── Delegates to agents via Bash tool calls
├── Reviews results, runs verification
└── Commits changes per wave

MCP Server:
├── Exposes swarm_agents tool (list available agents)
└── Exposes delegate_to_* tools (run agent CLIs)
```

The orchestrator CLI runs as-is with its full interactive UI. swarmcode just gives it superpowers through MCP tools and a system prompt that teaches it to coordinate agents.

## Development

```bash
git clone https://github.com/mskutlu/swarmcode.git
cd swarmcode
npm install
npm test          # 29 tests
npm run typecheck # TypeScript validation
npm run build     # Build to dist/
npm run dev -- init  # Run locally without building
```

## License

MIT
