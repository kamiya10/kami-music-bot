import { findInclude, parseRubyText } from './string';
import { readFileSync, readdirSync } from 'fs';
import { Emoji } from './constant';
import { resolve } from 'path';

import type { KamiLyric, KamiMetadata, KamiMetadataJson } from '@/core/resource';

const titleCleanupRegex = /(^(?:【|「|\(|\[|（).*?(?:】|\)|\]|）))|((?:【|\(|\[|（).*?(?:】|」|\)|\]|）)$)/gi;

export const cleanupTitle = (title: string) => {
  return title
    .replaceAll(titleCleanupRegex, '')
    .trim()
    .replaceAll(/((?:【|「|\(|\[|（)?\w*歌ってみた\w*(?:】|\)|\]|）)?)/gi, '')
    .replaceAll(/((?:【|「|\(|\[|（)?\w*cover(?:ed)?(?:\wby)?\w*(?:】|\)|\]|）)?)/gi, '');
};

export const progress = (percentage: number) => {
  const parts: string[] = [
    Emoji.ProgressStart,
    Emoji.Progress,
    Emoji.Progress,
    Emoji.Progress,
    Emoji.Progress,
    Emoji.Progress,
    Emoji.Progress,
    Emoji.Progress,
    Emoji.Progress,
    Emoji.ProgressEnd,
  ];

  const middle = Math.floor(percentage / 10);

  if (middle == 0) {
    parts[middle] = Emoji.ProgressStartMiddle;
  }
  else if (middle == 9) {
    parts[0] = Emoji.ProgressStartFilled;
    parts.fill(Emoji.ProgressFilled, 1, 9);
    parts[middle] = Emoji.ProgressEndMiddle;
  }
  else {
    parts[0] = Emoji.ProgressStartFilled;
    if (middle > 1) {
      parts.fill(Emoji.ProgressFilled, 1, middle);
    }
    parts[middle] = Emoji.ProgressMiddle;
  }

  return parts.join('');
};

export const formatDuration = (miliseconds: number) => {
  let n = Math.trunc(miliseconds / 1000);

  const seconds = n % 60;
  n = Math.trunc(n / 60);

  const minutes = n % 60;
  n = Math.trunc(n / 60);

  const hours = n % 60;
  n = Math.trunc(n / 60);

  const parts = [
    `${minutes}`.padStart(2, '0'),
    `${seconds}`.padStart(2, '0'),
  ];

  if (hours > 0) {
    parts.unshift(`${hours}`);
  }

  return parts.join(':');
};

export function getMetadata(target: string): KamiMetadata | null {
  const assetsPath = resolve('src', 'assets', 'metadata');

  const artist = findInclude(target, readdirSync(assetsPath));
  if (!artist) return null;

  const artistPath = resolve(assetsPath, artist);

  const title = findInclude(target, readdirSync(artistPath));
  if (!title) return null;

  try {
    const metadataPath = resolve(artistPath, title);
    const { $schema: _, ...metadata } = JSON.parse(readFileSync(metadataPath, 'utf-8')) as KamiMetadataJson;

    return {
      ...metadata,
      lyrics: metadata.lyrics.map((v) => ({ ...v, line: parseRubyText(v.line) })),
    };
  }
  catch (_) {
    return null;
  }
}

export function getLyricsAtTime(timestamp: number, lyrics: KamiLyric[]): {
  prev?: KamiLyric;
  current: KamiLyric;
  next?: KamiLyric;
} {
  let currentIndex = lyrics.findIndex((v) => timestamp >= v.from && timestamp < v.to);
  let inInterlude = false;

  if (currentIndex == -1) {
    currentIndex = lyrics.findIndex((v, i, a) => timestamp >= v.to && timestamp < a[i + 1]?.from);
    if (currentIndex != -1) {
      inInterlude = true;
    }
  }

  const isStart = timestamp < lyrics[0].from;
  const isEnd = timestamp >= lyrics.at(-1)!.to;

  const prev = inInterlude ? lyrics[currentIndex] : lyrics[currentIndex - 1];
  const current = inInterlude
    ? {
      from: prev.from,
      to: prev.to,
      line: parseRubyText('♪'),
      translation: '',
    }
    : isEnd
      ? lyrics.at(-1)!
      : lyrics[currentIndex];
  const next = lyrics[currentIndex + 1];

  if (isStart) {
    return {
      current: {
        from: 0,
        to: next.to,
        line: parseRubyText('*start*'),
        translation: '',
      },
      next: next,
    };
  }

  if (isEnd) {
    return {
      prev: current,
      current: {
        from: current.to,
        to: Infinity,
        line: parseRubyText('*end*'),
        translation: '',
      },
    };
  }

  return {
    prev: prev,
    current: current,
    next: next,
  };
}
