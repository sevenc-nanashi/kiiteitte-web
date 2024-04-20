import { Hono } from "hono";
import {
  APAccept,
  APActor,
  APOrderedCollection,
  APOrderedCollectionPage,
  APRoot,
} from "activitypub-types";
import { host } from "@/env.js";
import { Follower, db } from "@/db.js";
import { z } from "zod";
import { httpSignature } from "@/middleware.js";
import { consola } from "consola";
import { signRequest } from "@/signature.js";
import { noteToCreateActivity, historyToActivity } from "@/activity.js";

const log = consola.withTag("ap");

const ap = new Hono();

ap.use(httpSignature);

ap.get("/kiiteitte", async (c) => {
  const publicKey = Bun.file("./key/public.pem");
  const publicKeyPem = await publicKey.text();
  const publicKeyStat = publicKey.lastModified;
  c.header("Content-Type", "application/activity+json");
  return c.body(
    JSON.stringify({
      "@context": [
        "https://www.w3.org/ns/activitystreams",
        "https://w3id.org/security/v1",
      ],

      id: `https://${host}/ap/kiiteitte`,
      url: `https://${host}`,
      name: "Kiiteitte",
      type: "Service",
      tag: [],
      discoverable: true,
      preferredUsername: "kiiteitte",
      summary:
        `<p><a href="https://cafe.kiite.jp" target="_blank">Kiite Cafe</a> の曲を通知するBot。<br><br>` +
        `開発：<a href="https://voskey.icalo.net/@sevenc_nanashi" target="_blank">名無し｡</a><br>` +
        `ソースコード：<a href="https://github.com/sevenc-nanashi/kiiteitte-web" target="_blank">sevenc-nanashi/kiiteitte-web</a><br>` +
        `原作者：<a href="https://twitter.com/Zect3279" target="_blank">Zect</a>、<a href="https://twitter.com/melodynade" target="_blank">melonade</a>` +
        `</a></p>`,
      _misskey_summary:
        "[Kiite Cafe](https://cafe.kiite.jp) の曲を通知するBot。\n\n" +
        "開発：[名無し｡](https://voskey.icalo.net/@sevenc_nanashi)（@sevenc_nanashi@voskey.icalo.net）\n" +
        "ソースコード：[sevenc-nanashi/kiiteitte-web](https://github.com/sevenc-nanashi/kiiteitte-web)\n" +
        "原作者：[Zect](https://twitter.com/Zect3279)、[melonade](https://twitter.com/melodynade)（@melonade@fedibird.com）",
      inbox: `https://${host}/ap/inbox`,
      outbox: `https://${host}/ap/outbox`,
      sharedInbox: `https://${host}/ap/inbox`,
      followers: `https://${host}/ap/followers`,
      following: `https://${host}/ap/following`,

      alsoKnownAs: ["https://vocalodon.net/users/kiiteitte"],

      icon: {
        type: "Image",
        mediaType: "image/png",
        url: `https://${host}/static/icon.png`,
      },
      image: {
        type: "Image",
        mediaType: "image/png",
        url: `https://${host}/static/bg.png`,
      },

      publicKey: {
        id: `https://${host}/ap/kiiteitte#main-key`,
        owner: `https://${host}/ap/kiiteitte`,
        publicKeyPem,
      },

      startTime: new Date(publicKeyStat).toISOString(),
      manuallyApprovesFollowers: false,
      attachment: [],
    } as APRoot<APActor>),
  );
});

ap.get("/following", async (c) => {
  c.header("Content-Type", "application/activity+json");
  if (c.req.query("page") === "true") {
    return c.body(
      JSON.stringify({
        "@context": [
          "https://www.w3.org/ns/activitystreams",
          "https://w3id.org/security/v1",
        ],
        id: `https://${host}/ap/following?page=true`,
        type: "OrderedCollectionPage",
        partOf: `https://${host}/ap/following`,
        next: `https://${host}/ap/following`,
        totalItems: 1,
        orderedItems: ["https://voskey.icalo.net/users/9d8sfcv0qj"],
      } as APRoot<APOrderedCollectionPage>),
    );
  }
  return c.body(
    JSON.stringify({
      "@context": [
        "https://www.w3.org/ns/activitystreams",
        "https://w3id.org/security/v1",
      ],
      id: `https://${host}/ap/following`,
      type: "OrderedCollection",
      totalItems: 1,
      first: {
        type: "Link",
        href: `https://${host}/ap/following?page=true`,
      },
    } as APRoot<APOrderedCollection>),
  );
});

