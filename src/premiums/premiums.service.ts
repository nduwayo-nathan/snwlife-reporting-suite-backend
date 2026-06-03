import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Premium } from '../entities/premium.entity';
import { Policy } from '../entities/policy.entity';
import {
  PremiumQueryParams,
  PremiumListQueryParams,
} from '../share/dto/premium-query-params.dto';
import {
  resolveYears,
  yearCondition,
} from '../share/helpers/date-filter.helper';

@Injectable()
export class PremiumsService {
  constructor(
    @InjectRepository(Premium) private premiumRepo: Repository<Premium>,
    @InjectRepository(Policy) private policyRepo: Repository<Policy>,
  ) {}

  async getYears(): Promise<number[]> {
    const rows = await this.premiumRepo
      .createQueryBuilder('p')
      .select('DISTINCT EXTRACT(YEAR FROM p."PaymentDate")::int', 'year')
      .where('p."PaymentDate" IS NOT NULL')
      .orderBy('year', 'ASC')
      .getRawMany();
    return rows.map((r) => r.year);
  }

  async getMonthlySummary(q: PremiumQueryParams) {
    const years = resolveYears(q);
    const dateField = q.dateMode === 'effective' ? 'EffectDate' : 'PaymentDate';
    const policies = q.policies?.split(',').filter(Boolean) ?? [];

    const qb = this.premiumRepo
      .createQueryBuilder('p')
      .select('EXTRACT(MONTH FROM p."PaymentDate")::int', 'month')
      .addSelect('SUM(p."PremiumPaid")', 'value')
      .addSelect('COUNT(DISTINCT p."PolicyNumber")', 'policies')
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere(yearCondition('p', dateField, years))
      .groupBy('month')
      .orderBy('month', 'ASC');

    if (q.product)
      qb.andWhere('p."ProductCode" = :product', { product: q.product });
    if (q.state) qb.andWhere('p."State" = :state', { state: q.state });
    if (policies.length)
      qb.andWhere('p."PolicyNumber" IN (:...policies)', { policies });

    const rows = await qb.getRawMany();

    // effective count per month
    const policyQb = this.policyRepo
      .createQueryBuilder('pol')
      .select('EXTRACT(MONTH FROM pol."EffectiveDate")::int', 'month')
      .addSelect('COUNT(DISTINCT pol."PolicyNumber")', 'effective')
      .where('pol."EffectiveDate" IS NOT NULL')
      .andWhere(yearCondition('pol', 'EffectiveDate', years))
      .groupBy('month');

    if (q.product)
      policyQb.andWhere('pol."ProductCode" = :product', { product: q.product });
    const effectiveRows = await policyQb.getRawMany();
    const effectiveMap = new Map(
      effectiveRows.map((r) => [r.month, +r.effective]),
    );

    return rows.map((r) => ({
      month: r.month,
      value: +r.value,
      policies: +r.policies,
      effective: effectiveMap.get(r.month) ?? 0,
    }));
  }

  async getRecords(q: PremiumQueryParams) {
    const years = resolveYears(q);
    const dateField = q.dateMode === 'effective' ? 'EffectDate' : 'PaymentDate';
    const policies = q.policies?.split(',').filter(Boolean) ?? [];

    const qb = this.premiumRepo
      .createQueryBuilder('p')
      .innerJoin(Policy, 'pol', 'pol."PolicyNumber" = p."PolicyNumber"')
      .select([
        'p."PolicyNumber" as "PolicyNumber"',
        'pol."SubscriberName" as "SubscriberName"',
        'p."ProductCode" as "ProductCode"',
        'pol."ProductName" as "ProductName"',
        'p."EffectDate" as "EffectDate"',
        'p."State" as "State"',
        'p."PremiumDuration" as "PremiumDuration"',
        'p."Premium" as "Premium"',
        'p."PremiumPaid" as "PremiumPaid"',
        'p."PaymentDate" as "PaymentDate"',
        'p."Receipt" as "Receipt"',
        'p."AgencyCode" as "AgencyCode"',
        'p."AgencyName" as "AgencyName"',
      ])
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere(yearCondition('p', dateField, years));

    if (q.product)
      qb.andWhere('p."ProductCode" = :product', { product: q.product });
    if (q.state) qb.andWhere('p."State" = :state', { state: q.state });
    if (policies.length)
      qb.andWhere('p."PolicyNumber" IN (:...policies)', { policies });

    return qb.getRawMany();
  }

  async getByProduct(q: PremiumQueryParams) {
    const years = resolveYears(q);
    const dateField = q.dateMode === 'effective' ? 'EffectDate' : 'PaymentDate';

    const qb = this.premiumRepo
      .createQueryBuilder('p')
      .select('p."ProductCode"', 'product')
      .addSelect('SUM(p."PremiumPaid")', 'total')
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere(yearCondition('p', dateField, years))
      .groupBy('p."ProductCode"');

    if (q.state) qb.andWhere('p."State" = :state', { state: q.state });

    const rows = await qb.getRawMany();
    return rows.map((r) => ({ product: r.product, total: +r.total }));
  }

