import { bold as b } from 'discord.js';

export interface RubyText {
  text: string;
  ruby?: string;
}

export function parseRubyText(text: string): RubyText[] {
  const matches = text.matchAll(/(?:{(.*?)}\((.*?)\))|(?:(.+?)(?={))|(?:(.+)$)/g);
  const result: RubyText[] = [];

  for (const match of matches) {
    result.push({
      text: match[1] ?? match[3] ?? match[4],
      ruby: match[2],
    });
  }

  return result;
}

const DiscordFootNoteScale = 0.8125;

function padText(maxLength: number, text: string, scale = 1) {
  const size = ((maxLength - calculateTextLength(text) * scale)) / (2 * scale);
  let length = size;
  let spaces = '';

  if (length >= 1) {
    spaces += ' '.repeat(Math.trunc(length));
    length = length - Math.trunc(length);
  }

  length *= 2;

  if (length >= 1) {
    spaces += ' '.repeat(Math.trunc(length));
    length = length - Math.trunc(length);
  }

  length *= 2;

  if (length > 0) {
    spaces += ' '.repeat(Math.round(length / scale));
  }

  return `${spaces}${text}${spaces}`;
}

function spacing(length: number) {
  let spaces = '';

  if (length >= 1) {
    spaces += ' '.repeat(Math.trunc(length));
    length = length - Math.trunc(length);
  }

  length *= 2;

  if (length >= 1) {
    spaces += ' '.repeat(Math.trunc(length));
    length = length - Math.trunc(length);
  }

  length *= 2;

  if (length >= 1) {
    spaces += ' '.repeat(Math.trunc(length));
  }

  return spaces;
}

function calculateTextLength(text: string) {
  let spaceCount = 0;

  for (const char of text) {
    if (/\p{Script=Han}|\p{Script=Katakana}|\p{Script=Hiragana}|[︐-｝￢-￥　]/u.test(char)) {
      spaceCount += 1;
    }
    else {
      spaceCount += 0.5;
    }
  }

  return spaceCount;
}

export function formatRubyText(data: RubyText[], bold = false): string {
  let rubyLine = '';
  let textLine = '';

  for (const item of data) {
    const text = item.text;
    const ruby = item.ruby;

    const textLength = calculateTextLength(text);

    if (ruby) {
      const rubyLength = calculateTextLength(ruby) * DiscordFootNoteScale;
      const diff = rubyLength - textLength;

      if (diff > 0) {
        rubyLine += ruby;
        textLine += padText(rubyLength, text);
      }
      else if (diff < 0) {
        textLine += text;
        rubyLine += padText(textLength, ruby, DiscordFootNoteScale);
      }
      else {
        textLine += text;
        rubyLine += ruby;
      }
    }
    else {
      textLine += text;
      rubyLine += spacing(textLength / DiscordFootNoteScale);
    }
  }

  /*
    ​    いろ
    ​しあわせ 色 なら OK

    ​      て  の        さき
    ​きみと手を伸ばすオーブンの 先 ...

    ​        て    の        さき
    ​きみと手を伸ばすオーブンの 先 ...
  */

  rubyLine = rubyLine.trimEnd();
  textLine = textLine.trimEnd();

  if (bold) {
    if (rubyLine.length > 0) {
      rubyLine = b(rubyLine);
    }
    if (textLine.length > 0) {
      textLine = b(textLine);
    }
  }

  // eslint-disable-next-line no-irregular-whitespace
  return `-# ​${rubyLine}\n​${textLine}`;
}

export function findInclude(target: string, array: string[]) {
  const a = array.map((v) => v.split('.')[0]);
  for (let i = 0, n = a.length; i < n; i++) {
    if (target.includes(a[i])) return array[i];
  }
  return null;
}
