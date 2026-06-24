import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Policy } from './entities/policy.entity';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectRepository(Policy)
    private policyRepo: Repository<Policy>,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('api/years')
  async getYears() {
    const years = await this.policyRepo
      .createQueryBuilder('p')
      .select('DISTINCT EXTRACT(YEAR FROM p.effective_date)::int', 'year')
      .where('p.effective_date IS NOT NULL')
      .orderBy('year', 'DESC')
      .getRawMany();
    return years.map(r => r.year);
  }
}
