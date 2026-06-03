import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proposal } from '../entities/proposal.entity';
import { ProposalQueryParams } from '../share/dto/proposal-query-params.dto';
import {
  resolveYears,
  yearCondition,
} from '../share/helpers/date-filter.helper';

@Injectable()
export class ProposalsService {
  constructor(
    @InjectRepository(Proposal) private proposalRepo: Repository<Proposal>,
  ) {}

  async getYears(): Promise<number[]> {
    const rows = await this.proposalRepo
      .createQueryBuilder('p')
      .select('DISTINCT EXTRACT(YEAR FROM p."Created"::timestamp)::int', 'year')
      .where('p."Created" IS NOT NULL')
      .orderBy('year', 'ASC')
      .getRawMany();
    return rows.map((r) => r.year);
  }

  async getMonthlySummary(q: ProposalQueryParams) {
    const years = resolveYears(q);

    const qb = this.proposalRepo
      .createQueryBuilder('p')
      .select('EXTRACT(MONTH FROM p."Created"::timestamp)::int', 'month')
      .addSelect('COUNT(p."ID")', 'count')
      .addSelect('SUM(p."PremiumAmount")', 'totalAmount')
      .where(yearCondition('p', 'Created', years))
      .groupBy('month')
      .orderBy('month', 'ASC');

    if (q.product)
      qb.andWhere('p."ProductType" = :product', { product: q.product });
    if (q.status) qb.andWhere('p."Status" = :status', { status: q.status });

    const rows = await qb.getRawMany();
    return rows.map((r) => ({
      month: r.month,
      count: +r.count,
      totalAmount: +r.totalAmount,
    }));
  }

  async getRecords(q: ProposalQueryParams) {
    const years = resolveYears(q);

    const qb = this.proposalRepo
      .createQueryBuilder('p')
      .where(yearCondition('p', 'Created', years));

    if (q.product)
      qb.andWhere('p."ProductType" = :product', { product: q.product });
    if (q.status) qb.andWhere('p."Status" = :status', { status: q.status });
    if (q.search) {
      qb.andWhere(
        '(p."ProposalNumber" ILIKE :s OR p."PolicyHolderName" ILIKE :s OR p."AgentName" ILIKE :s OR p."ProductType" ILIKE :s)',
        { s: `%${q.search}%` },
      );
    }

    return qb.getMany();
  }

  async getByProduct(q: ProposalQueryParams) {
    const years = resolveYears(q);

    const qb = this.proposalRepo
      .createQueryBuilder('p')
      .select('p."ProductType"', 'product')
      .addSelect('COUNT(p."ID")', 'count')
      .addSelect('SUM(p."PremiumAmount")', 'totalAmount')
      .where(yearCondition('p', 'Created', years))
      .groupBy('p."ProductType"');

    if (q.status) qb.andWhere('p."Status" = :status', { status: q.status });

    const rows = await qb.getRawMany();
    return rows.map((r) => ({
      product: r.product,
      count: +r.count,
      totalAmount: +r.totalAmount,
    }));
  }

  async getByStatus(q: ProposalQueryParams) {
    const years = resolveYears(q);

    const qb = this.proposalRepo
      .createQueryBuilder('p')
      .select('p."Status"', 'status')
      .addSelect('COUNT(p."ID")', 'count')
      .where(yearCondition('p', 'Created', years))
      .groupBy('p."Status"');

    if (q.product)
      qb.andWhere('p."ProductType" = :product', { product: q.product });

    const rows = await qb.getRawMany();
    return rows.map((r) => ({ status: r.status, count: +r.count }));
  }

  async getCards(q: ProposalQueryParams) {
    const years = resolveYears(q);

    const qb = this.proposalRepo
      .createQueryBuilder('p')
      .select('COUNT(p."ID")', 'totalProposals')
      .addSelect('SUM(p."PremiumAmount")', 'totalAmount')
      .addSelect('AVG(p."PremiumAmount")', 'avgPremium')
      .where(yearCondition('p', 'Created', years));

    if (q.product)
      qb.andWhere('p."ProductType" = :product', { product: q.product });
    if (q.status) qb.andWhere('p."Status" = :status', { status: q.status });

    const row = await qb.getRawOne();
    return {
      totalProposals: +row.totalProposals,
      totalAmount: +row.totalAmount,
      avgPremium: +row.avgPremium,
    };
  }
}
