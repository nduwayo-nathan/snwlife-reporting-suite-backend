import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstallmentsController } from './installments.controller';
import { InstallmentsService } from './installments.service';
import { Premium } from '../entities/premium.entity';
import { Policy } from '../entities/policy.entity';
import { Claim } from '../entities/claim.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Premium, Policy, Claim])],
  controllers: [InstallmentsController],
  providers: [InstallmentsService],
})
export class InstallmentsModule {}
