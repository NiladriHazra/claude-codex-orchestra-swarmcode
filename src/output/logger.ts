import chalk from "chalk";

export const logger = {
  info: (msg: string) => console.log(chalk.blue("ℹ"), msg),
  success: (msg: string) => console.log(chalk.green("✓"), msg),
  warn: (msg: string) => console.log(chalk.yellow("⚠"), msg),
  error: (msg: string) => console.error(chalk.red("✗"), msg),

  phase: (actor: string, description: string) =>
    console.log(chalk.bold.cyan(`\n━━ ${actor}: ${description} ━━\n`)),

  delegation: (agentName: string, task: string) => {
    console.log(chalk.bold.yellow(`\n┌─ Delegating to ${agentName}`));
    console.log(chalk.yellow(`│  Task: ${task}`));
    console.log(chalk.yellow(`└─\n`));
  },

  agentStart: (agentName: string) =>
    console.log(chalk.green(`▶ ${agentName} running...\n`)),

  agentOutput: (agentName: string, text: string) => {
    const prefix = chalk.dim.green(`  [${agentName}] `);
    for (const line of text.split("\n")) {
      if (line.trim()) process.stdout.write(`${prefix}${line}\n`);
    }
  },

  agentDone: (agentName: string, duration: string) =>
    console.log(chalk.green(`✓ ${agentName} completed (${duration}s)`)),

  agentFailed: (agentName: string, exitCode: number | null, duration: string) =>
    console.log(chalk.red(`✗ ${agentName} failed (exit code ${exitCode}, ${duration}s)`)),

  summary: (msg: string) => {
    console.log(chalk.bold.cyan(`\n━━ Summary ━━`));
    console.log(msg);
  },
};
