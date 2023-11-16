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
        this.monitoringService.update(emoji);
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

        const { guildId } = interaction;
        const textChannel = interaction.options.getChannel('destination') as TextChannel;
        const address = interaction.options.getString('address');
        const name = interaction.options.getString('name');
        const password = interaction.options.getString('password');

        await this.monitoringService.addServer(guildId, textChannel, address, name, password);

        await interaction.editReply('Added.');
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
      } else if (interaction.commandName === commands.monitoringDelete.name) {
        await interaction.deferReply({ ephemeral: true });

        const textChannel = interaction.options.getChannel('destination') as TextChannel;
        const name = interaction.options.getString('name');
        await this.monitoringService.deleteServer(interaction.guildId, textChannel.id, name);

        await interaction.editReply(`Deleted ${name} in ${textChannel.toString()}`);
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

    const preparedCommands = Object.values(commands).map((command) => {
      const out = new SlashCommandBuilder();
      out.setName(command.name);
      out.setDescription(command.description);
      out.setDefaultMemberPermissions(command.defaultPermission);
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
            out.addStringOption((stringOption) => stringOption
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

      rest
        .put(
          Routes.applicationGuildCommands(this.DISCORD_CLIENT_ID, guild.id),
          { body: preparedCommands },
        )
        .then(() => console.log('Successfully reloaded guild application [/] commands.'));
    }
  }
}
