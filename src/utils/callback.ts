import Logger from "./logger";

export const logError = (e: unknown) => {
  Logger.error(`Error`, e);
};