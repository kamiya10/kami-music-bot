const { Client, Collection, Colors, GatewayIntentBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

const KamiIntents = [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMembers,
	GatewayIntentBits.GuildVoiceStates,
];

const Kami = new Client({ intents: KamiIntents, allowedMentions: { parse: ["roles", "everyone"] } });

// #region Event Registion

const eventFiles = fs.readdirSync("./Event").filter((file) => file.endsWith(".js"));
for (const file of eventFiles) {
	const event = require(path.resolve(`./Event/${file}`));
	if (event.once)
		Kami.once(event.event, (...args) => event.execute(Kami, ...args));
	else
		Kami.on(event.event, (...args) => event.execute(Kami, ...args));
}

// #endregion

// #region Command Registion

Kami.commands = new Collection();
const commandCategories = fs.readdirSync("./Command");
for (const category of commandCategories) {
	const commandFiles = fs.readdirSync(`./Command/${category}`).filter((file) => file.endsWith(".js"));

	for (const file of commandFiles) {
		const command = require(path.resolve(`./Command/${category}/${file}`));
		Kami.commands.set(command.data.name, command);
	}
}
Kami.contexts = new Collection();
const commandFiles = fs.readdirSync("./Context").filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
	const command = require(path.resolve(`./Context/${file}`));
	Kami.contexts.set(command.data.name, command);
}

// #endregion

Kami.apiCache = new Collection();
Kami.cooldowns = new Collection();
Kami.players = new Collection();
Kami.Color = Object.freeze({
	Info    : Colors.Blue,
	Success : Colors.Green,
	Warn    : Colors.Orange,
	Error   : Colors.Red,
});
Kami.EmbedIcon = Object.freeze({
	Info    : "ℹ",
	Success : "✅",
	Warn    : "⚠",
	Error   : "❌",
});

module.exports = { Kami };