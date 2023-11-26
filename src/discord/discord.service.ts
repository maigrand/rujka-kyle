import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Client, Events, IntentsBitField, Partials, TextChannel, GuildEmoji,
  EmbedBuilder, SlashCommandBuilder, Routes, REST,
} from 'discord.js';
import { MonitoringService } from '@/discord/modules/monitoring/monitoring.service';
import { RconService } from '@/discord/modules/rcon/rcon.service';
import { commands } from '@/discord/util/commands';

@Injectable()
export class DiscordService {
  private readonly DISCORD_TOKEN = this.configService.get<string>('DISCORD_TOKEN');

  private readonly DISCORD_CLIENT_ID = this.configService.get<string>('DISCORD_CLIENT_ID');

  constructor(
    private readonly configService: ConfigService,
    private readonly monitoringService: MonitoringService,
    private readonly rconService: RconService,
  ) {
    this.client.login(this.DISCORD_TOKEN)
      .then(() => {
        this.registerEvents(this.client);
        const emoji: GuildEmoji = this.client.emojis.cache?.find((guildEmoji) => guildEmoji.name === 'greendot');
        this.monitoringService.updateTask(emoji);
      })
      .catch((e) => {
        console.error('discord login error:', e);
      });
  }

  private client = new Client({
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    intents: [
      IntentsBitField.Flags.Guilds,
      IntentsBitField.Flags.GuildMessages,
      // IntentsBitField.Flags.GuildMessageReactions,
      // IntentsBitField.Flags.GuildMembers,
      // IntentsBitField.Flags.GuildPresences,
      IntentsBitField.Flags.GuildVoiceStates,
      IntentsBitField.Flags.MessageContent,
    ],
  });

  private registerEvents(client: Client) {
    client.once(Events.ClientReady, async (clientBot) => {
      const d = new Date();

      // eslint-disable-next-line no-console
      console.log(`${d.toUTCString()} ready ${clientBot.user.tag}`);

      this.registerCommands(client)
      // eslint-disable-next-line no-console
        .catch((e) => console.error(e));
    });

    client.on('debug', (info) => {
      console.log('debugInfo:', info);
    });

    client.on('warn', (info) => {
      console.log('warnInfo:', info);
    });

    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) {
        return;
      }
      if (!interaction.guildId) {
        return;
      }
      const guild = this.client.guilds.cache.get(interaction.guildId);
      if (!guild) {
        return;
      }

