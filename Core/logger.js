const pino = require("pino").default;
const logger = pino(
	{
		level     : process.env.LOG_LEVEL || "debug",
		transport : {
			target  : "pino-pretty",
			options : {
				colorize      : true,
				ignore        : "pid,hostname,scope",
				translateTime : "yyyy/mm/dd HH:MM:ss",
				messageFormat : "[{scope}] {msg}",
			},
		},
	},
);
module.exports = logger;