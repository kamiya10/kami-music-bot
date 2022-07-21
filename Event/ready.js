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
	},
};