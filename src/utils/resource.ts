import { Emoji } from './constant';

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
    parts.fill(Emoji.ProgressFilled, 1, 8);
    parts[middle] = Emoji.ProgressEndFilled;
  }
  else {
    parts[0] = Emoji.ProgressStartFilled;
    if (middle > 1) {
      parts.fill(Emoji.ProgressFilled, 1, middle - 1);
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
