/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */

import chalk from "chalk";

const now = () => {
  const t = new Date(Date.now());
  return `[${t.getFullYear()}/${`${t.getMonth() + 1}`.padStart(2, "0")}/${`${t.getDate()}`.padStart(2, "0")} ${`${t.getHours()}`.padStart(2, "0")}:${`${t.getMinutes()}`.padStart(2, "0")}:${`${t.getSeconds()}`.padStart(2, "0")}]`;
};

export default {
  debug(...args: any[]) {
    console.log(chalk.blackBright(now()), chalk.yellowBright("INFO:"), ...args);
  },
  info(...args: any[]) {
    console.log(chalk.blackBright(now()), chalk.blueBright("INFO:"), ...args);
  },
  success(...args: any[]) {
    console.log(
      chalk.blackBright(now()),
      chalk.greenBright("SUCCESS:"),
      ...args
    );
  },
  warn(...args: any[]) {
    console.warn(chalk.blackBright(now()), chalk.yellow("WARN:"), ...args);
  },
  error(...args: any[]) {
    console.error(chalk.blackBright(now()), chalk.redBright("ERROR:"), ...args);
  },
  verbose(...args: any[]) {
    console.debug(chalk.blackBright(now()), chalk.gray("VERBOSE:"), ...args);
  },
  fatal(...args: any[]) {
    console.log(
      chalk.blackBright(now()),
      chalk.whiteBright.bgRedBright.bold("FATAL:"),
      ...args
    );
  },
  blank() {
    console.log("");
  },
};
