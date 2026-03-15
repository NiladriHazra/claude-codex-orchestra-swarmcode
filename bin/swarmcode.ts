#!/usr/bin/env node

import { Command } from "commander";
import { runCommand } from "../src/commands/run.js";
import { planCommand } from "../src/commands/plan.js";
import { initCommand } from "../src/commands/init.js";
import { configCommand } from "../src/commands/config.js";
import { providersCommand } from "../src/commands/providers.js";
import { startInteractive } from "../src/commands/interactive.js";

const program = new Command();

program
  .name("swarmcode")
  .description("Multi-agent AI coding CLI — coordinate Claude, Codex, Gemini, Kimi, and more")
  .version("0.1.0");

program.addCommand(runCommand);
program.addCommand(planCommand);
program.addCommand(initCommand);
program.addCommand(configCommand);
program.addCommand(providersCommand);

program.action(async () => {
  await startInteractive();
});

program.parse();
