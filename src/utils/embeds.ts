import { Colors, EmbedBuilder, GuildMember } from 'discord.js';

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
