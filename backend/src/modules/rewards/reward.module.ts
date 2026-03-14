import { Module } from '@nestjs/common';
import { RewardController } from './reward.controller';
import { RewardRepository } from './reward.repository';
import { RewardService } from './reward.service';

@Module({
  controllers: [RewardController],
  providers: [RewardRepository, RewardService],
  exports: [RewardService],
})
export class RewardModule {}
