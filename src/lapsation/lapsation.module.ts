import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LapsationController } from './lapsation.controller';
import { LapsationService } from './lapsation.service';
import { Policy } from '../entities/policy.entity';
import { Premium } from '../entities/premium.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Policy, Premium])],
  controllers: [LapsationController],
  providers: [LapsationService],
  exports: [LapsationService],
})
export class LapsationModule {}
