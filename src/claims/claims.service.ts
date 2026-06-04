import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Claim } from '../entities/claim.entity';
import { Policy } from '../entities/policy.entity';
import {
  ClaimQueryParams,
  ClaimListQueryParams,
} from '../share/dto/claim-query-params.dto';
import {
  resolveYears,
  yearCondition,
  getInstallmentNo,
} from '../share/helpers/date-filter.helper';
import { BaseQueryParams } from '../share/dto/base-query-params.dto';

@Injectable()
export class ClaimsService {
  constructor(
    @InjectRepository(Claim) private claimRepo: Repository<Claim>,
    @InjectRepository(Policy) private policyRepo: Repository<Policy>,
  ) {}

  async getYears(): Promise<number[]> {
    const rows = await this.claimRepo
      .createQueryBuilder('c')
      .select('DISTINCT EXTRACT(YEAR FROM c."ClaimDate"::date)::int', 'year')
      .where('c."ClaimDate" IS NOT NULL')
      .orderBy('year', 'ASC')
      .getRawMany();
    return rows.map((r) => r.year);
  }

  async getMonthlySummary(q: ClaimQueryParams) {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];

    const qb = this.claimRepo
      .createQueryBuilder('c')
      .select('EXTRACT(MONTH FROM c."ClaimDate"::date)::int', 'month')
      .addSelect('SUM(c."AmountPaid")', 'value')
      .addSelect('COUNT(DISTINCT c."PolicyNumber")', 'count')
      .where(yearCondition('c', 'ClaimDate', years))
      .groupBy('month')
      .orderBy('month', 'ASC');

    if (q.product)
      qb.andWhere('c."Product" = :product', { product: q.product });
    if (q.status)
      qb.andWhere('c."ClaimStatus" = :status', { status: q.status });
    if (q.claimType)
      qb.andWhere('c."ClaimType" = :claimType', { claimType: q.claimType });
    if (policies.length)
      qb.andWhere('c."PolicyNumber" IN (:...policies)', { policies });

