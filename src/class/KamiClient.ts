import { Client, Collection, GatewayIntentBits } from "discord.js";
import { existsSync, mkdirSync, readFile, readdirSync } from "fs";
import { join, resolve } from "path";
import { KamiDatabase } from "./KamiDatabase";
import { version } from "~/package.json";

import ora from "ora";

import Logger from "@/core/logger";
import commands from "@/command";
import events from "@/event";

import type { ClientOptions } from "discord.js";
import type { Command } from "@/command";
import type { GuildDataModel } from "@/databases/GuildDatabase";
import type { KamiMusicMetadataCache } from "@/class/KamiMusicMetadata";
import type { KamiMusicPlayer } from "@/class/KamiMusicPlayer";
import type { Low } from "lowdb";
import type { UserDataModel } from "@/databases/UserDatabase";

export const KamiIntents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildVoiceStates,
] as const;

export interface ClientDatabase {
  guild : Low<Record<string, GuildDataModel>>;
  user  : Low<Record<string, UserDataModel>>;
}

export class KamiClient extends Client {
  version = version;
  database= new KamiDatabase();
  commands = new Collection<string, Command>();
  players = new Collection<string, KamiMusicPlayer>();
  cache = new Collection<string, KamiMusicMetadataCache>();

  static MessageAutoDeleteTimeout : 8_000;
  static CacheFolder = resolve( ".cache");

  constructor(options: ClientOptions) {
    super(options);
    this.loadCommands();
    this.loadEvents();
    this.loadCache();
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
      if (event.on != null) {
        this.on(event.name, (...args) => void event.on!.call(this, ...args));
      }

      if (event.once != null) {
        this.once(event.name, (...args) => void event.once!.call(this, ...args));
      }
    }

    spinner.succeed(`Loaded ${events.length} events.`);
  }

  private loadCache() {
    const spinner = ora("Loading cache...");

    if (!existsSync(KamiClient.CacheFolder)) {
      mkdirSync(KamiClient.CacheFolder, { recursive : true });
      return;
    }

    const metafiles = readdirSync(KamiClient.CacheFolder).filter((file) =>
      file.endsWith(".metadata")
    );

    for (const file of metafiles) {
      readFile(join(KamiClient.CacheFolder, file), { encoding : "utf-8" }, (err, data) => {
        if (!err) {
          const meta = JSON.parse(data) as KamiMusicMetadataCache;
          this.cache.set(meta.id, meta);
        } else {
          Logger.error(err);
        }
      });
    }

    spinner.succeed(`Loaded ${metafiles.length} entries from cache.`);
  }

  async updateCommands() {
    if (!this.isReady()) {
      throw new Error("Client is not ready to update commands.");
    }

    const guilds = this.guilds.cache.filter(g=>g.commands.cache.size);
    guilds.forEach(g => {
      g.commands.set([]);
    });

    const command = this.commands.map(c=>c.data.toJSON());
    await this.application.commands.set(command);
  }
}
