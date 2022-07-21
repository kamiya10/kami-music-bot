require("dotenv").config();
const { Client, Routes, GatewayIntentBits } = require("discord.js");
const { REST } = require("@discordjs/rest");
const fs = require("node:fs");
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const rest = new REST({ version: "10" }).setToken(process.env.DEV_TOKEN);
client.login(process.env.DEV_TOKEN);
const commands = [];

const commandCategories = fs.readdirSync("./Command");
for (const category of commandCategories) {
	const commandFiles = fs.readdirSync(`./Command/${category}`).filter((file) => file.endsWith(".js"));

	for (const file of commandFiles) {
		const command = require(`./Command/${category}/${file}`);
		commands.push(command.data.toJSON());
	}
}

const commandFiles = fs.readdirSync("./Context").filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
	const command = require(`./Context/${file}`);
	commands.push(command.data.toJSON());
}

client.once("ready", async () => {
	let count = 0, errcount = 0;
	if (await new Promise((resolve) => {
		client.guilds.cache.forEach(async (v) => {
			await rest.put(Routes.applicationGuildCommands(client.application.id, v.id), { body: commands })
				.then(() => count++)
				.catch((e) => {
					console.error(`${v.name}(${v.id}): ${e}`);
					errcount++;
				});
			if ((count + errcount) == client.guilds.cache.size) resolve(true);
		});
	})) {
		console.log(`\nFinished register with ${count} succeed, ${errcount} failed.`);
		process.exit(0);
	}
});
