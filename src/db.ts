import { Client } from "pg";
import { consola } from "consola";
import { dbConfig } from "./env.ts";

const log = consola.withTag("db");

type Version = {
  version: number;
};

export const db = new Client({
  ...dbConfig,
});

export type Follower = {
  id: number;
  url: string;
  inbox: string;
  shared_inbox: string;
};

export type Key = {
  id: string;
  key: string;
};

export type Like = {
  id: string;
  content: string;
  actor: string;
};

export type History = {
  id: number;
  video_id: string;
  title: string;
  author: string;
  date: string;
  thumbnail: string;
  pickup_user_url: string;
  pickup_user_name: string;
  pickup_user_icon: string;
  pickup_playlist_url: string;
  new_faves: number;
  spins: number;
  users: number;
};

export const setup = async () => {
  log.info("Connecting to database...");
  await db.connect();

  log.info("Checking version...");
  if (
    (await db
      .query("SELECT * FROM pg_catalog.pg_tables WHERE tablename = 'versions'")
      .then((r) => r.rowCount)) === 0
  ) {
    log.info("Creating version table...");
    await db.query("CREATE TABLE versions (version INT)");

    await db.query("INSERT INTO versions (version) VALUES (0)");
  }
  let version =
    (await db
      .query<Version>("SELECT * FROM versions")
      .then((r) => r.rows[0].version)) ?? 0;
  log.info(`Version: ${version ?? "N/A"}`);
  if (version === 0) {
    log.info("0: Creating followers table...");
    await db.query(
      "CREATE TABLE followers (id SERIAL PRIMARY KEY, url TEXT, inbox TEXT, sharedinbox TEXT)",
    );
    version++;
  }
  if (version === 1) {
    log.info("1: Creating keys table...");
    await db.query("CREATE TABLE keys (id TEXT PRIMARY KEY, key TEXT)");
    version++;
  }
  if (version === 2) {
    log.info("2: Creating history table...");
    await db.query(
      "CREATE TABLE history (" +
        "id SERIAL PRIMARY KEY, " +
        "videoid TEXT, " +
        "name TEXT, " +
        "date TIMESTAMP, " +
        "pickupuserurl TEXT, " +
        "pickupusername TEXT, " +
        "pickupusericon TEXT, " +
        "pickupplaylisturl TEXT, " +
        "newfaves INT, " +
        "spins INT" +
        ")",
    );
    version++;
  }
  if (version === 3) {
    log.info("3: Altering history table...");
    await db.query(
      "ALTER TABLE history ADD COLUMN author TEXT, ADD COLUMN thumbnail TEXT",
    );
    version++;
  }
  if (version === 4) {
    log.info("4: Creating likes table...");
    await db.query(
      "CREATE TABLE likes (id TEXT PRIMARY KEY, content TEXT, target_id INT, actor TEXT)",
    );
    log.info("4: Changing case...");
    await db.query("ALTER TABLE history RENAME COLUMN videoid TO video_id");
    await db.query(
      "ALTER TABLE history RENAME COLUMN pickupuserurl TO pickup_user_url",
    );
    await db.query(
      "ALTER TABLE history RENAME COLUMN pickupusername TO pickup_user_name",
    );
    await db.query(
      "ALTER TABLE history RENAME COLUMN pickupusericon TO pickup_user_icon",
    );
    await db.query(
      "ALTER TABLE history RENAME COLUMN pickupplaylisturl TO pickup_playlist_url",
    );
    await db.query("ALTER TABLE history RENAME COLUMN newfaves TO new_faves");
    await db.query(
      "ALTER TABLE followers RENAME COLUMN sharedinbox TO shared_inbox",
    );

    version++;
  }
  if (version === 5) {
    log.info("5: Dropping likes table...");
    await db.query("DROP TABLE likes");
    version++;
  }
  if (version === 6) {
    log.info("6: Renaming history table...");
    await db.query("ALTER TABLE history RENAME TO histories");
    await db.query("ALTER TABLE histories RENAME COLUMN name TO title");
    version++;
  }
  if (version === 7) {
    log.info("7: Adding unique constraint to followers table...");
    const followers = await db.query<Follower>("SELECT * FROM followers");
    for (const follower of followers.rows) {
      await db.query("DELETE FROM followers WHERE id = $1", [follower.id]);
    }
    await db.query(
      "ALTER TABLE followers ADD CONSTRAINT unique_url UNIQUE (url)",
    );
    const uniqueFollowers = new Set<string>();
    for (const follower of followers.rows) {
      if (uniqueFollowers.has(follower.url)) {
        continue;
      }
      uniqueFollowers.add(follower.url);
      await db.query(
        "INSERT INTO followers (url, inbox, shared_inbox) VALUES ($1, $2, $3)",
        [follower.url, follower.inbox, follower.shared_inbox],
      );
    }
    version++;
  }
  if (version === 8) {
    log.info("8: Adding users column to histories table...");
    await db.query("ALTER TABLE histories ADD COLUMN users INT");
    version++;
  }

  log.info("Committing changes...");
  await db.query("UPDATE versions SET version = $1", [version]);

  log.info("Database setup complete!");
};
