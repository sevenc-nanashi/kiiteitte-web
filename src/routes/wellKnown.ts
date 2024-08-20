import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { host } from "@/env.ts";

const wellKnown = new Hono();

wellKnown.get(
  "/webfinger",
  zValidator(
    "query",
    z.object({
      resource: z.string(),
    }),
  ),
  async (c) => {
    const resource = c.req.valid("query").resource;
    if (resource.startsWith("acct:")) {
      if (resource !== `acct:kiiteitte@${host}`) {
        c.status(404);
        return c.json({
          error: "Not Found",
        });
      }
      return c.json({
        subject: resource,
        links: [
          {
            rel: "self",
            type: "application/activity+json",
            href: `https://${host}/ap/kiiteitte`,
          },
        ],
      });
    }
  },
);

wellKnown.get("/nodeinfo", async (c) => {
  return c.json({
    links: [
      {
        rel: "http://nodeinfo.diaspora.software/ns/schema/2.1",
        href: `https://${host}/.well-known/nodeinfo/2.1`,
      },
    ],
  });
});
wellKnown.get("/nodeinfo/2.1", async (c) => {
  return c.json({
    openRegistrations: false,
    protocols: ["activitypub"],
    software: {
      name: "Kiiteitte",
      version: "0.1.0",
      homepage: "https://github.com/sevenc-nanashi/kiiteitte-web",
      repository: "https://github.com/sevenc-nanashi/kiiteitte-web",
    },
    usage: {
      users: {
        total: 1,
      },
    },
    services: {
      inbound: [],
      outbound: [],
    },
    metadata: {
      nodeName: "Kiiteitte",
      themeColor: "#333333",
      maintainer: {
        name: "Nanashi.",
        email: "sevenc7c@sevenc7c.com",
      },
    },
    version: "2.1",
  });
});
wellKnown.get("/host-meta", async (c) => {
  c.header("Content-Type", "application/xrd+xml");
  return c.body(
    `<?xml version="1.0"?>
<XRD xmlns="http://docs.oasis-open.org/ns/xri/xrd-1.0">
  <Link rel="lrdd" template="https://${host}/.well-known/webfinger?resource={uri}" />
</XRD>
`,
  );
});

export default wellKnown;
