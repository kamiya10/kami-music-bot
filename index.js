require("dotenv").config();
const { Kami } = require("./Core/client");
const { join } = require("node:path");
const chalk = require("chalk");
const KamiMusicDatabase = require("./Class/KamiMusicDatabase");
const readline = require("node:readline");
const logger = require("./Core/logger").child("Process");

new KamiMusicDatabase(join(__dirname, "Database", "guild.json"), Kami, "guild");
new KamiMusicDatabase(join(__dirname, "Database", "user.json"), Kami, "user");
new KamiMusicDatabase(join(__dirname, "Database", "user.json"), Kami, "playlist");
Kami.version = process.env.BOT_VERSION;

Kami.login(process.env.KAMI_TOKEN);

process.stdout.write(`${String.fromCharCode(27)}]0;Kami Music ${Kami.version}${String.fromCharCode(7)}`);

// interface
const rl = readline.createInterface({
  input  : process.stdin,
  output : process.stdout,
});

waitForUserInput();

function waitForUserInput() {
  rl.question("\u001b[90m>>>\x1b[0m ", (input) => {
    try {
      if (input.startsWith("log")) {
        const args = input.split(" ").slice(1);
        args.forEach((v) => {
          eval(`console.log("${v.replace(/"/g, "'")}", ${v.replace(/"/g, "'")});`);
        });
        console.log("");
      } else if (input.startsWith("emit")) {
        const args = input.split(" ").slice(1);
        eval(`Kami.emit("${args[0]}", ${args[1]});`);
        console.log("");
      } else if (input == "exit") {
        console.log("Stopping bot...");
        process.exit(0);
      }
    } catch (error) {
      logger.error(error);
    }

    waitForUserInput();
  });
}

process.stdin.on("keypress", () => {
  setTimeout(() => {
    rl._refreshLine();
  }, 0);
});


/**
 * @param {string} stringToWrite
 */
rl._writeToOutput = function _writeToOutput(stringToWrite) {
  let args = stringToWrite.match(/(?:[^\s"]+|"[^"]*")+/g);

  if (args) {
    args = args.slice(1);

    switch (args[0]) {
      case "log": {
        args[0] = chalk.blueBright(args[0]);

        if (args[1]) args[1] = args[1].startsWith("\"") ? chalk.greenBright(args[1]) : chalk.yellow(args[1]);
        break;
      }

      case "emit": {
        args[0] = chalk.blueBright(args[0]);

        if (args[1]) args[1] = chalk.greenBright(args[1]);
        break;
      }

      case "exit": {
        args[0] = chalk.blueBright(args[0]);
        break;
      }
    }

    rl.output.write("\u001b[90m>>>\x1b[0m " + chalk.blackBright(args.join(" ")));
  } else {
    rl.output.write("\u001b[90m>>>\x1b[0m " + stringToWrite);
  }
};

process.on("uncaughtException", (exception) => {
  if (exception.code != 10062) {
    logger.fatal(exception);
    logger.fatal("The bot will try to continue, but things might not work as expected.");
  }
});
