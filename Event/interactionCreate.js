const { ApplicationCommandType, InteractionType } = require("discord.js");
const logger = require("../Core/logger").child({ scope: "CommandHandler" });

module.exports = {
	name  : "interactionCreate",
	event : "interactionCreate",
	once  : false,
	/**
     *
     * @param {import("discord.js").Interaction} interaction The interaction which was created
     */
	async execute(client, interaction) {
		if (interaction.type != InteractionType.ApplicationCommand) return;
		if (!interaction.guildId) return;

		/**
		 * @typedef Command
		 * @property {import("discord.js").SlashCommandBuilder} data
		 * @property {boolean} defer
		 * @property {boolean} ephemeral
		 * @property {Promise<void>} execute
		 */

		/**
		 * @type {Command}
		 */
		const command = interaction.client[interaction.commandType == ApplicationCommandType.ChatInput ? "commands" : "contexts"].get(interaction.commandName);

		if (!command) return;
		try {
			if (command.defer) await interaction.deferReply({
				ephemeral: command.ephemeral,
			});
			await command.execute(interaction);
		} catch (error) {
			logger.error(error);
			const msg = `There was an error while executing this command!\n${error}`;
			if (command.defer) {
				await interaction.deleteReply().catch(() => void 0);
				await interaction.followUp({ content: msg, ephemeral: true });
			} else
				await interaction.reply({ content: msg, ephemeral: true });
		}
	},
};