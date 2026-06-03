import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Claim } from '../entities/claim.entity';
import { Policy } from '../entities/policy.entity';
import { ClaimsService } from './claims.service';
import { ClaimsController } from './claims.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Claim, Policy])],
  controllers: [ClaimsController],
  providers: [ClaimsService],
})
export class ClaimsModule {}
