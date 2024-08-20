import { Hono } from "hono";
import { Feed, Item } from "feed";
import { History, db } from "@/db.ts";

const app = new Hono();

const feed = new Feed({
  title: "Kiiteitte",
  description: "Kiiteitte",
  id: "https://kw.sevenc7c.com",
  link: "https://kw.sevenc7c.com",
  language: "ja",
  image: "https://kw.sevenc7c.com/static/icon-256.png",
  copyright: "",
  feedLinks: {
    atom: "https://kiiteitte.com/feed/atom.xml",
    json: "https://kiiteitte.com/feed/feed.json",
  },
});

const generateItems = async (): Promise<Item[]> => {
  const histories = await db
    .query<History>("SELECT * FROM histories ORDER BY date DESC LIMIT 20")
    .then((r) => r.rows);

  return histories.map((history) => ({
    title: history.title,
    date: new Date(history.date),
    id: "https://kw.sevenc7c.com/history/" + history.id,
    link: "https://nicovideo.jp/watch/" + history.video_id,
    description: history.title,
    content: `Kiite Cafeできいてます https://cafe.kiite.jp/`,
  }));
};

app.get("/atom.xml", async (c) => {
  feed.items = await generateItems();
  c.header("Content-Type", "application/xml");
  return c.body(feed.atom1());
});

app.get("/feed.json", async (c) => {
  feed.items = await generateItems();
  c.header("Content-Type", "application/json");
  return c.body(feed.json1());
});

export default app;
