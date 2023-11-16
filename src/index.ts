import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '@/app.module';

(async () => {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  process.on('beforeExit', async () => {
    await app.close();
  });

  // await app.listen(AppModule.port);
  // eslint-disable-next-line no-console
  // console.log(`Started in port: ${AppModule.port}`);

  await app.init();
})();
