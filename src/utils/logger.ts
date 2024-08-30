import c from "chalk";

const getCurrentTime = () => {
  const time = new Date(Date.now());
  return [
    [
      time.getFullYear(),
      time.getMonth().toString().padStart(2, "0"),
      time.getDate().toString().padStart(2, "0"),
    ].join("/"),
    [
      time.getHours().toString().padStart(2, " "),
      time.getMinutes().toString().padStart(2, "0"),
      time.getSeconds().toString().padStart(2, "0"),
    ].join(":"),
  ].join(" ");
};

const pad = (prefix: string) => {
  return prefix.padEnd(5, " ");
};

export default class Logger {
  static info(message: string) {
    const time = getCurrentTime();
    console.log(`${c.gray(time)} ${c.blueBright(pad("Info"))} ${c.white(message)}`);
  }
  
  static error(message: string, ...args: unknown[]) {
    const time = getCurrentTime();
    console.error(`${c.gray(time)} ${c.red(pad("Error"))} ${c.redBright(message)}`);
    console.error(...args);
  }
  
  static debug(message: string) {
    const time = getCurrentTime();
    console.log(`${c.gray(time)} ${c.cyan.italic(pad("Debug"))} ${c.gray.italic(message)}`);
  }
};
