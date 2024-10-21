import { parse, resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';

import Logger from '@/utils/logger';
import chalk from 'chalk';

const args = process.argv;
const pathString = args[2];

if (!pathString) {
  Logger.error('No input file provided');
  process.exit(1);
}

const file = parse(pathString);

if (file.ext != '.srt') {
  Logger.error('Input file is not a srt file');
  process.exit(1);
}

const data = readFileSync(resolve(pathString), { encoding: 'utf-8' }).split(/\r?\n/);

if (data.length % 5 != 1) {
  Logger.error('Input file is not a valid srt file');
  process.exit(1);
}

const toMilliseconds = (str: string) => {
  const [t, ms] = str.split(',');
  const [h, m, s] = t.split(':');
  return ((+h) * 60 * 60 * 1000) + ((+m) * 60 * 1000) + ((+s) * 1000) + (+ms);
};

interface SrtData {
  from: number;
  to: number;
  line: string;
  translation: string;
}

const parsed: Partial<SrtData>[] = [];

for (let i = 0, n = data.length; i < n; i++) {
  const l = Math.trunc(i / 5);
  const c = i % 5;
  if (c == 0 || c == 4) continue;
  const line = data[i];

  if (c == 1) {
    const [start, end] = line.split(' --> ');
    parsed[l] = {
      from: toMilliseconds(start),
      to: toMilliseconds(end),
      line: '',
    };
  }

  if (c == 2) {
    parsed[l].line = line.replaceAll(/(?:\[(.*?)\]\((.*?)\))/g, '{$1}($2)');
  }

  if (c == 3) {
    parsed[l].translation = line;
  }
}

const writePath = resolve(file.dir, `${file.name}.json`);

writeFileSync(
  writePath,
  JSON.stringify(parsed),
);

console.log('');
console.log(chalk.green(`✅ 已將歌曲資料寫至 ${writePath}`));

process.exit(0);
