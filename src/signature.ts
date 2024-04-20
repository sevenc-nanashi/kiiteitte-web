import { signRequest as signRequestRaw } from "http-signature";
import { host } from "./env.js";
import { createHash } from "crypto"

export const signRequest = async (
  method: string,
  body: string,
  url: URL,
): Promise<Record<string, string>> => {
  const bodyHash = createHash("sha-256")
    .update(body)
    .digest("base64");

  const headers: Record<string, string> = {
    Date: new Date().toUTCString(),
    Host: url.host,
    Digest: `sha-256=${bodyHash}`,
    "Content-Type": "application/activity+json",
  };
  const req = {
    setHeader: (name: string, value: string) => {
      headers[name] = value;
    },
    getHeader: (name: string) =>
      Object.entries(headers).find(
        ([k]) => k.toLowerCase() === name.toLowerCase(),
      )?.[1],
    method,
    path: url.pathname + url.search,
    _stringToSign: "",
  };
  signRequestRaw(
    // @ts-expect-error 強引に型を合わせる
    req as unknown,
    {
      key: await Bun.file("./key/private.pem").text(),
      keyId: `https://${host}/ap/kiiteitte#main-key`,
      authorizationHeaderName: "Signature",
      headers: ["(request-target)", "host", "digest", "date"],
    },
  );
  return headers;
};
