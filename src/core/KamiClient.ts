import { Client, Collection, GatewayIntentBits } from "discord.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { version } from "~/package.json";

import commands from "&";
import events from "#";
import ora from "ora";

import type { ClientOptions } from "discord.js";
import type { KamiCommand } from "&/types";
import type { KamiMusicPlayer } from "@/core/KamiMusicPlayer";
import { createHash } from "crypto";

export class KamiClient extends Client {
  cacheDirectory = resolve(".cache");

  commands = new Collection<string, KamiCommand>();
  players = new Collection<string, KamiMusicPlayer>();
  version = version;

  constructor(options?: ClientOptions) {
    super({
      intents : [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
      ],
      ...options,
    });
    mkdirSync(this.cacheDirectory, { recursive: true });
    this.loadCommands();
    this.loadEvents();
  }

  private loadCommands() {
    const spinner = ora("Loading commands...");

    for (const command of commands) {
      this.commands.set(command.data.name, command);
    }

    spinner.succeed(`Loaded ${commands.length} commands.`);
  }

  private loadEvents() {
    const spinner = ora("Loading events...");

    for (const event of events) {
      if (event.on) {
        const on = event.on;
        this.on(event.name, (...args) => void on.apply(this, args));
      }

      if (event.once) {
        const once = event.once;
        this.once(event.name, (...args) => void once.apply(this, args));
      }
    }

    spinner.succeed(`Loaded ${events.length} events.`);
  }

  async updateCommands() {
    const lockfilePath = join(this.cacheDirectory, "commands.lock");
    
    const data = commands.map(c => c.data.toJSON());
    const hash = createHash("sha256").update(JSON.stringify(data)).digest("hex");

    if (existsSync(lockfilePath) && readFileSync(lockfilePath, { encoding: 'utf-8' }) == hash) return;

    const spinner = ora("Updating commands...");

    const guild = this.guilds.cache.get("1237617251352317952");

    if (!guild) {
      spinner.fail("Guild not found");
      return;
    }

    await guild.commands.set(data);
    
    writeFileSync(lockfilePath, hash, { encoding: 'utf-8' });
    spinner.succeed(`Updated slash commands.`);
  }
}