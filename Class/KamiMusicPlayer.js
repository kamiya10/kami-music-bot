const { createAudioPlayer, entersState, joinVoiceChannel, NoSubscriberBehavior, VoiceConnectionStatus, AudioPlayerStatus, createAudioResource } = require("@discordjs/voice");
const { existsSync, mkdirSync, writeFileSync, createReadStream } = require("node:fs");
const { KamiMusicMetadata } = require("./KamiMusicMetadata");
const { join } = require("node:path");
const { Platform } = require("./KamiMusicMetadata");
const ytdl = require("ytdl-core");
const { EmbedBuilder, Colors } = require("discord.js");
const chalk = require("chalk");
const playerLogger = require("../Core/logger").child({ scope: "Player" });
const connectionLogger = require("../Core/logger").child({ scope: "Connection" });
// const { FFmpeg } = require("prism-media");

/**
 * @enum {String}
 */
const RepeatMode = Object.freeze({
	NoRepeat            : 0,
	RepeatQueue         : 1,
	RepeatCurrent       : 2,
	Random              : 3,
	RandomNoRepeat      : 4,
	TrueRandom          : 5,
	Backward            : 6,
	BackwardRepeatQueue : 7,
});

class KamiMusicPlayer {
	/**
	 * @param {import("discord.js").TextChannel} voiceChannel
	 * @param {import("discord.js").GuildMember} member
	 */
	constructor(voiceChannel, member, textChannel) {
		/**
		 * @type {import("discord.js").Client}
		 */
		this.client = voiceChannel.client;

		/**
		 * @type {import("discord.js").TextChannel}
		 */
		this.voiceChannel = voiceChannel;

		/**
		 * @type {import("discord.js").TextChannel}
		 */
		this.textChannel = textChannel;

		/**
		 * @type {import("discord.js").Guild}
		 */
		this.guild = voiceChannel.guild;

		/**
		 * @type {import("discord.js").GuildMember}
		 */
		this.owner = member;

		const preference = this.client.setting.user.data[this.owner.id];

		/**
		 * @type {boolean}
		 */
		this.locked = preference?.global?.locked ?? preference?.[this.guild.id]?.locked ?? false;

		/**
		 * @type {import("@discordjs/voice").VoiceConnection}
		 */
		this.connection = joinVoiceChannel({
			channelId      : voiceChannel.id,
			guildId        : voiceChannel.guild.id,
			adapterCreator : voiceChannel.guild.voiceAdapterCreator,
		});

		/**
		 * @type {import("@discordjs/voice").AudioPlayer}
		 */
		this.player = createAudioPlayer({
			behaviors: {
				noSubscriber: NoSubscriberBehavior.Pause,
			},
		});

		/**
		 * @type {import("@discordjs/voice").PlayerSubscription}
		 */
		this.subscription = this.connection.subscribe(this.player);

		/**
		 * @type {KamiMusicMetadata[]}
		 */
		this.queue = [];

		/**
		 * @type {number}
		 */
		this.currentIndex = 0;

		/**
		 * @type {RepeatMode}
		 */
		this.repeat = preference?.global?.repeat ?? preference?.[this.guild.id]?.repeat ?? RepeatMode.NoRepeat;

		/**
		 * @type {boolean}
		 */
		this.stopped = false;

		/**
		 * @type {number}
		 */
		this.volume = preference?.global?.volume ?? preference?.[this.guild.id]?.volume ?? 1;

		/**
		 * @type {?import("discord.js").Message}
		 */
		this.npmsg = null;

		this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
			try {
				await Promise.race([
					entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
					entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
				]);
			} catch (error) {
				this.destroy();
			}
		});
		this.connection.on("error", (error) => {
			connectionLogger.error(error);
		});
		this.player.on(AudioPlayerStatus.Playing, () => {
			this.current.error = undefined;
		});
		this.player.on(AudioPlayerStatus.Idle, (oldState) => {
			this._resource = null;
			if (oldState.status == AudioPlayerStatus.Playing) {
				if (!this.paused && !this.stopped)
					switch (this.repeat) {
						case RepeatMode.NoRepeat: {
							if (this.currentIndex < (this.queue.length - 1))
								this.next();
							break;
						}

						case RepeatMode.RepeatQueue: {
							this.next();
							break;
						}

						case RepeatMode.RepeatCurrent: {
							this.play();
							break;
						}

						case RepeatMode.Random: {
							this.currentIndex = Math.floor(Math.random() * this.queue.length);
							this.play();
							break;
						}

						case RepeatMode.RandomNoRepeat: {
							if (this._randomQueue.length == 0)
								this._randomQueue = [...this.queue];

							this._randomQueue = this._randomQueue.sort(() => 0.5 - Math.random());
							const resource = this._randomQueue.shift();
							this.currentIndex = this.queue.indexOf(resource);

							this.play();
							break;
						}

						case RepeatMode.Backward: {
							if (this.currentIndex > 0)
								this.next();

							break;
						}

						case RepeatMode.BackwardRepeatQueue: {
							this.next();
							break;
						}

						default:
							break;
					}

				this.stopped = false;
			}
		});
		this.player.on("error", (error) => {
			playerLogger.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
			playerLogger.error(error);
			this._resource = null;
			if (this.current?.error?.message != error.message) {
				this.current.error = error;
				this.play();
			} else if (this.repeat == RepeatMode.NoRepeat && this.currentIndex < (this.queue.length - 1)
				|| this.repeat == RepeatMode.RepeatQueue
				|| this.repeat == RepeatMode.Backward && this.currentIndex > 0
				|| this.repeat == RepeatMode.BackwardRepeatQueue)
				this.next();
			else if (this.repeat == RepeatMode.Random) {
				this.currentIndex = Math.floor(Math.random() * this.queue.length);
				this.play();
			} else if (this.repeat == RepeatMode.RandomNoRepeat) {
				if (this._randomQueue.length == 0)
					this._randomQueue = [...this.queue];

				this._randomQueue = this._randomQueue.sort(() => 0.5 - Math.random());
				const resource = this._randomQueue.shift();
				this.currentIndex = this.queue.indexOf(resource);

				this.play();
			}
		});
		this.client.players.set(this.guild.id, this);
	}

	/**
     * @param {boolean} value
     */
	set locked(value) {
		if ((value && !this.guild.members.me.nickname.startsWith("🔒")) || (!value && this.guild.members.me.nickname.startsWith("🔒")))
			this.guild.members.me.setNickname(value
				? `🔒 ${this.guild.members.me.nickname ?? this.guild.members.me.displayName}`
				: (this.guild.members.me.nickname ?? this.guild.members.me.displayName).replace("🔒 ", ""));
		this._locked = value;
	}

	/**
     * @return {boolean}
     */
	get locked() {
		return this._locked;
	}

	/**
     * @return {KamiMusicMetadata}
     */
	get current() {
		return this.queue[this.currentIndex];
	}

	/**
     * @param {number} value
     */
	set currentIndex(value) {
		if (value < 0)
			value = this.queue.length - 1;
		if (value > (this.queue.length - 1))
			value = 0;
		this._currentIndex = value;
	}

	/**
     * @return {number}
     */
	get currentIndex() {
		return this._currentIndex;
	}

	/**
     * @return {number}
     */
	get nextIndex() {
		switch (this.repeat) {
			case RepeatMode.NoRepeat:
				if (this.currentIndex < (this.queue.length - 1))
					return this.currentIndex + 1;
				break;

			case RepeatMode.RepeatQueue:
				if (this.currentIndex < (this.queue.length - 1))
					return this.currentIndex + 1;
				else
					return 0;

			case RepeatMode.RepeatCurrent:
				return this.currentIndex;

			case RepeatMode.Backward:
				if (this.currentIndex > 0)
					return this.currentIndex - 1;
				break;

			case RepeatMode.BackwardRepeatQueue:
				if (this.currentIndex > 0)
					return this.currentIndex - 1;
				else
					return this.queue.length - 1;

			default:
				break;
		}
		return -1;
	}

	/**
     * @return {boolean}
     */
	get paused() {
		return this.player.state.status == AudioPlayerStatus.AutoPaused || this.player.state.status == AudioPlayerStatus.Paused;
	}

	/**
     * @param {number} value
     */
	set volume(value) {
		this._volume = value;
		if (this._resource)
			this._resource.volume.setVolume(this._volume / (1 / 0.4));
	}

	/**
     * @return {number}
     */
	get volume() {
		return this._volume;
	}

	/**
     * @param {number} value
     */
	set repeat(value) {
		if (value == RepeatMode.RandomNoRepeat)
			if (value != this.repeat)
				this._randomQueue = [...this.queue];

		this._repeat = value;
	}

	/**
     * @return {number}
     */
	get repeat() {
		return this._repeat;
	}

	/**
	 * @return {number}
	 */
	get playbackTime() {
		return this._resource?.playbackDuration ?? null;
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
	get playbackTimeObject() {
		return this.playbackTime ? {
			second : ~~(this.playbackTime / 1000) % 60,
			minute : ~~(~~(this.playbackTime / 1000) / 60),
			hour   : ~~(~~(this.playbackTime / 1000) / (60 * 60)),
			day    : ~~(~~(this.playbackTime / 1000) / (60 * 60 * 24)),
		} : null;
	}

	/**
	 * @return {number}
	 */
	get formattedPlaybackTime() {
		if (this.playbackTimeObject) {
			const times = [];
			times.push(this.playbackTimeObject.day, this.playbackTimeObject.hour, this.playbackTimeObject.minute, this.playbackTimeObject.second);
			return times.reduce((a, v, i) => (v == 0 && i < 2) ? a : (v < 10) ? a.push(`0${v}`) && (a) : a.push(String(v)) && (a), []).join(":");
		}
		return null;
	}

	/**
	 * Add resources to the queue.
	 * @param {KamiMusicMetadata | KamiMusicMetadata[]} resource The resources to add.
	 * @param {?number} index The index resources should append after.
	 * @return {Promise<number>} The index the resource is at in the queue.
	 */
	async addResource(resource, index = this.queue.length) {
		if (Array.isArray(resource))
			this.queue.splice(index, 0, ...resource);
		else
			this.queue.splice(index, 0, resource);

		if (this.repeat == RepeatMode.RandomNoRepeat)
			if (Array.isArray(resource))
				this._randomQueue.splice(index, 0, ...resource);
			else
				this._randomQueue.splice(index, 0, resource);

		if (![RepeatMode.Random, RepeatMode.RandomNoRepeat, RepeatMode.TrueRandom].includes(this.repeat)) {
			if (this.currentIndex > index)
				this.currentIndex += 1;

			if (this.queue[this.nextIndex])
				if (!this.queue[this.nextIndex].cache)
					await this.buffer(this.nextIndex);
		}

		if (this.player.state.status == AudioPlayerStatus.Idle) {
			if (![RepeatMode.Random, RepeatMode.RandomNoRepeat, RepeatMode.TrueRandom].includes(this.repeat))
				if (Array.isArray(resource))
					this.currentIndex = this.queue.indexOf(resource[0]);
				else
					this.currentIndex = this.queue.indexOf(resource);

			this.play();
		}

		return this.queue.indexOf(Array.isArray(resource) ? resource[0] : resource);
	}

	/**
	 * Remove a resource from the queue by index.
	 * @param {number} index The index of the resource to be removed.
	 * @return {?KamiMusicMetadata} The removed resource.
	 */
	removeIndex(index) {
		const resource = this.queue[index];
		if (resource instanceof KamiMusicMetadata) {
			this.queue.splice(index, 1);
			if (this.repeat == RepeatMode.RandomNoRepeat)
				if (this._randomQueue.includes(resource))
					this._randomQueue.splice(this._randomQueue.indexOf(resource), 1);

			if (![RepeatMode.Random, RepeatMode.RandomNoRepeat, RepeatMode.TrueRandom].includes(this.repeat))
				if (this.currentIndex > index && this.currentIndex > 0)
					this.currentIndex -= 1;

			if (this.currentIndex == index && this.player.state.status == AudioPlayerStatus.Playing)
				this.stop();

			return resource;
		}
		return null;
	}

	/**
	 * Remove a resource from the queue.
	 * @param {KamiMusicMetadata} resource The resource to be removed.
	 * @return {?number} The removed resource index.
	 */
	removeResource(resource) {
		const index = this.queue.indexOf(resource);
		if (index > -1) {
			this.queue.splice(index, 1);
			if (this.repeat == RepeatMode.RandomNoRepeat)
				if (this._randomQueue.includes(resource))
					this._randomQueue.splice(this._randomQueue.indexOf(resource), 1);

			if (![RepeatMode.Random, RepeatMode.RandomNoRepeat, RepeatMode.TrueRandom].includes(this.repeat))
				if (this.currentIndex > index && this.currentIndex > 0)
					this.currentIndex -= 1;

			if (this.currentIndex == index && this.player.state.status == AudioPlayerStatus.Playing)
				this.stop();

			return index;
		}
		return null;
	}

	/**
	 * Play resources.
	 * @param {number} [index=this.currentIndex] The index of the resource to be played by the player.
	 */
	async play(index = this.currentIndex) {
		await this.buffer(index);
		const resource = this.queue[index];
		if (resource)
			if (resource.playable) {
				let stream;

				if (resource.cache) {
					playerLogger.info("▶ using cache");
					stream = createReadStream(resource.cache);
				}

				if (!stream)
					switch (resource.platform) {
						case Platform.Youtube: {
							let agent;
							/* Proxy
							if (resource.region.length)
							if (resource.region.includes("TW")) {
								console.log("Using proxy: JP");
								const Agent = require("https-proxy-agent");
								const proxy = "http://139.162.78.109:3128";
								// const proxy = "http://140.227.59.167:3180";
								agent = new Agent(proxy);
							}
							*/

							stream = ytdl(resource.url,
								{
									filter         : (format) => format.contentLength,
									quality        : "highestaudio",
									highWaterMark  : 1 << 25,
									requestOptions : {
										timeout: 5000,
									},
									...(agent && { requestOptions: { agent } }),
								});
							break;
						}
						default:
							break;
					}

				if (stream) {
					this.currentIndex = index;
					/*
					const transcoderArgs = [
						"-analyzeduration", "0",
						"-loglevel", "0",
						"-f", "s16le",
						"-ar", "48000",
						"-ac", "2",
						"-af", `bass=g=${this.audiofilter.bass}`,
					];
					const transcoder = new FFmpeg({ args: transcoderArgs });
					*/
					const ar = createAudioResource(stream, {
						inlineVolume : true,
						metadata     : resource,
					});
					this._resource = ar;
					this.volume = this._volume;
					this.updateNowplayingMessage();
					playerLogger.info(`▶ playing: ${resource.title} ${chalk.gray(this.guild.name)}`);
					this.player.play(ar);
					if (this.queue[this.nextIndex])
						if (!this.queue[this.nextIndex].cache)
							this.buffer(this.nextIndex);
				}
			} else this.next();
	}

	/**
	 * Pre-buffer a resource.
	 * @param {number} index The index of the resource to be buffered.
	 * @param {?boolean} force Whether or not the cache checking should be skipped.
	 */
	buffer(index, force = false, _retried = 0) {
		return new Promise((resolve, reject) => {
			if (!existsSync(join(__dirname, "../.cache")))
				mkdirSync(join(__dirname, "../.cache"));

			const resource = this.queue[index];
			if (resource)
				if (resource.durationObject.minute < 6)
					if (!existsSync(join(__dirname, "../.cache", resource.id)) || force) {
						if (!resource.cache || force)
							if (resource.playable) {
								let stream;
								switch (resource.platform) {
									case Platform.Youtube: {
										let agent;
										/* Proxy
										if (resource.region.length)
										if (resource.region.includes("TW")) {
											console.log("Using proxy: JP");
											const Agent = require("https-proxy-agent");
											const proxy = "http://139.162.78.109:3128";
											// const proxy = "http://140.227.59.167:3180";
											agent = new Agent(proxy);
										}
										*/

										stream = ytdl(resource.url,
											{
												filter         : (format) => format.contentLength,
												quality        : "highestaudio",
												highWaterMark  : 1 << 25,
												requestOptions : {
													timeout: 3000,
												},
												...(agent && { requestOptions: { agent } }),
											});
										break;
									}
									default:
										break;
								}

								if (stream) {
									const retryTimeout = setTimeout(() => stream.emit("error", new Error("Timeouut")), 3000);
									playerLogger.info(`⏳ buffer: ${resource.title} ${chalk.gray(this.guild.name)}`);
									const _buf = [];
									stream.on("data", (data) => {
										if (retryTimeout)
											clearTimeout(retryTimeout);
										_buf.push(data);
									});
									stream.on("error", async (err) => {
										if (err.message.startsWith("Status code: 4")) {
											if (err.message.includes("410"))
												resource.region.push("TW");
										} else {
											stream.destroy();
											if (_retried > 5) reject(new Error("Buffer retry limit exceeded."));
											playerLogger.info(`🔄 buffer: ${resource.title} ${chalk.gray(this.guild.name)}`);
											await this.buffer(index, force, _retried + 1);
											resolve();
										}
									});
									stream.on("finish", () => {
										playerLogger.info(`✅ buffer: ${resource.title} ${chalk.gray(this.guild.name)}`);
										const _buffer = Buffer.concat(_buf);
										writeFileSync(join(__dirname, "../.cache/", resource.id), _buffer, { flag: "w" });
										resource.cache = join(__dirname, "../.cache/", resource.id);
										stream.destroy();
										resolve();
									});
								}
							}
					} else {
						resource.cache = join(__dirname, "../.cache/", resource.id);
						resolve();
					}
				else
					resolve();
		});
	}

	/**
	 * Play the next resource.
	 * @returns {KamiMusicMetadata} The resource to be played.
	 */
	next() {
		if (this.repeat == RepeatMode.RandomNoRepeat) {
			if (this._randomQueue.length == 0)
				this._randomQueue = [...this.queue];

			this._randomQueue = this._randomQueue.sort(() => 0.5 - Math.random());
			const resource = this._randomQueue.shift();
			this.currentIndex = this.queue.indexOf(resource);
		} else if (this.repeat == RepeatMode.Backward || this.repeat == RepeatMode.BackwardRepeatQueue)
			this.currentIndex -= 1;
		else
			this.currentIndex += 1;

		this.play();
		return this.current;
	}

	/**
	 * Play the previous resource.
	 * @returns {KamiMusicMetadata} The resource to be played.
	 */
	prev() {
		if (this.repeat == RepeatMode.Backward || this.repeat == RepeatMode.BackwardRepeatQueue)
			this.currentIndex += 1;
		else
			this.currentIndex -= 1;

		this.play();
		return this.current;
	}


	/**
	 * Pause the player.
	 */
	pause() {
		this.player.pause();
	}

	/**
	 * Resume the player.
	 */
	resume() {
		this.player.unpause();
	}

	/**
	 * Stops the player and transitions to the next resource, if any.
	 * @param {boolean} force If `true`, the player won't transition into the next resource.
	 */
	stop(force = false) {
		if (force)
			this.stopped = true;

		this.player.stop();
	}

	/**
	 * Destroys the player.
	 */
	destroy() {
		this.connection.destroy();
		this.client.players.delete(this.guild.id);
	}

	/**
	 * Connects the player.
	 * @param {import("discord.js").VoiceChannel} channel
	 */
	connect(channel) {
		this.connection = joinVoiceChannel({
			channelId      : channel.id,
			guildId        : channel.guild.id,
			adapterCreator : channel.guild.voiceAdapterCreator,
		});
		this.subscription = this.connection.subscribe(this.player);
	}

	/**
	 * Reconnects the player.
	 */
	reconnect() {
		this.connection.rejoin();
	}

	/**
	 * Updates the nowplaying message
	 */
	async updateNowplayingMessage() {
		try {
			if (this.npmsg)
				this.npmsg = await this.npmsg.edit(npTemplate(this)).catch(async (err) => {
					console.error(err);
					this.npmsg = await this.textChannel.send(npTemplate(this));
				});
			else
				this.npmsg = await this.textChannel.send(npTemplate(this));
		} catch (err) {
			console.error(err);
		}
	}
}

/**
 * @param {KamiMusicPlayer} player
 * @returns
 */
const npTemplate = (player) => {
	const current = player.current;
	const embed = new EmbedBuilder()
		.setColor(player.client.Color.Info)
		.setAuthor({ name: `正在播放 | ${player.guild.name}`, iconURL: player.guild.iconURL() })
		.setThumbnail(current.thumbnail)
		.setTitle(current.title)
		.setURL(current.shortURL)
		.setFields([
			{ name: "編號", value: `${player.currentIndex + 1}`, inline: true },
			{ name: "長度", value: current.formattedDuration, inline: true },
		])
		.setFooter({ text: current.member.displayName, iconURL: current.member.displayAvatarURL() })
		.setTimestamp();

	return { embeds: [embed] };
};
module.exports = { KamiMusicPlayer, RepeatMode };