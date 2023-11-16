import { Injectable } from '@nestjs/common';
import { rconStatus, removeColorCodes } from 'jka-core';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Interval } from '@nestjs/schedule';

@Injectable()
export class RconService {
  constructor(
    private readonly prismaService: PrismaService,
  ) {
  }

  public async findByName(name: string) {
    return this.prismaService.ipScanName.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive',
        },
      },
      include: {
        ips: true,
      },
    });
  }

  public async findByIp(ip: string) {
    return this.prismaService.ipScanIp.findUnique({
      where: {
        ip,
      },
      include: {
        names: true,
      },
    });
  }

  @Interval(60000)
  async ipScanCronTask() {
    const rconServerList = await this.prismaService.rconServer.findMany();
    const rconStatusReponsePromises = rconServerList
      .map(async (rconServer) => {
        const rconStatusResponse = await rconStatus(rconServer.address, rconServer.password, 5000);
        return { rconServer, rconStatusResponse };
      });

    const results = await Promise.all(rconStatusReponsePromises);

    results.forEach((result) => {
      const { rconStatusResponse } = result;
      rconStatusResponse.players.forEach((player) => {
        const ip = player.address.split(':')[0];
        if (!ip.match(/^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/)) {
          return;
        }
        const name = removeColorCodes(player.name);
        this.prismaService.ipScanIp.upsert({
          where: { ip },
          create: {
            ip,
            names: {
              connectOrCreate: {
                where: {
                  name,
                },
                create: {
                  name,
                },
              },
            },
          },
          update: {
            names: {
              connectOrCreate: {
                where: {
                  name,
                },
                create: {
                  name,
                },
              },
            },
          },
        })
          .catch((e) => console.error('ipscan upsert', e));
      });
    });
  }

  // private sendCommand(
  //   command: string,
  //   rconPassword: string,
  //   ip: string,
  //   port: number,
  //   timeoutMilliSecs: number,
  //   onSendCallback: (response: string) => void,
  // ) {
  //   let connectTimeout: NodeJS.Timeout;
  //   let msgTimeout: NodeJS.Timeout;
  //   let responseBuffer: string = '';
  //
  //   const connection = dgram.createSocket('udp4');
  //
  //   const buffer: Buffer = Buffer.alloc(11 + rconPassword.length + command.length); // 4 + 5 + 1 + 1
  //   // fill the buffer
  //   buffer.writeUInt32LE(0xFFFFFFFF, 0); // magic code
  //   buffer.write('rcon ', 4);
  //   buffer.write(rconPassword, 9, rconPassword.length);
  //   buffer.write(' ', 9 + rconPassword.length, 1);
  //   buffer.write(command, 10 + rconPassword.length, command.length);
  //   buffer.write('\n', 10 + rconPassword.length + command.length, 1);
  //
  //   const onMessage = (message) => {
  //     clearTimeout(connectTimeout);
  //     clearTimeout(msgTimeout);
  //     responseBuffer += message.toString('ascii').slice(4).trim();
  //
  //     msgTimeout = setTimeout(() => {
  //       connection.close();
  //     }, timeoutMilliSecs);
  //   };
  //
  //   const onClose = () => {
  //     onSendCallback.call(null, responseBuffer);
  //   };
  //
  //   const onSend = (error) => {
  //     if (!(typeof onSendCallback === 'function')) {
  //       connection.close();
  //     }
  //     if (error) {
  //       connection.close();
  //       throw error;
  //     }
  //   };
  //
  //   if ((typeof onSendCallback === 'function')) {
  //     connection.on('message', onMessage);
  //     connection.on('close', onClose);
  //   }
  //
  //   connectTimeout = setTimeout(() => {
  //     connection.close();
  //     throw new Error('Connection timeout');
  //   }, timeoutMilliSecs);
  //
  //   connection.send(buffer, 0, buffer.length, port, ip, onSend);
  // }
}
