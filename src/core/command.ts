import { Collection, SlashCommandSubcommandGroupBuilder } from 'discord.js';
import { SlashCommandBuilder } from 'discord.js';

import type { AnySelectMenuInteraction, AutocompleteInteraction, Awaitable, ButtonInteraction, ChatInputCommandInteraction, ModalSubmitInteraction, SharedSlashCommand, SlashCommandSubcommandBuilder } from 'discord.js';
import type { KamiClient } from '@/core/client';

interface KamiCommandHandlers {
  execute: (this: KamiClient, interaction: ChatInputCommandInteraction<'cached'>) => Awaitable<void>;
  onAutocomplete?: (this: KamiClient, interaction: AutocompleteInteraction<'cached'>) => Awaitable<void>;
  onButton?: (this: KamiClient, interaction: ButtonInteraction<'cached'>, buttonId: string) => Awaitable<void>;
  onModalSubmit?: (this: KamiClient, interaction: ModalSubmitInteraction<'cached'>, modalId: string) => Awaitable<void>;
  onSelectMenu?: (this: KamiClient, interaction: AnySelectMenuInteraction<'cached'>, menuId: string) => Awaitable<void>;
}

export interface KamiCommandOptions extends KamiCommandHandlers {
  builder: SharedSlashCommand | SlashCommandBuilder;
  groups?: KamiSubcommandGroup[];
  subcommands?: KamiSubcommand[];
}

export interface KamiSubcommandOptions extends KamiCommandHandlers {
  builder: SlashCommandSubcommandBuilder;
}

export interface KamiSubcommandGroupOptions {
  name: string;
  description: string;
  subcommands: KamiSubcommand[];
}

export class KamiCommand {
  builder: SharedSlashCommand | SlashCommandBuilder;
  execute: (this: KamiClient, interaction: ChatInputCommandInteraction<'cached'>) => Awaitable<void>;
  onAutocomplete?: (this: KamiClient, interaction: AutocompleteInteraction<'cached'>) => Awaitable<void>;
  onButton?: (this: KamiClient, interaction: ButtonInteraction<'cached'>, buttonId: string) => Awaitable<void>;
  onModalSubmit?: (this: KamiClient, interaction: ModalSubmitInteraction<'cached'>, modalId: string) => Awaitable<void>;
  onSelectMenu?: (this: KamiClient, interaction: AnySelectMenuInteraction<'cached'>, menuId: string) => Awaitable<void>;

  groups = new Collection<string, KamiSubcommandGroup>();
  subcommands = new Collection<string, KamiSubcommand>();

  constructor(options: KamiCommandOptions) {
    this.builder = options.builder;
    this.execute = options.execute;
    this.onAutocomplete = options.onAutocomplete;
    this.onButton = options.onButton;
    this.onModalSubmit = options.onModalSubmit;
    this.onSelectMenu = options.onSelectMenu;

    if (this.builder instanceof SlashCommandBuilder) {
      if (options.groups) {
        for (const group of options.groups) {
          this.builder?.addSubcommandGroup(group.builder);
        }
      }

      if (options.subcommands) {
        for (const subcommand of options.subcommands) {
          this.builder?.addSubcommand(subcommand.builder);
        }
      }
    }
  }
}

export class KamiSubcommand {
  builder: SlashCommandSubcommandBuilder;
  execute: (this: KamiClient, interaction: ChatInputCommandInteraction<'cached'>) => Awaitable<void>;
  onAutocomplete?: (this: KamiClient, interaction: AutocompleteInteraction<'cached'>) => Awaitable<void>;
  onButton?: (this: KamiClient, interaction: ButtonInteraction<'cached'>, buttonId: string) => Awaitable<void>;
  onModalSubmit?: (this: KamiClient, interaction: ModalSubmitInteraction<'cached'>, modalId: string) => Awaitable<void>;
  onSelectMenu?: (this: KamiClient, interaction: AnySelectMenuInteraction<'cached'>, menuId: string) => Awaitable<void>;

  constructor(options: KamiSubcommandOptions) {
    this.builder = options.builder;
    this.execute = options.execute;
    this.onAutocomplete = options.onAutocomplete;
    this.onButton = options.onButton;
    this.onModalSubmit = options.onModalSubmit;
    this.onSelectMenu = options.onSelectMenu;
  }
}

export class KamiSubcommandGroup {
  builder: SlashCommandSubcommandGroupBuilder;
  subcommands = new Collection<string, KamiSubcommand>();

  constructor(options: KamiSubcommandGroupOptions) {
    this.builder = new SlashCommandSubcommandGroupBuilder()
      .setName(options.name)
      .setDescription(options.description);

    for (const subcommand of options.subcommands) {
      this.builder.addSubcommand(subcommand.builder);
      this.subcommands.set(subcommand.builder.name, subcommand);
    }
  }

  execute(client: KamiClient, interaction: ChatInputCommandInteraction<'cached'>) {
    const name = interaction.options.getSubcommand();
    const command = this.subcommands.get(name);
    if (!command) return;
    command.execute.call(client, interaction);
  };

  onAutocomplete(client: KamiClient, interaction: AutocompleteInteraction<'cached'>) {
    const name = interaction.options.getSubcommand();
    const command = this.subcommands.get(name);
    if (!command?.onAutocomplete) throw new Error(`Subcommand ${this.builder.name} → ${name} not found`);
    command.onAutocomplete.call(client, interaction);
  };

  onButton(client: KamiClient, interaction: ButtonInteraction<'cached'>, id: string) {
    const [commandName, buttonId] = id.split(/:(.*)/s);
    const command = this.subcommands.get(commandName);
    if (!command?.onButton) return;
    command.onButton.call(client, interaction, buttonId);
  };

  onModalSubmit(client: KamiClient, interaction: ModalSubmitInteraction<'cached'>, id: string) {
    const [commandName, modalId] = id.split(/:(.*)/s);
    const command = this.subcommands.get(commandName);
    if (!command?.onModalSubmit) return;
    command.onModalSubmit.call(client, interaction, modalId);
  };

  onSelectMenu(client: KamiClient, interaction: AnySelectMenuInteraction<'cached'>, id: string) {
    const [commandName, menuId] = id.split(/:(.*)/s);
    const command = this.subcommands.get(commandName);
    if (!command?.onSelectMenu) return;
    command.onSelectMenu.call(client, interaction, menuId);
  };
}