ap.get("/followers", async (c) => {
  c.header("Content-Type", "application/activity+json");
  const followersCount = await db
    .query<{ count: string }>("SELECT COUNT(*) FROM followers")
    .then((r) => parseInt(r.rows[0].count));

  if (c.req.query("page") === "true") {
    const startId = parseInt(c.req.query("from") ?? "0");
    const followers = await db.query<Follower>(
      "SELECT * FROM followers ORDER BY id WHERE id > $1 LIMIT 10",
      [startId],
    );
    return c.body(
      JSON.stringify({
        "@context": [
          "https://www.w3.org/ns/activitystreams",
          "https://w3id.org/security/v1",
        ],
        id: `https://${host}/ap/followers?page=true`,
        type: "OrderedCollectionPage",
        partOf: `https://${host}/ap/followers`,
        next: `https://${host}/ap/followers?from=${followers.rows[followers.rows.length - 1].id}&page=true`,
        totalItems: followersCount,
        orderedItems: followers.rows.map((f) => f.url),
      } as APRoot<APOrderedCollectionPage>),
    );
  }

  return c.body(
    JSON.stringify({
      "@context": [
        "https://www.w3.org/ns/activitystreams",
        "https://w3id.org/security/v1",
      ],
      id: `https://${host}/ap/followers`,
      type: "OrderedCollection",
      totalItems: followersCount,
      first: {
        type: "Link",
        href: `https://${host}/ap/followers?page=true`,
      },
    } as APRoot<APOrderedCollection>),
  );
});

const urlOrLink = (base: string | { id: string }) =>
  typeof base === "string" ? base : base.id;

ap.post("/inbox", async (c) => {
  const data = await c.req.json();
  if (data.type === "Follow") {
    const validatedData = z
      .object({
        type: z.literal("Follow"),
        actor: z
          .string()
          .url()
          .or(z.object({ id: z.string().url() })),
        object: z
          .string()
          .url()
          .or(z.object({ id: z.string().url() })),
      })
      .safeParse(data);
    if (!validatedData.success) {
      c.status(400);
      return c.json({
        error: "Bad Request",
      });
    }
    if (
      urlOrLink(validatedData.data.object) !== `https://${host}/ap/kiiteitte`
    ) {
      c.status(404);
      return c.json({
        error: "Not Found",
      });
    }
    const actor = urlOrLink(validatedData.data.actor);
    const userInfo = await fetch(actor, {
      headers: {
        Accept: "application/activity+json",
      },
    })
      .then((r) => r.json())
      .then(
        z.object({
          id: z.string().url(),
          inbox: z.string().url(),
          sharedInbox: z.string().url().optional(),
        }).parse,
      )
      .catch((err) => {
        log.error(`Failed to fetch actor: ${err}`);
        return undefined;
      });
    if (!userInfo) {
      c.status(404);
      return c.json({
        error: "Not Found",
      });
    }
    log.info(`Followed by ${userInfo.id}`);

    c.header("Content-Type", "application/activity+json");
    const accept = {
      "@context": [
        "https://www.w3.org/ns/activitystreams",
        "https://w3id.org/security/v1",
      ],
      type: "Accept",
      actor: `https://${host}/ap/kiiteitte`,
      object: data,
    } as APRoot<APAccept>;

    const inboxUrl = new URL(userInfo.inbox);
    const headers = await signRequest("POST", JSON.stringify(accept), inboxUrl);
    const result = await fetch(inboxUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(accept),
    });
    if (result.status.toString().startsWith("2")) {
      log.info(`Accepted follow request from ${userInfo.id}`);
      if (
        !(await db
          .query("SELECT * FROM followers WHERE url = $1", [userInfo.id])
          .then((r) => r.rowCount))
      ) {
        await db.query<Follower>(
          "INSERT INTO followers (url, inbox, shared_inbox) VALUES ($1, $2, $3)",
          [userInfo.id, userInfo.inbox, userInfo.sharedInbox],
        );
      }
      c.status(204);
      return c.body("");
    }
    log.warn(
      `Failed to send Accept: ${await result.text().then((t) => t.split("\n")[0])}`,
    );

    c.status(500);
    return c.json({
      error: "Internal Server Error",
    });
  } else if (data.type === "Undo") {
    const validatedData = z
      .object({
        type: z.literal("Undo"),
        actor: z
          .string()
          .url()
          .or(z.object({ id: z.string().url() })),
        object: z.object({
          type: z.literal("Follow"),
          object: z
            .string()
            .url()
            .or(z.object({ id: z.string().url() })),
        }),
      })
      .safeParse(data);
    if (!validatedData.success) {
      c.status(400);
      return c.json({
        error: "Bad Request",
      });
    }
    if (
      urlOrLink(validatedData.data.object.object) !==
      `https://${host}/ap/kiiteitte`
    ) {
      c.status(404);
      return c.json({
        error: "Not Found",
      });
    }

    await db.query("DELETE FROM followers WHERE url = $1", [
      urlOrLink(validatedData.data.actor),
    ]);

    log.info(`Unfollowed by ${urlOrLink(validatedData.data.actor)}`);

    c.status(204);
    return c.body("");
  } else {
    log.info(`Unsupported type: ${data.type}`);
    c.status(204);
    return c.body("");
  }
});

