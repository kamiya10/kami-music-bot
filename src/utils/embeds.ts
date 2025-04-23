import { ChatInputCommandInteraction, Colors, EmbedBuilder, Guild, GuildMember, User } from 'discord.js';

import { capitalize } from './string';

interface PlaylistEmbedOptions {
  user: GuildMember;
  description: string;
  color?: number;
  thumbnail?: string;
}

export function createPlaylistEmbed({
  user,
  description,
  color = Colors.Blue,
  thumbnail,
}: PlaylistEmbedOptions): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: `播放清單 | ${user.displayName}`,
      iconURL: user.displayAvatarURL() ?? undefined,
    })
    .setDescription(description)
    .setTimestamp();

  if (thumbnail) {
    embed.setThumbnail(thumbnail);
  }

  return embed;
}

export function createErrorEmbed(user: GuildMember, message: string): EmbedBuilder {
  return createPlaylistEmbed({
    user,
    description: `❌ 加入播放清單失敗：${message}`,
    color: Colors.Red,
  });
}
interface EmbedOperation {
  embed: EmbedBuilder;
  info: (description: string) => EmbedOperation;
  success: (description: string) => EmbedOperation;
  error: (description: string) => EmbedOperation;
  warn: (description: string) => EmbedOperation;
  gray: (description: string) => EmbedOperation;
}

export function guild(interaction: ChatInputCommandInteraction<'cached'>): EmbedOperation;
export function guild(guild: Guild, title: string): EmbedOperation;
export function guild(guild: Guild | ChatInputCommandInteraction<'cached'>, title?: string): EmbedOperation {
  if (guild instanceof ChatInputCommandInteraction) {
    title = guild.command?.nameLocalized ?? capitalize(guild.commandName);
    guild = guild.guild;
  }

  const embed = new EmbedBuilder()
    .setAuthor({
      name: `${title} | ${guild.name}`,
      iconURL: guild.iconURL() ?? undefined,
    });

  const options = {
    embed,
    info: (description: string) => {
      embed.setColor(Colors.Blue).setDescription(description);
      return options;
    },
    success: (description: string) => {
      embed.setColor(Colors.Green).setDescription(`✅ ${description}`);
      return options;
    },
    error: (description: string) => {
      embed.setColor(Colors.Red).setDescription(`❌ ${description}`);
      return options;
    },
    warn: (description: string) => {
      embed.setColor(Colors.Yellow).setDescription(`⚠️ ${description}`);
      return options;
    },
    gray: (description: string) => {
      embed.setColor(Colors.Grey).setDescription(description);
      return options;
    },
    timestamp: (timestamp?: Date | number | null) => {
      embed.setTimestamp(timestamp);
      return options;
    },
  };

  return options;
};

export function user(interaction: ChatInputCommandInteraction): EmbedOperation;
export function user(user: GuildMember | User, title: string): EmbedOperation;
export function user(user: GuildMember | User | ChatInputCommandInteraction, title?: string): EmbedOperation {
  if (user instanceof ChatInputCommandInteraction) {
    title = user.command?.nameLocalized ?? capitalize(user.commandName);
    user = user.user;
  }

  const embed = new EmbedBuilder()
    .setAuthor({
      name: `${title} | ${user.displayName}`,
      iconURL: user.displayAvatarURL() ?? undefined,
    });

  const options = {
    embed,
    info: (description: string) => {
      embed.setColor(Colors.Blue).setDescription(description);
      return options;
    },
    success: (description: string) => {
      embed.setColor(Colors.Green).setDescription(`✅ ${description}`);
      return options;
    },
    error: (description: string) => {
      embed.setColor(Colors.Red).setDescription(`❌ ${description}`);
      return options;
    },
    warn: (description: string) => {
      embed.setColor(Colors.Yellow).setDescription(`⚠️ ${description}`);
      return options;
    },
    gray: (description: string) => {
      embed.setColor(Colors.Grey).setDescription(description);
      return options;
    },
    timestamp: (timestamp?: Date | number | null) => {
      embed.setTimestamp(timestamp);
      return options;
    },
  };

  return options;
};
