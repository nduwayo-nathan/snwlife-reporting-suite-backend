import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClaimsListController } from './claims-list.controller';
import { ClaimsListService } from './claims-list.service';
import { Claim } from '../entities/claim.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Claim])],
  controllers: [ClaimsListController],
  providers: [ClaimsListService],
})
export class ClaimsListModule {}
