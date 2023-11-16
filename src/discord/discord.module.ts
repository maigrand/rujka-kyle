import { Module } from '@nestjs/common';
import { DiscordService } from '@/discord/discord.service';
import { MonitoringModule } from '@/discord/modules/monitoring/monitoring.module';
import { RconModule } from '@/discord/modules/rcon/rcon.module';

@Module({
  imports: [
    MonitoringModule,
    RconModule,
  ],
  providers: [DiscordService],
})
export class DiscordModule {}
