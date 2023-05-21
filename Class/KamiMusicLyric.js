const { readFileSync } = require("node:fs");
const { join } = require("node:path");

class KamiMusicLyric {
  constructor(lyrics) {
    this.lyrics = lyrics;
  }

  getLine(time) {
    const i = this.getIndex(time);
    const index = ~~i;

    if (index < 0)
      return {
        prev    : null,
        current : null,
        next    : this.lyrics[0],
      };
    else if (index == 0)
      return {
        prev    : null,
        current : this.lyrics[index],
        next    : this.lyrics[index + 1],
      };
    else if ((i - 0.5) == (this.lyrics.length - 1))
      return {
        prev    : this.lyrics[index],
        current : {
          ruby  : "",
          value : "*end*",
          tw    : "",
        },
        next: null,
      };
    else if (index == (this.lyrics.length - 1))
      return {
        prev    : this.lyrics[index - 1],
        current : this.lyrics[index],
        next    : {
          ruby  : "",
          value : "*end*",
          tw    : "",
        },
      };

    return {
      prev    : time >= this.lyrics[index].end ? this.lyrics[index] : this.lyrics[index - 1],
      current : time >= this.lyrics[index].end ? {
        ruby  : "",
        value : "♪",
        tw    : "",
      } : this.lyrics[index],
      next: this.lyrics[index + 1],
    };
  }

  getIndex(time) {
    for (let i = 0, n = this.lyrics.length; i < n; i++) {
      if (i == 0 && time < this.lyrics[i].start)
        return -1;

      if (time >= this.lyrics[i].start && time <= this.lyrics[i].end)
        return i;
      else if (time > this.lyrics[i].end && time < (this.lyrics[i + 1]?.start ?? Infinity))
        return i + 0.5;
    }
  }

  getDictionaryData(kw) {
    return searchPredefinedDictionary(kw);
  }

