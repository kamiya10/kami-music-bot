import { SlashCommandBuilder } from "discord.js";

import SlashCommandRejectionError from "@/errors/SlashCommandRejectionError";

import { ExecutionResultType, type KamiCommand } from "&";
import { KamiMusicPlayer } from "@/core/KamiMusicPlayer";

export default {
  data: new SlashCommandBuilder()
    .setName("connect")
    .setDescription("Connect to the voice channel you currently in"),
  defer: false,
  ephemeral: true,
  execute(interaction) {
    if (!interaction.inCachedGuild()) {
      throw new SlashCommandRejectionError({
        content: "這個指令只能在伺服器中使用",
        ephemeral: true,
      });
    }

    const guild = interaction.guild;    
    const member = interaction.member;
    
    const text = interaction.channel;
    const voice = interaction.member.voice.channel;

    if (!voice || !text) {
      throw new SlashCommandRejectionError({
        content: "你需要在語音頻道內才能使用這個指令",
        ephemeral: true,
      });
    }

    const player = this.players.get(guild.id);

    if (!player) {
      this.players.set(
        guild.id, 
        new KamiMusicPlayer(
          this,
          member,
          text,
          voice,
        ),
      );

      return Promise.resolve({
        type: ExecutionResultType.SingleSuccess,
        payload: {
          content: `📥 ${voice}`,
        },
      });
    }

    const isMemberPlayerOwner = player.locked && player.owner.id == member.id;
    const isMemberVoiceSameAsPlayerVoice = player.voice.id == voice.id;

    if (!isMemberPlayerOwner && !isMemberVoiceSameAsPlayerVoice) {
      throw new SlashCommandRejectionError({
        content: "你沒有權限和這個播放器互動",
        ephemeral: true,
      });
    }

    
    player.connect(voice);

    return Promise.resolve({
      type: ExecutionResultType.SingleSuccess,
      payload: {
        content: isMemberVoiceSameAsPlayerVoice ? `🔄️ ${voice}` : `📥 ${voice}`,
      },
    });
  },
} as KamiCommand;