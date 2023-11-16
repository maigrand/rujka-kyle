import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DiscordModule } from '@/discord/discord.module';
import { CoreModule } from '@/core/core.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    CoreModule,
    DiscordModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  // static port: number;

  // constructor(configService: ConfigService) {
  //   AppModule.port = configService.get('PORT');
  // }
}
