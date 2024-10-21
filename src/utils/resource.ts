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

const metadataTree = (() => {
  const assetsPath = resolve('src', 'assets', 'metadata');
  const metadata: Record<string, string[]> = {};
  for (const artist of readdirSync(assetsPath)) {
    const artistPath = resolve(assetsPath, artist);
    metadata[artist] = readdirSync(artistPath).map((v) => v.split('.')[0]);
  }
  return metadata;
})();
const artists = Object.keys(metadataTree);

export function getMetadata(target: string): KamiMetadata | null {
  let path: string | null = null;

  const artist = findInclude(target, artists);

  if (artist) {
    const title = findInclude(target, metadataTree[artist]);
    if (title) {
      path = resolve('src', 'assets', 'metadata', artist, `${title}.json`);
    }
  }
  else {
    for (let i = 0, n = artists.length; i < n; i++) {
      const a = artists[i];
      const titles = metadataTree[a];
      const t = findInclude(target, titles);
      if (t) {
        path = resolve('src', 'assets', 'metadata', a, `${t}.json`);
      }
    }
  }

  if (!path) return null;

  try {
    const { $schema: _, ...metadata } = JSON.parse(readFileSync(path, 'utf-8')) as KamiMetadataJson;
    let hasRuby = false;

    const lyrics = metadata.lyrics.map((v) => {
      const line = parseRubyText(v.line);

      for (const block of line) {
        if (block.ruby) {
          hasRuby = true;
          break;
        }
      }

      return { ...v, line };
    });

    return {
      ...metadata,
      lyrics,
      hasRuby,
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
  const next = lyrics[currentIndex + 1];
  const current = inInterlude
    ? {
      from: prev.to,
      to: next.from,
      line: parseRubyText('♪'),
      translation: '',
    }
    : isEnd
      ? lyrics.at(-1)!
      : lyrics[currentIndex];

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
