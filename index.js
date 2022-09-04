require("dotenv").config();
const { Kami } = require("./Core/client");
const readline = require("node:readline");
const { join } = require("node:path");
const KamiMusicDatabase = require("./Class/KamiMusicDatabase");

new KamiMusicDatabase(join(__dirname, "Database", "guild.json"), Kami, "guild");
new KamiMusicDatabase(join(__dirname, "Database", "user.json"), Kami, "user");
Kami.version = process.env.BOT_VERSION;

// alter
Kami.login(process.env.KAMI_TOKEN);

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
					eval(`console.log("${v}", ${v});`);
				});
				console.log("");
			} else if (input.startsWith("emit")) {
				const args = input.split(" ").slice(1);
				eval(`Kami.emit("${args[0]}", ${args[1]});`);
			}
		} catch (error) {
			console.error(undefined);
		}
		waitForUserInput();
	});
}

process.stdin.on("keypress", () => {
	setTimeout(() => {
		rl._refreshLine();
	}, 0);
});

rl._writeToOutput = (stringToWrite) => {
	rl.output.write(stringToWrite.replace(/\s(log|emit)\s/g, "\u001b[33m$1\x1b[0m"));
};