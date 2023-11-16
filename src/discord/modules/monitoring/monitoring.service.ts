import { Injectable } from '@nestjs/common';
import { EmbedBuilder, GuildEmoji, TextChannel } from 'discord.js';
import { PrismaService } from '@/core/prisma/prisma.service';
import { getStatusSmart } from 'jka-core';
import { MonitoringServer } from '@prisma/client';
import { MonitoringTaskService } from '@/discord/modules/monitoring/monitoringTask.service';

@Injectable()
export class MonitoringService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly monitoringTaskService: MonitoringTaskService,
  ) {

  }

  public async addServer(
    guildId: string,
    textChannel: TextChannel,
    address: string,
    name: string,
    password: string,
  ) {
    const message = await textChannel.send({ embeds: [new EmbedBuilder().setTitle(name)] });

    try {
      const monitoringServerCount = await this.prismaService.monitoringServer.count();

      await this.prismaService.monitoringServer.create({
        data: {
          guildId,
          channelId: textChannel.id,
          messageId: message.id,
          address,
          name,
          password,
          index: monitoringServerCount + 1,
        },
      });
    } catch (e) {
      console.error(e);
    }
  }

  public async listServers(guildId: string) {
    return this.prismaService.monitoringServer.findMany({
      where: {
        guildId,
      },
    });
  }

  public async deleteServer(guildId: string, channelId: string, name: string) {
    try {
      await this.prismaService.monitoringServer.deleteMany({
        where: {
          guildId,
          channelId,
          name,
        },
      });
    } catch (e) {
      console.error(e);
    }
  }

  public async update(emoji: GuildEmoji | undefined) {
    try {
      const monitoringServerList = await this.prismaService.monitoringServer.findMany();

      const jkaResponsePromises = monitoringServerList
        .map(async (monitoringServer: MonitoringServer) => {
          const jkaResponse = await getStatusSmart(monitoringServer.address);
          return { monitoringServer, jkaResponse };
        });

      const results = await Promise.all(jkaResponsePromises);

      results.forEach((result) => {
        const { monitoringServer, jkaResponse } = result;

        this.monitoringTaskService.updateServerState(monitoringServer, jkaResponse, emoji);
      });
    } catch (e) {
      console.error(e);
    } finally {
      await this.monitoringTaskService.delay(30000);
      this.update(emoji);
    }
  }
}
