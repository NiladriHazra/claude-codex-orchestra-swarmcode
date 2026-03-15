import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function detectCli(
  command: string
): Promise<{ available: boolean; path?: string }> {
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const { stdout } = await execFileAsync(cmd, [command]);
    return { available: true, path: stdout.trim().split("\n")[0] };
  } catch {
    return { available: false };
  }
}

export async function detectClis(
  commands: string[]
): Promise<Record<string, { available: boolean; path?: string }>> {
  const results = await Promise.all(
    commands.map(async (cmd) => [cmd, await detectCli(cmd)] as const)
  );
  return Object.fromEntries(results);
}

export interface HealthCheckResult {
  installed: boolean;
  version?: string;
  configured: boolean;
  error?: string;
}

export async function healthCheckCli(
  command: string
): Promise<HealthCheckResult> {
  const detect = await detectCli(command);
  if (!detect.available) {
    return { installed: false, configured: false, error: "not found on PATH" };
  }

  let version: string | undefined;
  try {
    const { stdout, stderr } = await execFileAsync(command, ["--version"], {
      timeout: 10000,
    });
    version = (stdout || stderr).trim().split("\n")[0];
  } catch {}

  const testResult = await testCliConfig(command);

  return {
    installed: true,
    version,
    configured: testResult.ok,
    error: testResult.error,
  };
}

const CLI_TESTS: Record<string, { args: string[]; timeout: number }> = {
  claude: { args: ["--version"], timeout: 10000 },
  codex: { args: ["--version"], timeout: 10000 },
  gemini: { args: ["--version"], timeout: 10000 },
  kimi: { args: ["--version"], timeout: 10000 },
  opencode: { args: ["--version"], timeout: 10000 },
  aider: { args: ["--version"], timeout: 10000 },
  ollama: { args: ["list"], timeout: 10000 },
  copilot: { args: ["--version"], timeout: 10000 },
};

async function testCliConfig(
  command: string
): Promise<{ ok: boolean; error?: string }> {
  const test = CLI_TESTS[command];
  if (!test) {
    try {
      await execFileAsync(command, ["--help"], { timeout: 10000 });
      return { ok: true };
    } catch {
      return { ok: false, error: "failed to run --help" };
    }
  }

  try {
    const { stdout, stderr } = await execFileAsync(command, test.args, {
      timeout: test.timeout,
    });
    const output = (stdout + stderr).toLowerCase();

    if (
      output.includes("invalid api key") ||
      output.includes("not authenticated") ||
      output.includes("login required") ||
      output.includes("unauthorized")
    ) {
      return { ok: false, error: "not authenticated" };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("timeout")) return { ok: true };
    if (test.args[0] === "--version" || test.args[0] === "list") {
      return { ok: false, error: `failed: ${msg.slice(0, 100)}` };
    }
    return { ok: false, error: msg.slice(0, 100) };
  }
}

export async function healthCheckClis(
  commands: string[]
): Promise<Record<string, HealthCheckResult>> {
  const results = await Promise.all(
    commands.map(async (cmd) => [cmd, await healthCheckCli(cmd)] as const)
  );
  return Object.fromEntries(results);
}