ap.get("/outbox", async (c) => {
  c.header("Content-Type", "application/activity+json");
  const historyCount = await db
    .query<{ count: string }>("SELECT COUNT(*) FROM histories")
    .then((r) => parseInt(r.rows[0].count));
  if (c.req.query("page") === "true") {
    const offset = parseInt(c.req.query("offset") ?? "0");
    const history = await db.query(
      "SELECT * FROM histories ORDER BY date DESC OFFSET $1 LIMIT 10",
      [offset],
    );
    return c.body(
      JSON.stringify({
        "@context": [
          "https://www.w3.org/ns/activitystreams",
          "https://w3id.org/security/v1",
        ],
        id: `https://${host}/ap/outbox?page=true`,
        type: "OrderedCollectionPage",
        partOf: `https://${host}/ap/outbox`,
        next: `https://${host}/ap/outbox?offset=${offset + 10}&page=true`,
        prev: `https://${host}/ap/outbox?offset=${offset - 10}&page=true`,
        totalItems: historyCount,
        orderedItems: history.rows.map((h) =>
          noteToCreateActivity(historyToActivity(h)),
        ),
      } as APRoot<APOrderedCollectionPage>),
    );
  }
  return c.body(
    JSON.stringify({
      "@context": [
        "https://www.w3.org/ns/activitystreams",
        "https://w3id.org/security/v1",
      ],
      id: `https://${host}/ap/outbox`,
      type: "OrderedCollection",
      totalItems: historyCount,
      first: {
        type: "Link",
        href: `https://${host}/ap/outbox?page=true&offset=0`,
      },
      last: {
        type: "Link",
        href: `https://${host}/ap/outbox?page=true&offset=${historyCount - 10}`,
      },
    } as APRoot<APOrderedCollection>),
  );
});

ap.get("/history/:id", async (c) => {
  const history = await db.query("SELECT * FROM histories WHERE id = $1", [
    parseInt(c.req.param("id")),
  ]);
  if (history.rowCount === 0) {
    c.status(404);
    return c.json({
      error: "Not Found",
    });
  }
  c.header("Content-Type", "application/activity+json");
  return c.body(JSON.stringify(historyToActivity(history.rows[0])));
});

export default ap;
