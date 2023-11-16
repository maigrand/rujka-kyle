import { Injectable } from '@nestjs/common';
import { MonitoringServer } from '@prisma/client';
import { TGetStatusSmartResponse } from 'jka-core';
import { GuildEmoji } from 'discord.js';
import mapUrl from '@/discord/modules/monitoring/mapUrl.json';
import axios, { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MonitoringTaskService {
  constructor(private readonly configService: ConfigService) {
  }

  private readonly DISCORD_TOKEN = this.configService.get<string>('DISCORD_TOKEN');

  private readonly INT_COLOR_NORMAL: number = 696330;

  private readonly INT_COLOR_EMPTY: number = 673290;

  private readonly INT_COLOR_OFFLINE: number = 3276800;

  public async updateServerState(
    monitoringServer: MonitoringServer,
    jkaResponse: TGetStatusSmartResponse,
    emoji: GuildEmoji | undefined,
  ) {
    let data: object;

    if (jkaResponse === undefined) {
      data = this.getOfflineServerData(monitoringServer);
    } else if (jkaResponse.clients.length === 0) {
      const emoteOnline = emoji || '\uD83D\uDFE2';
      data = this.getEmptyServerData(monitoringServer, jkaResponse, emoteOnline);
    } else {
      const playersTableHead = 'N) Sc | Ping | Name';

      const playersTableBody = jkaResponse.clients.map((client, i) => {
        const clientName = this.validateNickname(client.name);
        // Discord hack with '⠀' (unicode space char) https://www.compart.com/en/unicode/U+2800
        return `${i + 1})⠀${client.score} | ${client.ping} | ${this.normalizeJkaString(clientName)}`;
      }).join('\n');

      data = this.getOnlineServerData(monitoringServer, jkaResponse, `${playersTableHead}\n${playersTableBody}`);
    }

    await this.sendRequest(monitoringServer, data);
  }

  private getOfflineServerData(monitoringServer: MonitoringServer) {
    const date = new Date();
    return {
      embeds: [
        {
          title: `\uD83D\uDEAB ${monitoringServer.name}`,
          footer: {
            text: `/connect ${monitoringServer.address}${monitoringServer.password ? `;password ${monitoringServer.password}` : ''}`,
          },
          timestamp: date.toISOString(),
          color: `${this.INT_COLOR_OFFLINE}`,
        },
      ],
    };
  }

  private getEmptyServerData(
    monitoringServer: MonitoringServer,
    jkaResponse:TGetStatusSmartResponse,
    emoji: GuildEmoji | string,
  ) {
    const date = new Date();
    const emoteOnline = emoji || '\uD83D\uDFE2';
    return {
      embeds: [
        {
          title: `${emoteOnline} **0/${jkaResponse.cvars.sv_maxclients}** | **${jkaResponse.cvars.g_gametype}** | **${(this.normalizeJkaString(jkaResponse.cvars.sv_hostname))}**`,
          footer: {
            text: `/connect ${monitoringServer.address}${monitoringServer.password ? `;password ${monitoringServer.password}` : ''}`,
          },
          timestamp: date.toISOString(),
          color: `${this.INT_COLOR_EMPTY}`,
        },
      ],
    };
  }

  private getOnlineServerData(
    monitoringServer: MonitoringServer,
    jkaResponse: TGetStatusSmartResponse,
    players: string,
  ) {
    const date = new Date();
    return {
      embeds: [
        {
          author: {
            name: `${this.normalizeJkaString(jkaResponse.cvars.sv_hostname)}`,
          },
          title: `${monitoringServer.address}`,
          fields: [
            {
              name: 'Map',
              value: `${jkaResponse.cvars.mapname.toLowerCase()}`,
              inline: true,
            },
            {
              name: 'Gametype',
              value: `${jkaResponse.cvars.g_gametype}`,
              inline: true,
            },
            {
              name: 'Fraglimit',
              value: `${jkaResponse.cvars.fraglimit.toString()}`,
              inline: true,
            },
            {
              name: 'Timelimit',
              value: `${jkaResponse.cvars.timelimit.toString()}`,
              inline: true,
            },
            {
              name: `:white_check_mark: Online ${jkaResponse.clients.length}/${jkaResponse.cvars.sv_maxclients}`,
              value: `${players}`,
              inline: false,
            },
          ],
          footer: {
            text: `/connect ${monitoringServer.address}${monitoringServer.password ? `;password ${monitoringServer.password}` : ''}`,
          },
          timestamp: date.toISOString(),
          color: `${this.INT_COLOR_NORMAL}`,
          thumbnail: {
            url: `${mapUrl[jkaResponse.cvars.mapname.toLowerCase()] === undefined ? mapUrl.default : mapUrl[jkaResponse.cvars.mapname]}`,
          },
        },
      ],
    };
  }

  private async sendRequest(monitoringServer: MonitoringServer, data: object) {
    try {
      await axios.request({
        url: `https://discord.com/api/v10/channels/${monitoringServer.channelId}/messages/${monitoringServer.messageId}`,
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          Authorization: `Bot ${this.DISCORD_TOKEN}`,
          'Content-Type': 'application/json',
        },
        data: JSON.stringify(data),
      });
    } catch (e) {
      if (e instanceof AxiosError) {
        if (e.response?.status != null && e.response?.status === 429) {
          await this.delay(e.response.data.retry_after * 1000 + 500);
          return this.sendRequest(monitoringServer, data);
        }
        throw e;
      } else {
        throw e;
      }
    }

    return null;
  }

  private normalizeJkaString(jkaString: string) {
    return jkaString.replaceAll(/\^\d/g, '');
  }

  private validateNickname(nickname: string) {
    let clientName = nickname;
    if (clientName.includes('*')) {
      clientName = clientName.replaceAll('*', '\\*');
    }
    if (clientName.includes('_')) {
      clientName = clientName.replaceAll('_', '\\_');
    }
    if (clientName.includes('"')) {
      clientName = clientName.replaceAll('"', '');
    }
    if (clientName.includes('|')) {
      clientName = clientName.replaceAll('|', '\\|');
    }
    if (clientName.includes('discord.gg')) {
      clientName = clientName.replaceAll(/.+/g, 'discord.gg');
    }
    return clientName;
  }

  public async delay(ms: number) {
    return new Promise((resolve) => { setTimeout(resolve, ms); });
  }
}
