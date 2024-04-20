export const host = Bun.env.HOST;
if (!host) {
  throw new Error("HOST is required");
}
