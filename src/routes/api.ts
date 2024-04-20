import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { host } from "@/env.js";
import { db } from "@/db.js";
import consola from "consola";

const api = new Hono();
const log = consola.withTag("api");

api.get(
  "/history",
  zValidator(
    "query",
    z.object({
      start: z.string().optional(),
    }),
  ),
  async (c) => {
    const start = c.req.valid("query").start;
    const history = (
      start
        ? await db.query<History>(
            "SELECT * FROM history WHERE date < (SELECT date FROM history WHERE id = $1) ORDER BY date DESC LIMIT 10",
            [parseInt(start)],
          )
        : await db.query<History>(
            "SELECT * FROM history ORDER BY date DESC LIMIT 10",
          )
    ).rows;
    return c.json(history);
  },
);

api.get(
  "/follow",
  zValidator(
    "query",
    z.object({ username: z.string().regex(/^@[^@]+@[^@]+$/) }),
  ),
  async (c) => {
    const username = c.req.valid("query").username;
    const [remoteName, remoteHost] = username.split("@").slice(1);
    log.info("follow", remoteName, remoteHost);
    let url: URL;
    try {
      url = new URL(
        `https://${remoteHost}/.well-known/webfinger?resource=acct:${remoteName}@${remoteHost}`,
      );
    } catch (e) {
      c.status(400);
      return c.json({ error: "Invalid host" });
    }
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      c.status(400);
      return c.json({ error: "Invalid host" });
    }
    const json: {
      links: { rel: string; template: string }[];
    } = await res.json();
    if (!json.links) {
      c.status(400);
      return c.json({ error: "Invalid host" });
    }
    const link = json.links.find(
      (l) => l.rel === "http://ostatus.org/schema/1.0/subscribe",
    );
    if (!link) {
      c.status(400);
      return c.json({ error: "Invalid host" });
    }
    const subscribeUrl = new URL(
      link.template.replace("{uri}", `kiiteitte@${host}`),
    );

    return c.json({ url: subscribeUrl.toString() });
  },
);

api.get("/nextTime", async (c) => {
  const nextSong = (await fetch(
    "https://cafe.kiite.jp/api/cafe/next_song",
  ).then((r) => r.json())) as { start_time: string };
  const time = new Date(nextSong.start_time).getTime();

  return c.json({ nextTime: time - Date.now() });
});

export default api;
