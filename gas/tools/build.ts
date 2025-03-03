import typia from "@ryoppippi/unplugin-typia/bun";
import fs from "node:fs/promises";

await fs.rm("./dist", { recursive: true, force: true });
await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  plugins: [typia()],
});

await fs.copyFile("./appsscript.json", "./dist/appsscript.json");
