import { Module } from '@nestjs/common';
import { RconService } from '@/discord/modules/rcon/rcon.service';

@Module({
  providers: [
    RconService,
  ],
  exports: [
    RconService,
  ],
})
export class RconModule {}
