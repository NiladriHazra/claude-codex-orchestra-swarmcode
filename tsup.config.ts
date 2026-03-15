import { defineConfig } from "tsup";
import { chmod } from "node:fs/promises";

export default defineConfig({
  entry: {
    "bin/swarmcode": "bin/swarmcode.ts",
    "mcp/server": "src/mcp/server.ts",
    "src/index": "src/index.ts",
  },
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  clean: true,
  splitting: true,
  sourcemap: true,
  dts: { entry: { "src/index": "src/index.ts" } },
  async onSuccess() {
    const { readFile, writeFile } = await import("node:fs/promises");

    const binPath = "dist/bin/swarmcode.js";
    const content = await readFile(binPath, "utf-8");
    if (!content.startsWith("#!")) {
      await writeFile(binPath, `#!/usr/bin/env node\n${content}`);
    }
    await chmod(binPath, 0o755);

    const mcpPath = "dist/mcp/server.js";
    const mcpContent = await readFile(mcpPath, "utf-8");
    if (!mcpContent.startsWith("#!")) {
      await writeFile(mcpPath, `#!/usr/bin/env node\n${mcpContent}`);
    }
    await chmod(mcpPath, 0o755);
  },
});
