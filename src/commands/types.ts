import type { 
  ChatInputCommandInteraction, 
  InteractionReplyOptions, 
  MessageCreateOptions, 
  SlashCommandBuilder, 
  SlashCommandOptionsOnlyBuilder, 
  SlashCommandSubcommandsOnlyBuilder, 
} from "discord.js";
import type { KamiClient } from "@/core/KamiClient";

export interface KamiCommand {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder;
  defer     : boolean;
  ephemeral : boolean;
  execute(
    this: KamiClient,
    interaction: ChatInputCommandInteraction<"cached">,
  ): Promise<SlashCommandResult>;
}

export enum ExecutionResultType {
  SingleSuccess,
}

export interface SlashCommandResult {
  type: ExecutionResultType;
  payload: InteractionReplyOptions & MessageCreateOptions;
  delete?: number;
}