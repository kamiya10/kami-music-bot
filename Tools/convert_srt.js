const { readdirSync, readFileSync, writeFileSync } = require("fs");
const { EOL } = require("os");
const { join } = require("path");
const chalk = require("chalk");

const TRANSLATIONS = ["tw"];
const files = readdirSync(__dirname).filter((v) => v.endsWith(".srt"));

if (files.length)
  for (const file of files) {
    const srt = parseSrt(file);
    writeFileSync(
      join(__dirname, file.replace(".srt", ".lyric")),
      JSON.stringify(srt)
    );
    console.log(`Converted ${file}`);
  }
else console.log("No files to convert");

function parseSrt(filename) {
  const data = readFileSync(join(__dirname, filename), { encoding: "utf-8" });
  const translations = {};

  for (const LANG of TRANSLATIONS)
    try {
      translations[LANG] = readFileSync(
        join(__dirname, filename.replace(".srt", `_${LANG}.txt`)),
        { encoding: "utf-8" }
      ).split(EOL);
    } catch (error) {
      // ignore if there is no translation files
    }

  const regex =
    /(\d+)\s*[\n\r]+(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*[\n\r]+([\s\S]*?)(?=\s*\d+\s*[\n\r]+|$)/g;

  const captions = [];
  let match;

  while ((match = regex.exec(data)) !== null) {
    const [
      _,
      index,
      startHours,
      startMinutes,
      startSeconds,
      startMilliseconds,
      endHours,
      endMinutes,
      endSeconds,
      endMilliseconds,
      raw,
    ] = match;

    const start =
      +startHours * 3600000 +
      +startMinutes * 60000 +
      +startSeconds * 1000 +
      +startMilliseconds;
    const end =
      +endHours * 3600000 +
      +endMinutes * 60000 +
      +endSeconds * 1000 +
      +endMilliseconds;

    if (end - start < 1400)
      console.warn(
        `${chalk.yellow("Warning")}: Line ${chalk.green(`"${raw.trim()}"`)} may be too short to be updated correctly. ${chalk.dim(`(Start: ${start} End: ${end} Duration: ${end - start})`)}`
      );

    captions.push({
      start,
      end,
      raw: raw.trim(),
      ruby: "",
      ...TRANSLATIONS.reduce(
        (acc, LANG) => (
          (acc[LANG] = translations[LANG]?.[index - 1] ?? ""), acc
        ),
        {}
      ),
    });
  }

  return captions;
}
