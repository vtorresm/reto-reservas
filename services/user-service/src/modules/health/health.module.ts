import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisEventService } from '@/common/services/redis-event.service';

@Module({
  imports: [
    TerminusModule.forRoot({
      logger: true,
      errorLogStyle: 'pretty',
    }),
  ],
  controllers: [HealthController],
  providers: [RedisEventService],
  exports: [RedisEventService],
})
export class HealthModule {}