    const rows = await qb.getRawMany();
    return rows.map((r) => ({
      month: r.month,
      value: +r.value,
      count: +r.count,
    }));
  }

  async getRecords(q: ClaimQueryParams) {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];
    const policyEffectiveYears = this.resolvePolicyEffectiveYears(q);
    const page = q.page ? +q.page : 1;
    const pageSize = q.pageSize ? +q.pageSize : 20;

    const qb = this.claimRepo
      .createQueryBuilder('c')
      .innerJoin(Policy, 'pol', 'pol."PolicyNumber" = c."PolicyNumber"')
      .select([
        'c."ClaimNumber" as "ClaimNumber"',
        'c."PolicyNumber" as "PolicyNumber"',
        'pol."SubscriberName" as "SubscriberName"',
        'c."Product" as "Product"',
        'c."ClaimDate" as "ClaimDate"',
        'c."ClaimType" as "ClaimType"',
        'c."ClaimStatus" as "ClaimStatus"',
        'c."ReserveAmount" as "ReserveAmount"',
        'c."TotalAmountToPay" as "TotalAmountToPay"',
        'c."AmountPaid" as "AmountPaid"',
        'c."PaymentDate" as "PaymentDate"',
      ])
      .where(yearCondition('c', 'ClaimDate', years));

    if (q.product) qb.andWhere('c."Product" = :product', { product: q.product });
    if (q.status) qb.andWhere('c."ClaimStatus" = :status', { status: q.status });
    if (q.claimType) qb.andWhere('c."ClaimType" = :claimType', { claimType: q.claimType });
    if (policies.length) qb.andWhere('c."PolicyNumber" IN (:...policies)', { policies });
    if (policyEffectiveYears) qb.andWhere(yearCondition('pol', 'EffectiveDate', policyEffectiveYears));
    if (q.search) {
      qb.andWhere(
        '(pol."SubscriberName" ILIKE :s OR c."PolicyNumber" ILIKE :s OR c."ClaimNumber" ILIKE :s)',
        { s: `%${q.search}%` },
      );
    }

    const total = await qb.getCount();
    const totalPages = Math.ceil(total / pageSize);
    const records = await qb
      .orderBy('c."ClaimDate"', 'ASC')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany();

    return { total, page, pageSize, totalPages, records };
  }

  async getByProduct(q: ClaimQueryParams) {
    const years = resolveYears(q);
    const qb = this.claimRepo
      .createQueryBuilder('c')
      .select('c."Product"', 'product')
      .addSelect('SUM(c."AmountPaid")', 'total')
      .where(yearCondition('c', 'ClaimDate', years))
      .groupBy('c."Product"');

    if (q.status)
      qb.andWhere('c."ClaimStatus" = :status', { status: q.status });
    if (q.claimType)
      qb.andWhere('c."ClaimType" = :claimType', { claimType: q.claimType });

    const rows = await qb.getRawMany();
    return rows.map((r) => ({ product: r.product, total: +r.total }));
  }

  async getByStatus(q: ClaimQueryParams) {
    const years = resolveYears(q);
    const qb = this.claimRepo
      .createQueryBuilder('c')
      .select('c."ClaimStatus"', 'status')
      .addSelect('SUM(c."AmountPaid")', 'total')
      .where(yearCondition('c', 'ClaimDate', years))
      .groupBy('c."ClaimStatus"');

    if (q.product)
      qb.andWhere('c."Product" = :product', { product: q.product });
    if (q.claimType)
      qb.andWhere('c."ClaimType" = :claimType', { claimType: q.claimType });

    const rows = await qb.getRawMany();
    return rows.map((r) => ({ status: r.status, total: +r.total }));
  }

  async getByType(q: ClaimQueryParams) {
    const years = resolveYears(q);
    const qb = this.claimRepo
      .createQueryBuilder('c')
      .select('c."ClaimType"', 'type')
      .addSelect('SUM(c."AmountPaid")', 'total')
      .where(yearCondition('c', 'ClaimDate', years))
      .groupBy('c."ClaimType"');

    if (q.product)
      qb.andWhere('c."Product" = :product', { product: q.product });
    if (q.status)
      qb.andWhere('c."ClaimStatus" = :status', { status: q.status });

    const rows = await qb.getRawMany();
    return rows.map((r) => ({ type: r.type, total: +r.total }));
  }

  async getByInstallment(q: ClaimQueryParams) {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];

    const qb = this.claimRepo
      .createQueryBuilder('c')
      .innerJoin(Policy, 'pol', 'pol."PolicyNumber" = c."PolicyNumber"')
      .select([
        'c."PolicyNumber"',
        'c."ClaimDate"',
        'c."AmountPaid"',
        'pol."EffectiveDate"',
      ])
      .where(yearCondition('c', 'ClaimDate', years));

    if (q.product)
      qb.andWhere('c."Product" = :product', { product: q.product });
    if (q.status)
      qb.andWhere('c."ClaimStatus" = :status', { status: q.status });
    if (q.claimType)
      qb.andWhere('c."ClaimType" = :claimType', { claimType: q.claimType });
    if (policies.length)
      qb.andWhere('c."PolicyNumber" IN (:...policies)', { policies });

    const rows = await qb.getRawMany();
    const grouped = new Map<number, { totalAmount: number; count: number }>();

    rows.forEach((r) => {
      const no = getInstallmentNo(r.EffectiveDate, r.ClaimDate);
      if (no === null) return;
      const entry = grouped.get(no) ?? { totalAmount: 0, count: 0 };
      entry.totalAmount += +r.AmountPaid;
      entry.count += 1;
      grouped.set(no, entry);
    });

    return Array.from(grouped.entries())
      .map(([installmentNo, { totalAmount, count }]) => ({
        installmentNo,
        totalAmount,
        count,
      }))
      .sort((a, b) => a.installmentNo - b.installmentNo);
  }

  async getCards(q: ClaimQueryParams) {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];
    const policyEffectiveYears = this.resolvePolicyEffectiveYears(q);

    const qb = this.claimRepo
      .createQueryBuilder('c')
      .innerJoin(Policy, 'pol', 'pol."PolicyNumber" = c."PolicyNumber"')
      .select('COUNT(DISTINCT pol."SubscriberNumber")', 'claimants')
      .addSelect('COUNT(c."ClaimNumber")', 'claims')
      .addSelect('SUM(c."AmountPaid")', 'amountPaid')
      .where(yearCondition('c', 'ClaimDate', years));

    if (q.product)
      qb.andWhere('c."Product" = :product', { product: q.product });
    if (q.status)
      qb.andWhere('c."ClaimStatus" = :status', { status: q.status });
    if (q.claimType)
      qb.andWhere('c."ClaimType" = :claimType', { claimType: q.claimType });
    if (policies.length)
      qb.andWhere('c."PolicyNumber" IN (:...policies)', { policies });
    if (policyEffectiveYears) {
      qb.andWhere(yearCondition('pol', 'EffectiveDate', policyEffectiveYears));
    }

    const row = await qb.getRawOne();
    return {
      claimants: +row.claimants,
      claims: +row.claims,
      amountPaid: +row.amountPaid,
    };
  }

  async getList(q: ClaimListQueryParams) {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];
    const page = q.page ? +q.page : 1;
    const pageSize = q.pageSize ? +q.pageSize : 15;

    const qb = this.claimRepo
      .createQueryBuilder('c')
      .innerJoin(Policy, 'pol', 'pol."PolicyNumber" = c."PolicyNumber"')
      .select([
        'c."ClaimNumber" as "ClaimNumber"',
        'c."PolicyNumber" as "PolicyNumber"',
        'pol."SubscriberName" as "SubscriberName"',
        'c."Product" as "Product"',
        'c."ClaimDate" as "ClaimDate"',
        'c."ClaimType" as "ClaimType"',
        'c."ClaimStatus" as "ClaimStatus"',
        'c."ReserveAmount" as "ReserveAmount"',
        'c."TotalAmountToPay" as "TotalAmountToPay"',
        'c."AmountPaid" as "AmountPaid"',
        'c."PaymentDate" as "PaymentDate"',
      ])
      .where(yearCondition('c', 'ClaimDate', years));

    if (q.product)
      qb.andWhere('c."Product" = :product', { product: q.product });
    if (q.status)
      qb.andWhere('c."ClaimStatus" = :status', { status: q.status });
    if (policies.length)
      qb.andWhere('c."PolicyNumber" IN (:...policies)', { policies });
    if (q.search) {
      qb.andWhere(
        '(pol."SubscriberName" ILIKE :s OR c."PolicyNumber" ILIKE :s OR c."ClaimNumber" ILIKE :s)',
        { s: `%${q.search}%` },
      );
    }

    const total = await qb.getCount();
    const records = await qb
      .orderBy('c."ClaimDate"', 'ASC')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany();

    return { total, records };
  }

  private resolvePolicyEffectiveYears(q: ClaimQueryParams): number[] | null {
    const fake: BaseQueryParams = {
      filterMode: q.policyEffectiveFilterMode,
      year: q.policyYear,
      startYear: q.policyStartYear,
      endYear: q.policyEndYear,
      years: q.policyYears,
    };
    return resolveYears(fake);
  }
}
