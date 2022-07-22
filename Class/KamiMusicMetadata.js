const { Video } = require("simple-youtube-api");

/**
 * @enum {string}
 */
const Platform = Object.freeze({
	Youtube      : "youtube",
	YoutubeMusic : "youtubemusic",
	Soundcloud   : "soundcloud",
});

class KamiMusicMetadata {
	/**
	 *
	 * @param {any} data
	 * @param {import("discord.js").GuildMember} member
	 */
	constructor(data, member) {
		if (data instanceof Video) {
			/**
			 * @type {string}
			 */
			this.id = data.id;

			/**
			 * @type {string}
			 */
			this.title = data.title;

			/**
			 * @type {string}
			 */
			this.artist = data.channel.title;

			/**
			 * @type {number}
			 */
			this.duration = data.durationSeconds;

			/**
			 * @type {string}
			 */
			this.thumbnail = data.thumbnails.high.url;

			/**
			 * @type {string}
			 */
			this.url = data.url;

			/**
			 * @type {string}
			 */
			this.shortURL = data.shortURL;

			/**
			 * @type {string}
			 */
			this.origin = data.playlist?.title;

			/**
			 * @type {Platform}
			 */
			this.platform = Platform.Youtube;

			/**
			 * @type {import("discord.js").GuildMember}
			 */
			this.member = member;

			/**
			 * @type {import("@discordjs/voice").AudioPlayerError}
			 */
			this.error = null;

			/**
			 * @type {String[]}
			 */
			this.region = data.raw?.contentDetails?.regionRestriction?.blocked ?? [];
		}
	}

	/**
	 * @return {boolean}
	 */
	get playable() {
		return this.region.includes("TW");
	}

	/**
	 * @typedef Duration
	 * @property {number} second
	 * @property {number} minute
	 * @property {number} hour
	 * @property {number} day
	 */

	/**
	 * @return {Duration}
	 */
	get durationObject() {
		return {
			second : this.duration % 60,
			minute : ~~(this.duration / 60),
			hour   : ~~(this.duration / (60 * 60)),
			day    : ~~(this.duration / (60 * 60 * 24)),
		};
	}

	/**
	 * @return {string}
	 */
	get formattedDuration() {
		const times = [];
		times.push(this.durationObject.day, this.durationObject.hour, this.durationObject.minute, this.durationObject.second);
		return times.reduce((a, v, i) => (v == 0 && i < 2) ? a : (v < 10) ? a.push(`0${v}`) && (a) : a.push(String(v)) && (a), []).join(":");
	}
}
module.exports = { KamiMusicMetadata, Platform };