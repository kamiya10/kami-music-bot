import { ApplicationCommandType, Colors, ContextMenuCommandBuilder, EmbedBuilder, MessageContextMenuCommandInteraction, hyperlink, unorderedList } from 'discord.js';

import { KamiContext } from '@/core/context';
import { KamiMusicPlayer } from '@/core/player';
import { KamiResource } from '@/core/resource';
import Logger from '@/utils/logger';
import { ResourceResolver } from '@/services/resource';
import { deferEphemeral } from '@/utils/callback';

export default new KamiContext({
  builder: new ContextMenuCommandBuilder()
    .setName('Add to Queue')
    .setNameLocalizations({
      'zh-TW': '加入播放佇列',
    })
    .setType(ApplicationCommandType.Message),
  onMessage: async function (interaction: MessageContextMenuCommandInteraction<'cached'>) {
    await deferEphemeral(interaction);

    const guild = interaction.guild;
    const member = interaction.member;

    const text = interaction.channel;
    const voice = interaction.member.voice.channel;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `新增 | ${interaction.guild.name}`,
        iconURL: interaction.guild.iconURL()!,
      });

    const edit = () => interaction.editReply({
      embeds: [embed],
    });

    if (!voice || !text) {
      embed
        .setColor(Colors.Red)
        .setDescription('❌ 你需要在語音頻道內才能使用這個指令');

      await edit();
      return;
    }

    let player = this.players.get(guild.id);

    if (!player) {
      player = new KamiMusicPlayer(
        this,
        member,
        text,
        voice,
      );
      this.players.set(guild.id, player);
    }

    const inSameVoiceChannel = player.voice.id == voice.id;

    if (!player.canInteract(interaction.member) || !inSameVoiceChannel) {
      embed
        .setColor(Colors.Red)
        .setDescription('❌ 你沒有權限和這個播放器互動');

      await edit();
      return;
    }

    const message = interaction.targetMessage;
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = message.content.match(urlRegex);

    if (!urls) {
      embed
        .setColor(Colors.Red)
        .setDescription('❌ 找不到任何有效的網址');

      await edit();
      return;
    }

    const resources: KamiResource[] = [];
    const resolver = new ResourceResolver(this);

    for (const url of urls) {
      try {
        const resource = await resolver.resolve(url);
        if (resource) {
          resources.push(resource.setMember(interaction.member));
        }
      }
      catch (error) {
        if (error instanceof Error) {
          Logger.error(`Failed to resolve URL: ${url}`, error.message);
        }
      }
    }

    if (resources.length === 0) {
      embed
        .setColor(Colors.Red)
        .setDescription('❌ 找不到任何有效的資源');

      await edit();
      return;
    }

    await player.addResource(resources);

    if (resources.length === 1) {
      embed
        .setColor(Colors.Green)
        .setDescription(`✅ 已將「${hyperlink(resources[0].title, resources[0].url)}」加入播放佇列`);
    }
    else {
      const description: string[] = resources
        .slice(0, 5)
        .map((v) => hyperlink(v.title, v.url));

      if (resources.length > 5) {
        description.push(`...還有 ${resources.length - 5} 個項目`);
      }

      embed
        .setColor(Colors.Green)
        .setDescription(`✅ 已將 ${resources.length} 個項目新增至佇列\n${unorderedList(description)}`)
        .setThumbnail(resources[0].thumbnail);
    }

    await edit();
  },
});
