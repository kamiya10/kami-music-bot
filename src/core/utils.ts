import { Colors, EmbedBuilder } from "discord.js";
import { Platform } from "@/class/KamiMusicMetadata";

import type {  ChatInputCommandInteraction } from "discord.js";

export const replyError = async (interaction: ChatInputCommandInteraction, message: string)=>{
  const embed = new EmbedBuilder()
    .setColor(Colors.Red)
    .setDescription(message);

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ 
      embeds : [embed],
    });
    return;
  }

  await interaction.reply({ 
    embeds  : [embed], 
    options : {
      ephemeral : true,
    } 
  });
}

const Domains = {
  [Platform.Youtube] : [
    "youtube.com",
    "youtu.be"
  ]
} as Record<Platform, string[]>;

export const getPlatform = (url: string): Platform | null => {
  for (const key in Domains) {
    const platform = key as Platform;

    if (Domains[platform].some(domain => url.includes(domain))) {
      return platform;
    };
  }

  return null;
}