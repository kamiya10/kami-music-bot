const logger = require("../Core/logger").child({ scope: "Main" });

module.exports = {
  name  : "ready",
  event : "ready",
  once  : true,

  /**
     * @param {import("discord.js").Client} client
     */
  execute(client) {
    logger.info(`Bot is ready: ${client.user.tag}`);

    setInterval(() => {
      client.user.setActivity(`${client.version} | 🎵 ${client.players.size}`);
    }, 60000);
  },
};