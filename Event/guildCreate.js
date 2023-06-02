require("dotenv").config();
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const { Events } = require("discord.js");
const logger = require("../Core/logger").child({ scope: "Main" });
const rest = new REST({ version: "10" }).setToken(process.env.KAMI_TOKEN);

module.exports = {
  name  : "guildCreate",
  event : Events.GuildCreate,
  once  : false,

  /**
	 * @param {import("discord.js").Client} client
     * @param {import("discord.js").Guild} guild
	 */
  execute(client, guild) {
    rest.put(Routes.applicationGuildCommands(client.application.id, guild.id), { body: client.commands.map((v) => v.data.toJSON()) })
      .then(() => logger.info(`Registered application commands for ${guild.name}`))
      .catch(logger.error);
  },
};