  static async fetchLyric(id) {
    const res = await fetch("https://www.jpmarumaru.com/tw/api/json_JPSongTrack.asp", {
      headers: {
        accept         : "application/json",
        "content-type" : "application/x-www-form-urlencoded; charset=UTF-8",
        Referer        : `https://www.jpmarumaru.com/tw/JPSongPlay-${id}.html`,
      },
      body   : `SongPK=${id}`,
      method : "POST",
    }).catch(console.error);
    const data = await res.json();
    const LyricsYomi = data.LyricsYomi;
    const Translate_zh = data.Translate_zh;
    const raw = [];
    const kanji = [];
    const ruby = [];
    const second = [];
    const secondend = [];
    const out = [];

    for (const i in LyricsYomi) {
      const matches = LyricsYomi[i].matchAll(/<ruby><rb>(.*?)<\/rb><rt>(.*?)<\/rt><\/ruby>/g);
      const rubyReplaceStr = [];
      kanji[i] = LyricsYomi[i];
      ruby[i] = LyricsYomi[i];
      second[i] = convertSecond(data.StartTime[i]);
      secondend[i] = convertSecond(data.EndTime[i]);

      for (const match of matches) {
        let space = "";

        if (match[2].length == 1 || match[1].length == match[2].length)
          space = "";
        else if (Math.abs(match[1].length - match[2].length) % 2)
          space = " ".repeat(Math.abs(match[1].length - match[2].length));
        else
          space = "　".repeat(Math.abs(match[1].length - match[2].length) / 2);

        rubyReplaceStr.push(match[2]);
        raw[i] = data.Lyrics[i];
        kanji[i] = kanji[i].replace(match[0], `${space}${match[1]}${space}`);
        ruby[i] = ruby[i].replace(match[0], `#${match[2]}#`);
      }

      if (rubyReplaceStr.length) {
        ruby[i] = ruby[i].split("#");
        for (const rubyI in ruby[i])
          if (!rubyReplaceStr.includes(ruby[i][rubyI]))
            ruby[i][rubyI] = ruby[i][rubyI].replace(/[ぁ-んァ-ン，。、？！：；【】「」『』（）〈〉《》～・]/g, "　").replace(/(?<=\s)ー/g, "　").replace(/[a-zA-Z0-9<>,."':;!?~()[\]…-]/g, " ");
      } else {
        ruby[i] = [""];
      }

      out.push({
        start : second[i],
        end   : secondend[i],
        ruby  : ruby[i].join("").trimEnd(),
        value : kanji[i].trimEnd(),
        raw   : raw[i],
        tw    : Translate_zh[i],
      });
    }

    return out;
  }

  static async searchLyrics(kw) {
    try {
      const predef_results = searchPredefinedDictionary(kw);

      if (predef_results.length) {
        console.log("lyric found in dictionary");
        return predef_results;
      }

      const term = kw.replace(/(cover(?:ed)?(?:\sby)?.+)|(official(?:\s?music)?(?:\s?video)?)|(music(?:\s?video)?)|([「『【｛（［({<].*[」』】｝）］)}>])|(-)/gi, "");

      const res = await fetch(`https://cse.google.com/cse/element/v1?num=10&hl=zh-TW&cselibv=8e77c7877b8339e2&cx=006433377945535362806:1gjgvl5smaa&q=${encodeURIComponent(term)}%22%E5%94%B1%E6%AD%8C%E5%AD%B8%E6%97%A5%E8%AA%9E-%E6%97%A5%E8%AA%9E%E6%95%99%E5%AE%A4-MARUMARU%22&safe=off&cse_tok=AFW0emyyYPxeptWyXEcsGKP0L8iu:1684549357942&callback=handle`, {
        headers: {
          accept: "*/*",
        },
        body   : null,
        method : "GET",
      });

      const raw = JSON.parse((await res.text()).replace(/\/\*O_o\*\/\nhandle\(((.|\n)+)\);/, "$1"));

      if (raw.results?.length) {
        const result = [];

        for (let i = 0, n = raw.results.length; i < n; i++) {
          const e = raw.results[i];

          if (e.url.startsWith("https://www.jpmarumaru.com/tw/JPSongPlay-"))
            result.push({
              name          : e.titleNoFormatting.replace("-歌詞-唱歌學日語-日語教室-MARUMARU", ""),
              url           : e.url,
              titlePredict  : e.titleNoFormatting.replace("-歌詞-唱歌學日語-日語教室-MARUMARU", "").split("-").slice(0, -1).join(""),
              artistPredict : e.titleNoFormatting.replace("-歌詞-唱歌學日語-日語教室-MARUMARU", "").split("-").slice(1).join(""),
              id            : e.url.replace(/https:\/\/www\.jpmarumaru\.com\/tw\/JPSongPlay-(.+)\.html/, "$1"),
            });
        }

        console.log("lyric found");
        return result;
      }

      console.log(`lyric not found: ${term}`);
      return [];
    } catch (error) {
      console.log(error);
      return [];
    }
  }
}

module.exports = KamiMusicLyric;

function convertSecond(time) {
  const timearr = time.split(":"); ["04", "23"];

  let second = 0;
  for (let i = 0, n = timearr.length; i < n; i++)
    second += Number(timearr.pop()) * Math.pow(60, i) * 1000;

  return second;
}

function searchPredefinedDictionary(kw) {
  const dictionary = JSON.parse(readFileSync(join(__dirname, "..", "Database", "lyrics.json"), { encoding: "utf-8" }));
  const results = [];

  for (let i = 0, n = dictionary.length; i < n; i++) {
    const e = dictionary[i];

    if (kw.includes(e.titlePredict) && kw.includes(e.artistPredict))
      results.push(e);
  }

  for (let i = 0, n = dictionary.length; i < n; i++) {
    const e = dictionary[i];

    if (!(kw.includes(e.titlePredict) && kw.includes(e.artistPredict)) && kw.includes(e.titlePredict))
      results.push(e);
  }

  return results;
}