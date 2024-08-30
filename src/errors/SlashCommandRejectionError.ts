import type { InteractionReplyOptions, MessageCreateOptions } from "discord.js";

export default class SlashCommandRejectionError  extends Error {
  payload: InteractionReplyOptions & MessageCreateOptions;

  constructor(payload: InteractionReplyOptions & MessageCreateOptions) {
    super();
    this.payload = payload;
  }
}