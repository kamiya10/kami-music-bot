const { ApplicationCommandType, InteractionType } = require("discord.js");
const logger = require("../Core/logger").child({ scope: "CommandHandler" });
const YouTube = require("simple-youtube-api");
const Youtube = new YouTube(process.env.YOUTUBE_TOKEN);

const autocompletedata = {};
module.exports = {
	name  : "interactionCreate",
	event : "interactionCreate",
	once  : false,
	/**
     *
     * @param {import("discord.js").Interaction} interaction The interaction which was created
     */
	async execute(client, interaction) {
		if (!interaction.guildId) return;
		switch (interaction.type) {
			case InteractionType.ApplicationCommand: {
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
				const command = client[interaction.commandType == ApplicationCommandType.ChatInput ? "commands" : "contexts"].get(interaction.commandName);

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
				break;
			}

			case InteractionType.ApplicationCommandAutocomplete: {
				autocompletedata[interaction.user.id] ??= {};
				autocompletedata[interaction.user.id].interaction = interaction;
				if (interaction.options.getSubcommand(false) == "search") {
					const checkTyping = async () => {
						if (autocompletedata[interaction.user.id].is_typing)
							setTimeout(checkTyping, 100);
						else {
							const focused = autocompletedata[interaction.user.id].interaction.options.getFocused(true);
							let choices = [];
							if (focused.value.length > 1)
								switch (focused.name) {
									case "query": {
										choices = (await Youtube.searchVideos(focused.value, 25)).slice(0, 25).map((result) => {
											client.apiCache.set(result.id, result);
											return { name: (result.title.length > 100 ? (result.title.slice(0, 99) + "…") : result.title).replace(/&amp;/g, "&"), value: result.id };
										});
										break;
									}
									default: break;
								}
							await interaction.respond(choices);
						}
					};
					if (!autocompletedata[interaction.user.id].is_typing) {
						autocompletedata[interaction.user.id].is_typing = true;
						checkTyping();
					}
					if (autocompletedata[interaction.user.id].timer) clearTimeout(autocompletedata[interaction.user.id].timer);
					autocompletedata[interaction.user.id].timer = setTimeout(() => {
						autocompletedata[interaction.user.id].is_typing = false;
						autocompletedata[interaction.user.id].timer = null;
					}, 400);
				}
				break;
			}

			default: break;
		}
	},
};