  async getByState(q: PremiumQueryParams) {
    const years = resolveYears(q);
    const dateField = q.dateMode === 'effective' ? 'EffectDate' : 'PaymentDate';
    const policies = q.policies?.split(',').filter(Boolean) ?? [];

    const qb = this.premiumRepo
      .createQueryBuilder('p')
      .select('p."State"', 'state')
      .addSelect('SUM(p."PremiumPaid")', 'total')
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere(yearCondition('p', dateField, years))
      .groupBy('p."State"');

    if (q.product)
      qb.andWhere('p."ProductCode" = :product', { product: q.product });
    if (policies.length)
      qb.andWhere('p."PolicyNumber" IN (:...policies)', { policies });

    const rows = await qb.getRawMany();
    return rows.map((r) => ({ state: r.state, total: +r.total }));
  }

  async getCards(q: PremiumQueryParams) {
    const years = resolveYears(q);
    const dateField = q.dateMode === 'effective' ? 'EffectDate' : 'PaymentDate';
    const policies = q.policies?.split(',').filter(Boolean) ?? [];

    const qb = this.premiumRepo
      .createQueryBuilder('p')
      .innerJoin(Policy, 'pol', 'pol."PolicyNumber" = p."PolicyNumber"')
      .select('COUNT(DISTINCT pol."SubscriberNumber")', 'customers')
      .addSelect('COUNT(DISTINCT p."PolicyNumber")', 'policies')
      .addSelect('SUM(p."PremiumPaid")', 'premiumPaid')
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere(yearCondition('p', dateField, years));

    if (q.product)
      qb.andWhere('p."ProductCode" = :product', { product: q.product });
    if (q.state) qb.andWhere('p."State" = :state', { state: q.state });
    if (policies.length)
      qb.andWhere('p."PolicyNumber" IN (:...policies)', { policies });

    const row = await qb.getRawOne();
    return {
      customers: +row.customers,
      policies: +row.policies,
      premiumPaid: +row.premiumPaid,
    };
  }

  async getList(q: PremiumListQueryParams) {
    const years = resolveYears(q);
    const page = q.page ? +q.page : 1;
    const pageSize = q.pageSize ? +q.pageSize : 16;

    const qb = this.premiumRepo
      .createQueryBuilder('p')
      .innerJoin(Policy, 'pol', 'pol."PolicyNumber" = p."PolicyNumber"')
      .select([
        'p."PolicyNumber" as "PolicyNumber"',
        'pol."SubscriberName" as "SubscriberName"',
        'p."ProductCode" as "ProductCode"',
        'pol."ProductName" as "ProductName"',
        'p."EffectDate" as "EffectDate"',
        'p."State" as "State"',
        'p."PremiumDuration" as "PremiumDuration"',
        'p."Premium" as "Premium"',
        'p."PremiumPaid" as "PremiumPaid"',
        'p."PaymentDate" as "PaymentDate"',
        'p."Receipt" as "Receipt"',
        'p."AgencyCode" as "AgencyCode"',
        'p."AgencyName" as "AgencyName"',
      ])
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere(yearCondition('p', 'PaymentDate', years));

    if (q.product)
      qb.andWhere('p."ProductCode" = :product', { product: q.product });
    if (q.state) qb.andWhere('p."State" = :state', { state: q.state });
    if (q.search) {
      qb.andWhere(
        '(pol."SubscriberName" ILIKE :s OR p."PolicyNumber" ILIKE :s OR p."Receipt" ILIKE :s)',
        { s: `%${q.search}%` },
      );
    }

    const total = await qb.getCount();
    const records = await qb
      .orderBy('p."PaymentDate"', 'ASC')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany();

    // cards for this filter (no pagination)
    const cardQb = this.premiumRepo
      .createQueryBuilder('p')
      .select('COUNT(DISTINCT p."PolicyNumber")', 'policies')
      .addSelect('SUM(p."Premium")', 'expectedPremium')
      .addSelect('SUM(p."PremiumPaid")', 'premiumPaid')
      .where('p."PaymentDate" IS NOT NULL')
      .andWhere(yearCondition('p', 'PaymentDate', years));

    if (q.product)
      cardQb.andWhere('p."ProductCode" = :product', { product: q.product });
    if (q.state) cardQb.andWhere('p."State" = :state', { state: q.state });

    const cardRow = await cardQb.getRawOne();

    return {
      total,
      records,
      cards: {
        policies: +cardRow.policies,
        expectedPremium: +cardRow.expectedPremium,
        premiumPaid: +cardRow.premiumPaid,
      },
    };
  }
}
