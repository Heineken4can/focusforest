import { Module } from '@nestjs/common';
import { RewardRepository } from './reward.repository';
import { RewardService } from './reward.service';

@Module({
  providers: [RewardRepository, RewardService],
  exports: [RewardService],
})
export class RewardModule {}
