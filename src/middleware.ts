import { MiddlewareHandler } from "hono";
import { parseRequest, verifySignature } from "http-signature";
import { Key, db } from "./db.js";
import { consola } from "consola";
import { z } from "zod";

const key = z.object({
  publicKey: z.object({
    id: z.string(),
    publicKeyPem: z.string(),
  }),
});

export const httpSignature: MiddlewareHandler = async (c, next) => {
  if (c.req.raw.method === "GET") {
    return next();
  }
  const log = consola.withTag("httpSignature");
  log.info("Verifying signature");
  // @ts-expect-error 強引に型を合わせる
  const parsedHeader = parseRequest({
    headers: c.req.raw.headers.toJSON(),
    method: c.req.raw.method,
    url: c.req.path,
  } as unknown);
  let keyRecord = await db.query<Key>("SELECT * FROM keys WHERE id = $1", [
    parsedHeader.params.keyId,
  ]);
  let keyPem: string;
  if (keyRecord.rowCount === 0) {
    log.info(`Key not found: ${parsedHeader.params.keyId}`);
    const response = await fetch(parsedHeader.params.keyId, {
      headers: {
        Accept: "application/activity+json",
      },
    })
      .then((r) => r.json())
      .catch(() => null);
    if (!response) {
      log.error(`Failed to fetch key: ${parsedHeader.params.keyId}`);
      c.status(404);
      return c.json({
        error: "Not Found",
      });
    }
    const parseResult = key.safeParse(response);
    if (!parseResult.success) {
      log.error(`Failed to parse key: ${parsedHeader.params.keyId}`);
      c.status(400);
      return c.json({
        error: "Bad Request",
      });
    }
    if (parseResult.data.publicKey.id !== parsedHeader.params.keyId) {
      log.error(`Key ID mismatch: ${parsedHeader.params.keyId}`);
      c.status(400);
      return c.json({
        error: "Bad Request",
      });
    }
    await db.query("INSERT INTO keys (id, key) VALUES ($1, $2)", [
      parseResult.data.publicKey.id,
      parseResult.data.publicKey.publicKeyPem,
    ]);
    keyPem = parseResult.data.publicKey.publicKeyPem;
    log.info(`Key inserted: ${parsedHeader.params.keyId}`);
  } else {
    keyPem = keyRecord.rows[0].key;
    log.info(`Key found: ${parsedHeader.params.keyId}`);
  }

  const success = verifySignature(parsedHeader, keyPem);

  if (!success) {
    log.error("Signature verification failed");
    c.status(401);
    return c.json({
      error: "Unauthorized",
    });
  }

  log.info("Signature verified");

  await next();
};
