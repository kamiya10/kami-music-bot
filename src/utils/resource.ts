
const titleCleanupRegex = /(^(?:【|「|\(|\[|（).*?(?:】|\)|\]|）))|((?:【|\(|\[|（).*?(?:】|」|\)|\]|）)$)/gi;

export const cleanupTitle = (title:string) => {
  return title
    .replaceAll(titleCleanupRegex, '')
    .trim()
    .replaceAll(/((?:【|「|\(|\[|（)?歌ってみた(?:】|\)|\]|）)?)/gi, '');
};