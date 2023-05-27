// Get ruby Html from https://nihongodera.com/tools/furigana-maker
// Open dev tool and copy the innerHtml of the results
// Paste it into a txt file with filename "{id}_ruby.txt"

const { readdirSync, readFileSync, writeFileSync } = require("node:fs");
const { EOL } = require("node:os");
const { join } = require("node:path");

const files = readdirSync(__dirname).filter(v => v.endsWith(".lyric"));

if (files.length)
  for (const file of files) {
    const lyrics = JSON.parse(readFileSync(join(__dirname, file), { encoding: "utf-8" }));
    const { values, rubies } = parseRuby(file);

    for (const index in lyrics) {
      lyrics[index].value = values[index];
      lyrics[index].ruby = rubies[index];
    }

    writeFileSync(join(__dirname, file), JSON.stringify(lyrics));
    console.log(`Added ruby for ${file}`);
  }
else
  console.log("No files to convert");

function parseRuby(filename) {
  const data = readFileSync(join(__dirname, filename.replace(".lyric", "_ruby.txt")), { encoding: "utf-8" })
    .split(EOL)
    .slice(1)
    .map(v => v.trim().replace(/<rp>\(<\/rp>|<rp>\)<\/rp>/g, ""));

  const values = [];
  const rubies = [];

  for (const i in data) {
    const matches = data[i].matchAll(/<ruby><rb>(.*?)<\/rb><rt>(.*?)<\/rt><\/ruby>/g);
    const rubyReplaceStr = [];
    values[i] = data[i];
    rubies[i] = data[i];

    for (const match of matches) {
      let space = "";

      if (!match[2])
        throw new SyntaxError(`Missing ruby text in match ${match[0]}, line ${+i + 2}`);

      if (match[2].length == 1 || match[1].length == match[2].length)
        space = "";
      else if (Math.abs(match[1].length - match[2].length) % 2)
        space = " ".repeat(Math.abs(match[1].length - match[2].length));
      else
        space = "　".repeat(Math.abs(match[1].length - match[2].length) / 2);

      if (match[2].length > match[1].length) {
        values[i] = values[i].replace(match[0], `${space}${match[1]}${space}`);
        rubies[i] = rubies[i].replace(match[0], `#${match[2]}#`);
      } else {
        values[i] = values[i].replace(match[0], `${match[1]}`);
        rubies[i] = rubies[i].replace(match[0], `${space}#${match[2]}#${space}`);
      }

      rubyReplaceStr.push(match[2]);
    }

    if (rubyReplaceStr.length) {
      rubies[i] = rubies[i].split("#");
      for (const rubyI in rubies[i])
        if (!rubyReplaceStr.includes(rubies[i][rubyI]))
          rubies[i][rubyI] = rubies[i][rubyI].replace(/[ぁ-んァ-ン，。、？！：；【】「」『』（）〈〉《》～・]/g, "　").replace(/(?<=\s)ー/g, "　").replace(/[a-zA-Z0-9<>,."':;!?~()[\]…-]/g, " ");
    } else {
      rubies[i] = [""];
    }

    values[i] = values[i].trimEnd();
    rubies[i] = rubies[i].join("").trimEnd();
  }

  return { values, rubies };
}