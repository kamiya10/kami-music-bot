import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, MessageComponentInteraction } from 'discord.js';

import Logger from '../utils/logger';

import type { InteractionEditReplyOptions, InteractionReplyOptions, InteractionUpdateOptions } from 'discord.js';

export interface PaginationOptions<T> {
  items: T[];
  itemsPerPage?: number;
  currentPage?: number;
  embedBuilder: (items: T[], currentPage: number, totalPages: number) => EmbedBuilder;
  customId?: string;
}

export class PaginationManager<T> {
  private items: T[];
  private itemsPerPage: number;
  private currentPage: number;
  private embedBuilder: (items: T[], currentPage: number, totalPages: number) => EmbedBuilder;
  private customId: string;

  constructor(options: PaginationOptions<T>) {
    this.items = options.items;
    this.itemsPerPage = options.itemsPerPage ?? 10;
    this.currentPage = options.currentPage ?? 1;
    this.embedBuilder = options.embedBuilder;
    this.customId = options.customId ?? 'pagination';
  }

  private get totalPages(): number {
    return Math.ceil(this.items.length / this.itemsPerPage);
  }

  private getCurrentPageItems(): T[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.items.slice(startIndex, startIndex + this.itemsPerPage);
  }

  private createButtons(): ActionRowBuilder<ButtonBuilder> {
    const previousButton = new ButtonBuilder()
      .setCustomId(`${this.customId}_prev`)
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(this.currentPage === 1);

    const nextButton = new ButtonBuilder()
      .setCustomId(`${this.customId}_next`)
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(this.currentPage === this.totalPages);

    const pageIndicator = new ButtonBuilder()
      .setCustomId(`${this.customId}_page`)
      .setLabel(`${this.currentPage}/${this.totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);

    return new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        previousButton,
        pageIndicator,
        nextButton,
      );
  }

  public createReply(): InteractionReplyOptions {
    const embed = this.embedBuilder(
      this.getCurrentPageItems(),
      this.currentPage,
      this.totalPages,
    );

    return {
      embeds: [embed],
      components: this.items.length > this.itemsPerPage ? [this.createButtons()] : [],
    };
  }

  public async handleInteraction(interaction: MessageComponentInteraction): Promise<void> {
    if (!interaction.customId.startsWith(this.customId)) return;

    const action = interaction.customId.split('_')[1];

    if (action === 'prev' && this.currentPage > 1) {
      this.currentPage--;
    }
    else if (action === 'next' && this.currentPage < this.totalPages) {
      this.currentPage++;
    }

    const reply = this.createReply();
    await interaction.update(reply as InteractionUpdateOptions);
  }

  public async handle(interaction: CommandInteraction): Promise<void> {
    try {
      const reply = this.createReply();
      const message = await interaction.editReply(reply as InteractionEditReplyOptions);

      // If there's only one page, no need to set up collectors
      if (this.items.length <= this.itemsPerPage) return;

      const collector = message.createMessageComponentCollector({
        time: 5 * 60 * 1000, // 5 minutes
      });

      collector.on('collect', (i) => {
        if (i.user.id !== interaction.user.id) return;

        void this.handleInteraction(i).catch((error) => {
          Logger.error('Failed to handle pagination interaction', error);
        });
      });

      collector.on('end', () => {
        const disabledReply = { ...reply, components: [] } as InteractionEditReplyOptions;
        void interaction.editReply(disabledReply);
      });
    }
    catch (error) {
      Logger.error('Failed to setup pagination', error);
    }
  }
}
