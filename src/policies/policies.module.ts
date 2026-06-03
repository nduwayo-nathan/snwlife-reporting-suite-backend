import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Policy } from '../entities/policy.entity';
import { Premium } from '../entities/premium.entity';
import { PoliciesService } from './policies.service';
import { PoliciesController } from './policies.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Policy, Premium])],
  controllers: [PoliciesController],
  providers: [PoliciesService],
})
export class PoliciesModule {}
