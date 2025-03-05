import { consola } from "consola";

const log = consola.withTag("index");

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
};

export const host = getEnv("HOST");

export const dbConfig = {
  user: getEnv("DB_USER"),
  password: getEnv("DB_PASSWORD"),
  host: getEnv("DB_HOST"),
  port: parseInt(getEnv("DB_PORT")),
  database: getEnv("DB_NAME"),
};

export const gasUrl = process.env["GAS_URL"];
export const hfRepository = process.env["HF_REPOSITORY"];

log.info(`HOST: ${host}`);
log.info(
  `Database: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port} as ${dbConfig.user}`,
);

log.info(`Google Apps Script: ${gasUrl || "(disabled)"}`);
log.info(`Hugging Face Repository: ${hfRepository ? "enabled" : "disabled"}`);
