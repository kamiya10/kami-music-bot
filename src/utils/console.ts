export const setConsoleTitle = (title: string) => {
  process.stdout.write(
    String.fromCharCode(27) + ']0;' + title + String.fromCharCode(7),
  );
};
