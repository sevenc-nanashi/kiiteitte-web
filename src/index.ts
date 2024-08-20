import { Hono } from "hono";
import { setup as setupDb } from "./db.ts";
import { consola } from "consola";
import wellKnown from "./routes/wellKnown.ts";
import ap from "./routes/ap.ts";
import api from "./routes/api.ts";
import feed from "./routes/feed.ts";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { cafeWatcher } from "./cafeWatcher.ts";

const log = consola.withTag("index");

log.info(`Starting Kiiteitte in ${Bun.env.NODE_ENV} mode`);

const app = new Hono();

app.use(logger(consola.withTag("http").info));
app.use("/static/*", serveStatic({ root: "./" }));

app.route("/.well-known", wellKnown);
app.route("/ap", ap);
app.route("/api", api);
app.route("/feed", feed);

app.get("/manifest.json", (c) => {
  return c.json({
    name: "Kiiteitte",
    short_name: "Kiiteitte",
    start_url: "/",
    display: "standalone",
    theme_color: "#00ffff",
    icons: [
      {
        src: "/static/icon-256.png",
        sizes: "256x256",
        type: "image/png",
      },
    ],
  });
});

if (Bun.env.NODE_ENV === "development") {
  log.info("Development mode detected, proxying requests to localhost:5173");
  app.get("*", (c) => {
    const url = new URL(c.req.url);
    url.hostname = "localhost";
    url.port = "5173";
    url.protocol = "http";
    return fetch(url);
  });
} else {
  log.info("Production mode detected, serving static files");
  app.use(serveStatic({ root: "./dist" }));
}


await setupDb();
cafeWatcher();

export default { ...app, port: Bun.env.PORT };
