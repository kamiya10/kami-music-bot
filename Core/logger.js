const pino = require("pino");
const logger = pino(
	{
		level: process.env.LOG_LEVEL || "debug",
	},
);
module.exports = logger;