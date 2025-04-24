import { inspect } from 'node:util';

import c from 'chalk';

import { env } from '@/env';

const rawTime = () => {
  const time = new Date(Date.now());
  return [
    [
      time.getFullYear(),
      time.getMonth().toString().padStart(2, '0'),
      time.getDate().toString().padStart(2, '0'),
    ].join('/'),
    [
      time.getHours().toString().padStart(2, ' '),
      time.getMinutes().toString().padStart(2, '0'),
      time.getSeconds().toString().padStart(2, '0'),
    ].join(':'),
  ].join(' ');
};

const time = () => c.gray(rawTime());

const pad = (prefix = '') => {
  return prefix.padEnd(5, ' ');
};

const blank = ' '.repeat(rawTime().length + pad().length + 1);

const LoggerLevels = {
  Info: c.blueBright(pad('Info')),
  Warn: c.yellow(pad('Warn')),
  Error: c.red(pad('Error')),
  Debug: c.cyan.italic(pad('Debug')),
};

export default class Logger {
  static info(message: string) {
    const messages = message.split('\n').map((line, i) => i == 0
      ? `${time()} ${LoggerLevels.Info} ${c.white(line)}`
      : `${blank} ${c.white(line)}`)
      .join('\n');
    console.log(messages);
  }

  static error(message: string, ...args: unknown[]) {
    const messages = message.split('\n').map((line, i) => i == 0
      ? `${time()} ${LoggerLevels.Error} ${c.redBright(line)}`
      : `${blank} ${c.redBright(line)}`)
      .join('\n');
    console.error(messages);
    if (args.length) {
      for (const arg of args) {
        const inspected = inspect(arg, { depth: 5, colors: true });
        const inspectedMessages = inspected.split('\n').map((line, i) => i == 0
          ? `${time()} ${LoggerLevels.Error} ${line}`
          : `${blank} ${line}`)
          .join('\n');
        console.error(inspectedMessages);
      }
    }
  }

  static debug(message: string, ...args: unknown[]) {
    if (env.NODE_ENV != 'development') return;
    const messages = message.split('\n').map((line, i) => i == 0
      ? `${time()} ${LoggerLevels.Debug} ${c.gray.italic(line)}`
      : `${blank} ${c.gray.italic(line)}`)
      .join('\n');
    console.debug(messages);
    if (args.length) {
      console.debug(...args);
    }
  }
};
