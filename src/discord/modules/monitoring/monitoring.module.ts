import { Module } from '@nestjs/common';
import { MonitoringService } from '@/discord/modules/monitoring/monitoring.service';
import { MonitoringTaskService } from '@/discord/modules/monitoring/monitoringTask.service';

@Module({
  providers: [
    MonitoringService,
    MonitoringTaskService,
  ],
  exports: [MonitoringService],
})
export class MonitoringModule {}
