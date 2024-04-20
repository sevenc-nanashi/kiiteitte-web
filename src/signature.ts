import { signRequest as signRequestRaw } from "http-signature";
import { host } from "./env.js";

export const signRequest = async (
  method: string,
  url: URL,
): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    date: new Date().toUTCString(),
    host: url.host,
    "content-type": "application/ld+json",
  };
  const req = {
    setHeader: (name: string, value: string) => {
      headers[name] = value;
    },
    getHeader: (name: string) => headers[name],
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
      headers: ["(request-target)", "host"],
    },
  );
  return headers;
};
