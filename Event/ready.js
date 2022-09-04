const { generateDependencyReport } = require("@discordjs/voice");

module.exports = {
	name  : "ready",
	event : "ready",
	once  : false,
	/**
     * @param {import("discord.js").Client} client
     */
	execute(client) {
		console.log(generateDependencyReport());
		console.log("ready", client.user.tag);

		setInterval(() => {
			client.user.setActivity(`${client.version} | ${client.guilds.cache.size}伺服 - ${client.channels.cache.size}頻道 - ${client.users.cache.size}用戶`);
		}, 60000);
	},
};