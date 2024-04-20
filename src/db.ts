import { Client } from "pg";
import { consola } from "consola";

const log = consola.withTag("db");

type Version = {
  version: number;
};

export const db = new Client({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT!),
  database: process.env.DB_NAME,
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
  name: string;
  author: string;
  date: string;
  thumbnail: string;
  pickup_user_url: string;
  pickup_user_name: string;
  pickup_user_icon: string;
  pickup_playlist_url: string;
  new_faves: number;
  spins: number;
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
    await db.query("ALTER TABLE followers RENAME COLUMN sharedinbox TO shared_inbox");

    version++;
  }
  if (version === 5) {
    log.info("5: Dropping likes table...");
    await db.query("DROP TABLE likes");
    version++;
  }

  log.info("Committing changes...");
  await db.query("UPDATE versions SET version = $1", [version]);

  log.info("Database setup complete!");
};
