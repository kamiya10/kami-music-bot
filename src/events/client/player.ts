import { Colors, EmbedBuilder, Events } from 'discord.js';

import { EventHandler } from '@/core/event';

export default new EventHandler({
  event: Events.InteractionCreate,
  async on(interaction) {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isButton()) return;

    const [type, id] = interaction.customId.split(':');
    if (type != 'player' || !id) return;

    const player = this.players.get(interaction.guild.id);
    if (!player) return;

    if (!player.canInteract(interaction.member)) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Red)
            .setDescription('❌ 你沒有權限和這個播放器互動'),
        ],
      });
      return;
    }

    if (id.startsWith('offset')) {
      switch (id) {
        case 'offset-1s':
          player._lyricsOffset -= 1000;
          break;
        case 'offset-250ms':
          player._lyricsOffset -= 250;
          break;
        case 'offset-reset':
          player._lyricsOffset = 0;
          break;
        case 'offset+250ms':
          player._lyricsOffset += 250;
          break;
        case 'offset+1s':
          player._lyricsOffset += 1000;
          break;
      }
    }

    if (id.startsWith('control')) {
      switch (id) {
        case 'control-prev':
          player.backward();
          return;
        case 'control-next':
          player.forward();
          return;
        case 'control-pause':
          player.player?.pause();
          break;
        case 'control-resume':
          player.player?.unpause();
          break;
        case 'control-remove':
          player.removeResource(player.currentIndex);
          break;
        case 'control-destroy':
          player.destroy();
          await interaction.reply({
            content: '👋',
            ephemeral: true,
          });
          return;
      }
    }

    await interaction.update({});
    await player.updateMessage(player._currentResource?.metadata, true);
  },
});
