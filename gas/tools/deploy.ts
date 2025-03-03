import { $ } from "bun";

await $`clasp push -f`;
const { stdout } = await $`clasp deploy`;
const stdoutString = stdout.toString("utf-8");

const deployId = stdoutString.match(/- (\S+) @/)?.[1];
if (!deployId) {
  throw new Error("Failed to deploy");
}

console.log();
console.log(`Deployed: ${deployId}`);
console.log(`https://script.google.com/macros/s/${deployId}/exec`);
