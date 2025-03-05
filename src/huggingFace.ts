import { hfRepository } from "./env";
import { consola } from "consola";
import readLastLines from "read-last-lines";
import { promises as fs } from "node:fs";
import { Glob } from "bun";
import { db, History } from "./db";

const log = consola.withTag("huggingFace");
const root = `${import.meta.dirname}/../huggingface`;
export const setupHuggingFace = async () => {
  if (!hfRepository) {
    log.warn("Hugging Face integration is disabled");
    return;
  }

  if (await fs.stat(root).catch(() => null)) {
    log.info("Hugging Face repository already exists");
    return;
  }

  log.info(`Cloning Hugging Face repository into ${root}`);
  await Bun.spawn({ cmd: ["git", "clone", hfRepository, root] }).exited;
  if (!(await fs.stat(root).catch(() => null))) {
    throw new Error("Failed to clone repository");
  }

  log.info("Configuring repository");
  await Bun.spawn({
    cmd: ["git", "config", "user.email", "kiiteitte@kw.sevenc7c.com"],
    cwd: root,
  }).exited;
  await Bun.spawn({
    cmd: ["git", "config", "user.name", "Kiiteitte"],
    cwd: root,
  }).exited;

  log.info("Repository configured");
};

export const updateHuggingFace = async () => {
  if (!hfRepository) {
    log.warn("Hugging Face integration is disabled");
    return;
  }

  log.info("Updating Hugging Face repository");
  await Bun.spawn({ cmd: ["git", "reset", "--hard"], cwd: root }).exited;
  await Bun.spawn({ cmd: ["git", "pull", "--rebase"], cwd: root }).exited;
  log.info("Repository updated");

  const historyJsons = await Array.fromAsync(
    new Glob(`histories/**/*.jsonl`).scan(root),
  );
  historyJsons.sort();

  const lastHistory = historyJsons[historyJsons.length - 1];
  log.info(`Reading last history from ${lastHistory}`);
  const lastHistoryLine = JSON.parse(
    await readLastLines.read(`${root}/${lastHistory}`, 1),
  );
  let lastDate = new Date(lastHistoryLine.date);

  const fileHandles = new Map<string, fs.FileHandle>();
  while (true) {
    const unreadHistories = await db
      .query<History>(
        "SELECT * FROM histories WHERE date > $1 ORDER BY date LIMIT 100",
        [lastDate],
      )
      .then((r) => r.rows);
    if (unreadHistories.length === 0) {
      break;
    }
    log.info(
      `Found ${unreadHistories.length === 100 ? "100+" : unreadHistories.length} unread histories`,
    );
    for (const history of unreadHistories) {
      const date = new Date(history.date);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const dir = `${root}/histories/${year}`;
      const file = `${dir}/${month}.jsonl`;
      let handle = fileHandles.get(file);
      if (!handle) {
        if (!(await fs.stat(dir).catch(() => null))) {
          log.info(`Creating directory ${dir}`);
          await fs.mkdir(dir, { recursive: true });
        }
        handle = await fs.open(file, "a");
        fileHandles.set(file, handle);
      }
      await handle.write(JSON.stringify(history) + "\n");
    }

    lastDate = new Date(unreadHistories[unreadHistories.length - 1].date);
  }

  log.info("Closing file handles");
  for (const handle of fileHandles.values()) {
    await handle.close();
  }

  log.info("Histories written");

  log.info("Committing changes");
  await Bun.spawn({ cmd: ["git", "add", "."], cwd: root }).exited;
  const exitCode = await Bun.spawn({
    cmd: ["git", "commit", "-m", "chore: Update histories"],
    cwd: root,
  }).exited;
  if (exitCode !== 0) {
    log.warn("No changes to commit");
  } else {
    log.info("Changes committed");

    log.info("Pushing changes");
    await Bun.spawn({ cmd: ["git", "push"], cwd: root }).exited;
  }
};
