import { spawn, type ChildProcess } from "node:child_process";

export interface SpawnResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export interface SpawnOptions {
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
  signal?: AbortSignal;
  timeout?: number;
}

const activeProcesses = new Set<ChildProcess>();

export function spawnProcess(options: SpawnOptions): Promise<SpawnResult> {
  const { command, args, cwd = process.cwd(), env, onStdout, onStderr, signal, timeout } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: env ? { ...process.env, ...env } : process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    activeProcesses.add(child);

    let stdout = "";
    let stderr = "";
    let killed = false;

    child.stdout.setEncoding("utf-8");
    child.stderr.setEncoding("utf-8");

    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      onStdout?.(chunk);
    });

    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
      onStderr?.(chunk);
    });

    const kill = () => {
      if (killed) return;
      killed = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
      }, 5000);
    };

    if (signal) {
      if (signal.aborted) kill();
      else signal.addEventListener("abort", kill, { once: true });
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (timeout) timer = setTimeout(kill, timeout);

    child.on("close", (exitCode) => {
      activeProcesses.delete(child);
      if (timer) clearTimeout(timer);
      resolve({ exitCode, stdout, stderr });
    });

    child.on("error", (err) => {
      activeProcesses.delete(child);
      if (timer) clearTimeout(timer);
      reject(err);
    });
  });
}

export function killAllProcesses(): void {
  for (const child of activeProcesses) child.kill("SIGTERM");
}

process.on("SIGINT", () => { killAllProcesses(); process.exit(130); });
process.on("SIGTERM", () => { killAllProcesses(); process.exit(143); });