      if (interaction.commandName === commands.monitoringAdd.name) {
        await interaction.deferReply({ ephemeral: true });

        try {
          const { guildId } = interaction;
          const textChannel = interaction.options.getChannel('destination') as TextChannel;
          const address = interaction.options.getString('address');
          const name = interaction.options.getString('name');
          const password = interaction.options.getString('password');

          await this.monitoringService.addServer(guildId, textChannel, address, name, password);

          await interaction.editReply('Added.');

          await this.registerCommands(client);
        } catch (e) {
          await interaction.editReply(JSON.stringify(e));
        }
      } else if (interaction.commandName === commands.monitoringList.name) {
        await interaction.deferReply({ ephemeral: true });

        const monitoringServerList = await this.monitoringService.listServers(guild.id);
        const emb = new EmbedBuilder();

        const list = monitoringServerList
          .map((monitoringServer) => {
            const textChannel = interaction.guild.channels.cache.get(monitoringServer.channelId)
              ?? interaction.guild.channels.fetch(monitoringServer.channelId);
            const pass = monitoringServer.password ?? '';
            return `${textChannel.toString()} ${monitoringServer.index}) ${monitoringServer.name} ${monitoringServer.address} ${pass} (${monitoringServer.id})`;
          })
          .join('\n');

        const description = `channel index) name adress:port password (id)\n\n${list}`;

        emb.setTitle('Server list');
        emb.setDescription(description);

        await interaction.editReply({ embeds: [emb] });
      } else if (interaction.commandName === commands.monitoringEdit.name) {
        await interaction.deferReply({ ephemeral: true });

        try {
          const monitoringServerId = interaction.options.getString('name');
          const monitoringServer = await this.monitoringService
            .findById(parseInt(monitoringServerId, 10), interaction.guildId);

          if (!monitoringServer) {
            await interaction.editReply('Server not found');
            return;
          }

          const newName = interaction.options.getString('newname');
          const address = interaction.options.getString('address');
          const password = interaction.options.getString('password');
          const index = interaction.options.getInteger('index');

          const data = {
            name: newName || monitoringServer.name,
            address: address || monitoringServer.address,
            password: password || monitoringServer.password,
            index: index ?? monitoringServer.index,
            messageId: monitoringServer.messageId,
          };

          await this.monitoringService
            .updateServer(parseInt(monitoringServerId, 10), guild.id, data);
          await this.registerCommands(client);
          await interaction.editReply('Updated');
        } catch (e) {
          await interaction.editReply(JSON.stringify(e));
        }
      } else if (interaction.commandName === commands.monitoringDelete.name) {
        await interaction.deferReply({ ephemeral: true });

        const monitoringServerId = interaction.options.getString('name');
        const monitoringServer = await this.monitoringService
          .findById(parseInt(monitoringServerId, 10), interaction.guildId);

        if (!monitoringServer) {
          await interaction.editReply('Server not found');
          return;
        }

        const textChannel = guild.channels.cache.get(monitoringServer.channelId) as TextChannel
              ?? await guild.channels.fetch(monitoringServer.channelId) as TextChannel;
        const message = await textChannel.messages.fetch(monitoringServer.messageId);
        await message.delete();
        await this.monitoringService
          .deleteServer(parseInt(monitoringServerId, 10), interaction.guildId);

        await interaction.editReply(`Deleted ${monitoringServer.name} in ${textChannel.toString()}`);
        await this.registerCommands(client);
      } else if (interaction.commandName === commands.monitoringRebuild.name) {
        await interaction.deferReply({ ephemeral: true });

        const monitoringServerList = await this.monitoringService.listServers(guild.id, true);
        const operations = monitoringServerList.map(async (monitoringServer) => {
          const textChannel = guild.channels.cache.get(monitoringServer.channelId) as TextChannel
              ?? await guild.channels.fetch(monitoringServer.channelId) as TextChannel;

          const oldMessage = await textChannel.messages.fetch(monitoringServer.messageId);
          await oldMessage.delete();

          const message = await textChannel.send(
            { embeds: [new EmbedBuilder().setTitle(monitoringServer.name)] },
          );

          return this.monitoringService
            .updateServer(
              monitoringServer.id,
              guild.id,
              {
                name: monitoringServer.name,
                address: monitoringServer.address,
                password: monitoringServer.password,
                index: monitoringServer.index,
                messageId: message.id,
              },
            );
        });

        await Promise.all(operations);

        await interaction.editReply('Rebuild.');
      } else if (interaction.commandName === commands.rconip.name) {
        await interaction.deferReply({ ephemeral: true });

        const ip = interaction.options.getString('ip');
        const rconIp = await this.rconService.findByIp(ip);

        const emb = new EmbedBuilder();
        emb.setTitle(rconIp.ip);
        emb.setDescription(rconIp.names.map((name) => name.name).join(', '));

        await interaction.editReply({ embeds: [emb] });
      } else if (interaction.commandName === commands.rconname.name) {
        await interaction.deferReply({ ephemeral: true });

        const name = interaction.options.getString('name');
        const rconNameList = await this.rconService.findByName(name);

        const emb = new EmbedBuilder();
        const description = rconNameList.map((rconName) => `${rconName.name} ${rconName.ips.map((rconIp) => rconIp.ip).join(', ')}`).join('\n');
        emb.setTitle('find by name');
        emb.setDescription(description);

        await interaction.editReply({ embeds: [emb] });
      }
    });
  }

  private async registerCommands(client: Client) {
    const rest = new REST({ version: '10' }).setToken(this.DISCORD_TOKEN);

    const prepareCommands = (guildId: string) => Object.values(commands).map(async (command) => {
      const out = new SlashCommandBuilder();
      out.setName(command.name);
      out.setDescription(command.description);
      out.setDefaultMemberPermissions(command.defaultPermission);

      const monitoringServerList = await this.monitoringService.listServers(guildId);
      const names = monitoringServerList.map((monitoringServer) => ({
        name: `${monitoringServer.id}) ${monitoringServer.name}`,
        value: `${monitoringServer.id}`,
      }));

      command.options?.forEach((option) => {
        // eslint-disable-next-line default-case
        switch (option.type) {
          case 'CHANNEL': {
            out.addChannelOption((channelOption) => channelOption
              .setName(option.name)
              .setDescription(option.description)
              .setRequired(option.required));
            break;
          }
          case 'STRING': {
            if (option.monitoringServerNamesChoices) {
              const choices = names.map((obj) => ({
                name: obj.name,
                value: obj.value,
              }));

              out.addStringOption((stringOption) => stringOption
                .setName(option.name)
                .setDescription(option.description)
                .setRequired(option.required)
                .addChoices(...choices));
              break;
            }
            out.addStringOption((stringOption) => stringOption
              .setName(option.name)
              .setDescription(option.description)
              .setRequired(option.required));
            break;
          }
          case 'INTEGER': {
            out.addIntegerOption((integerOption) => integerOption
              .setName(option.name)
              .setDescription(option.description)
              .setRequired(option.required));
            break;
          }
        }
      });
      return out;
    });

    // eslint-disable-next-line no-console
    console.log('Started refreshing guild application [/] commands.');

    // eslint-disable-next-line no-restricted-syntax
    for (const guild of client.guilds.cache.values()) {
      // rest.put(Routes.applicationGuildCommands(this.DISCORD_CLIENT_ID, guild.id), {body: []})
      //    .then(() => console.log('Successfully removed guild application [/] commands.'))

      const prepareCommandsPromises = prepareCommands(guild.id);

      Promise.all(prepareCommandsPromises)
        .then((preparedCommands) => {
          rest
            .put(
              Routes.applicationGuildCommands(this.DISCORD_CLIENT_ID, guild.id),
              { body: preparedCommands },
            )
            .then(() => console.log('Successfully reloaded guild application [/] commands.'));
        });
    }
  }
}
