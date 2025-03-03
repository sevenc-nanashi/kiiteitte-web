import { $ } from "bun";

await $`clasp push -f`;
const deployments = await $`clasp deployments`.nothrow().text();

const mainDeployment = deployments.match(/- (\S+) @[0-9]+ - main/)?.[1];
if (mainDeployment) {
  console.log(`Redeploying: ${mainDeployment}`);
  await $`clasp deploy -i ${mainDeployment} -d main`;
  console.log();
  console.log(`https://script.google.com/macros/s/${mainDeployment}/exec`);
} else {
  console.log("No main deployment found, deploying new version");
  const { stdout } = await $`clasp deploy -d main`;
  const stdoutString = stdout.toString("utf-8");

  const deployId = stdoutString.match(/- (\S+) @/)?.[1];
  if (!deployId) {
    throw new Error("Failed to deploy");
  }

  console.log();
  console.log(`Deployed: ${deployId}`);
  console.log(`https://script.google.com/macros/s/${deployId}/exec`);
}
