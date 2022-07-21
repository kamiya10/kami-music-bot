const { existsSync, writeFileSync, readFileSync } = require("node:fs");

class KamiMusicDatabase {
	/**
	 * @param {string} path The path to the database file.
	 * @param {import("discord.js").Client} client
	 * @param {string} name The name of the database.
	 */
	constructor(path, client, name) {
		/**
		 * @type {string}
		 */
		this.PATH = path;
		if (!existsSync(this.PATH))
			writeFileSync(this.PATH, "{}", { encoding: "utf-8" });

		this.data = JSON.parse(readFileSync(this.PATH, { encoding: "utf-8" }));
		client.setting ??= {};
		client.setting[name] = this.data;
	}

	init(key, data) {
		this.data[key] = data;
		return this;
	}

	/**
	 * Saves the database.
	 */
	save() {
		writeFileSync(this.PATH, JSON.stringify(this.data), { encoding: "utf-8" });
	}
}
module.exports = KamiMusicDatabase;