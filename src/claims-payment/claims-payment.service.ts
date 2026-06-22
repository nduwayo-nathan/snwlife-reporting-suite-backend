import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Claim } from '../entities/claim.entity';
import { Policy } from '../entities/policy.entity';
import { Premium } from '../entities/premium.entity';
import { ClaimBaseQueryParams, ClaimPaymentQueryParams } from '../share/dto/claim-query-params.dto';
import { resolveYears, yearCondition, resolveMonths, monthCondition, getInstallmentNo } from '../share/helpers/date-filter.helper';
import { BaseQueryParams } from '../share/dto/base-query-params.dto';

@Injectable()
export class ClaimsPaymentService {
  constructor(
    @InjectRepository(Claim) private claimRepo: Repository<Claim>,
    @InjectRepository(Policy) private policyRepo: Repository<Policy>,
    @InjectRepository(Premium) private premiumRepo: Repository<Premium>,
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

  async getPolicyYears(q: ClaimPaymentQueryParams): Promise<number[]> {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];

    const qb = this.claimRepo
      .createQueryBuilder('c')
      .innerJoin(Policy, 'pol', 'pol.policy_number = c."PolicyNumber"')
      .select('DISTINCT EXTRACT(YEAR FROM pol.effective_date::date)::int', 'year')
      .where(yearCondition('c', 'ClaimDate', years))
      .andWhere('pol.effective_date IS NOT NULL')
      .orderBy('year', 'ASC');

    if (q.product) qb.andWhere('c."Product" = :product', { product: q.product });
    if (q.status) qb.andWhere('c."ClaimStatus" = :status', { status: q.status });
    if (q.claimType) qb.andWhere('c."ClaimType" = :claimType', { claimType: q.claimType });
    if (policies.length) qb.andWhere('c."PolicyNumber" IN (:...policies)', { policies });

    const rows = await qb.getRawMany();
    return rows.map((r) => r.year).filter((y) => y != null);
  }

  async getMonthlySummary(q: ClaimPaymentQueryParams) {
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

    if (q.product) qb.andWhere('c."Product" = :product', { product: q.product });
    if (q.status) qb.andWhere('c."ClaimStatus" = :status', { status: q.status });
    if (q.claimType) qb.andWhere('c."ClaimType" = :claimType', { claimType: q.claimType });
    if (policies.length) qb.andWhere('c."PolicyNumber" IN (:...policies)', { policies });

    const rows = await qb.getRawMany();
    return rows.map((r) => ({ month: r.month, value: +r.value, count: +r.count }));
  }

  async getRecords(q: ClaimPaymentQueryParams) {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];
    const months = resolveMonths(q);
    const policyEffectiveYears = this.resolvePolicyEffectiveYears(q);
    const page = q.page ? +q.page : 1;
    const pageSize = q.pageSize ? +q.pageSize : 10;

    const qb = this.claimRepo
      .createQueryBuilder('c')
      .innerJoin(Policy, 'pol', 'pol.policy_number = c."PolicyNumber"')
      .select([
        'c."ClaimNumber" as "ClaimNumber"',
        'c."PolicyNumber" as "PolicyNumber"',
        'pol.subscriber_name as "SubscriberName"',
        'pol.subscriber_number as "SubscriberNumber"',
        'c."Product" as "Product"',
        'c."ClaimDate" as "ClaimDate"',
        'c."ClaimType" as "ClaimType"',
        'c."ClaimStatus" as "ClaimStatus"',
        'c."ReserveAmount" as "ReserveAmount"',
        'c."TotalAmountToPay" as "TotalAmountToPay"',
        'c."AmountPaid" as "AmountPaid"',
        'c."PaymentDate" as "PaymentDate"',
        'pol.effective_date as "EffectiveDate"',
      ])
      .where(yearCondition('c', 'ClaimDate', years))
      .andWhere(monthCondition('c', 'ClaimDate', months));

    if (q.product) qb.andWhere('c."Product" = :product', { product: q.product });
    if (q.status) qb.andWhere('c."ClaimStatus" = :status', { status: q.status });
    if (q.claimType) qb.andWhere('c."ClaimType" = :claimType', { claimType: q.claimType });
    if (policies.length) qb.andWhere('c."PolicyNumber" IN (:...policies)', { policies });
    if (policyEffectiveYears) qb.andWhere(yearCondition('pol', 'effective_date', policyEffectiveYears));
    if (q.search) {
      qb.andWhere(
        '(pol.subscriber_name ILIKE :s OR c."PolicyNumber" ILIKE :s OR c."ClaimNumber" ILIKE :s)',
        { s: `%${q.search}%` },
      );
    }

    const records = await qb.orderBy('c."ClaimDate"', 'ASC').getRawMany();
    const total = records.length;
    const totalPages = Math.ceil(total / pageSize);
    const paginatedRecords = records.slice((page - 1) * pageSize, page * pageSize);

    console.log(`[Claim-Details API] Retrieved ${paginatedRecords.length} records (page ${page}/${totalPages}, total: ${total})`);

    return { total, page, pageSize, totalPages, records: paginatedRecords };
  }

  async getByProduct(q: ClaimBaseQueryParams) {
    const years = resolveYears(q);
    const qb = this.claimRepo
      .createQueryBuilder('c')
      .select('c."Product"', 'product')
      .addSelect('SUM(c."AmountPaid")', 'total')
      .where(yearCondition('c', 'ClaimDate', years))
      .groupBy('c."Product"');

    if (q.status) qb.andWhere('c."ClaimStatus" = :status', { status: q.status });
    if (q.claimType) qb.andWhere('c."ClaimType" = :claimType', { claimType: q.claimType });

    const rows = await qb.getRawMany();
    return rows.map((r) => ({ product: r.product, total: +r.total }));
  }

  async getByStatus(q: ClaimBaseQueryParams) {
    const years = resolveYears(q);
    const qb = this.claimRepo
      .createQueryBuilder('c')
      .select('c."ClaimStatus"', 'status')
      .addSelect('SUM(c."AmountPaid")', 'total')
      .where(yearCondition('c', 'ClaimDate', years))
      .groupBy('c."ClaimStatus"');

    if (q.product) qb.andWhere('c."Product" = :product', { product: q.product });
    if (q.claimType) qb.andWhere('c."ClaimType" = :claimType', { claimType: q.claimType });

    const rows = await qb.getRawMany();
    return rows.map((r) => ({ status: r.status, total: +r.total }));
  }

  async getByType(q: ClaimPaymentQueryParams) {
    const years = resolveYears(q);
    const qb = this.claimRepo
      .createQueryBuilder('c')
      .select('c."ClaimType"', 'type')
      .addSelect('SUM(c."AmountPaid")', 'total')
      .where(yearCondition('c', 'ClaimDate', years))
      .groupBy('c."ClaimType"');

    if (q.product) qb.andWhere('c."Product" = :product', { product: q.product });
    if (q.status) qb.andWhere('c."ClaimStatus" = :status', { status: q.status });

    const rows = await qb.getRawMany();
    return rows.map((r) => ({ type: r.type, total: +r.total }));
  }

  async getCards(q: ClaimBaseQueryParams) {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];
    const policyEffectiveYears = this.resolvePolicyEffectiveYears(q);

    const qb = this.claimRepo
      .createQueryBuilder('c')
      .innerJoin(Policy, 'pol', 'pol.policy_number = c."PolicyNumber"')
      .select('COUNT(DISTINCT pol.subscriber_number)', 'claimants')
      .addSelect('COUNT(c."ClaimNumber")', 'claims')
      .addSelect('SUM(c."AmountPaid")', 'amountPaid')
      .addSelect('SUM(c."ReserveAmount")', 'reserveAmount')
      .addSelect('MAX(c."ClaimDate")', 'latestClaimDate')
      .where(yearCondition('c', 'ClaimDate', years));

    if (q.product) qb.andWhere('c."Product" = :product', { product: q.product });
    if (q.status) qb.andWhere('c."ClaimStatus" = :status', { status: q.status });
    if (q.claimType) qb.andWhere('c."ClaimType" = :claimType', { claimType: q.claimType });
    if (policies.length) qb.andWhere('c."PolicyNumber" IN (:...policies)', { policies });
    if (policyEffectiveYears) qb.andWhere(yearCondition('pol', 'effective_date', policyEffectiveYears));

    const row = await qb.getRawOne();
    return {
      claimants: +row.claimants,
      claims: +row.claims,
      amountPaid: +row.amountPaid,
      reserveAmount: +row.reserveAmount || 0,
      latestClaimDate: row.latestClaimDate || null,
    };
  }

  async getList(q: ClaimPaymentQueryParams) {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];
    const months = resolveMonths(q);
    const page = q.page ? +q.page : 1;
    const pageSize = q.pageSize ? +q.pageSize : 100;

    const qb = this.claimRepo
      .createQueryBuilder('c')
      .innerJoin(Policy, 'pol', 'pol.policy_number = c."PolicyNumber"')
      .select([
        'c."ClaimNumber" as "ClaimNumber"',
        'c."PolicyNumber" as "PolicyNumber"',
        'pol.subscriber_name as "SubscriberName"',
        'c."Product" as "Product"',
        'c."ClaimDate" as "ClaimDate"',
        'c."ClaimType" as "ClaimType"',
        'c."ClaimStatus" as "ClaimStatus"',
        'c."ReserveAmount" as "ReserveAmount"',
        'c."TotalAmountToPay" as "TotalAmountToPay"',
        'c."AmountPaid" as "AmountPaid"',
        'c."PaymentDate" as "PaymentDate"',
        'c."Approver" as "Approver"',
      ])
      .where(yearCondition('c', 'ClaimDate', years))
      .andWhere(monthCondition('c', 'ClaimDate', months));

    if (q.product) qb.andWhere('c."Product" = :product', { product: q.product });
    if (q.status) qb.andWhere('c."ClaimStatus" = :status', { status: q.status });
    if (policies.length) qb.andWhere('c."PolicyNumber" IN (:...policies)', { policies });
    if (q.search) {
      qb.andWhere(
        '(pol.subscriber_name ILIKE :s OR c."PolicyNumber" ILIKE :s OR c."ClaimNumber" ILIKE :s)',
        { s: `%${q.search}%` },
      );
    }

    const total = await qb.getCount();
    const totalPages = Math.ceil(total / pageSize);
    const records = await qb
      .orderBy('c."ClaimDate"', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany();

    console.log(`[Claims-List API] Retrieved ${records.length} records (page ${page}/${totalPages}, total: ${total})`);

    return { total, page, pageSize, totalPages, records };
  }

  async getRelatedPremiums(q: ClaimPaymentQueryParams) {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];
    const months = resolveMonths(q);
    const policyEffectiveYears = this.resolvePolicyEffectiveYears(q);
    const page = q.page ? +q.page : 1;
    const pageSize = q.pageSize ? +q.pageSize : 100;

    const claimQb = this.claimRepo
      .createQueryBuilder('c')
      .innerJoin(Policy, 'pol', 'pol.policy_number = c."PolicyNumber"')
      .select('DISTINCT c."PolicyNumber" as "PolicyNumber"')
      .where(yearCondition('c', 'ClaimDate', years))
      .andWhere(monthCondition('c', 'ClaimDate', months));

    if (q.product) claimQb.andWhere('c."Product" = :product', { product: q.product });
    if (q.status) claimQb.andWhere('c."ClaimStatus" = :status', { status: q.status });
    if (q.claimType) claimQb.andWhere('c."ClaimType" = :claimType', { claimType: q.claimType });
    if (policies.length) claimQb.andWhere('c."PolicyNumber" IN (:...policies)', { policies });
    if (policyEffectiveYears) claimQb.andWhere(yearCondition('pol', 'effective_date', policyEffectiveYears));

    const claimPolicies = await claimQb.getRawMany();
    const policyNumbers = claimPolicies.map(p => p.PolicyNumber).filter(Boolean);

    if (!policyNumbers.length) {
      return { total: 0, page, pageSize, totalPages: 0, records: [] };
    }

    const qb = this.premiumRepo
      .createQueryBuilder('p')
      .innerJoin(Policy, 'pol', 'pol.policy_number = p."PolicyNumber"')
      .select([
        'p."PolicyNumber" as "PolicyNumber"',
        'pol.subscriber_name as "SubscriberName"',
        'p."Product" as "ProductCode"',
        'pol.product_name as "ProductName"',
        'p."State" as "State"',
        'p."PaymentDate" as "PaymentDate"',
        'p."Premium" as "Premium"',
        'p."PremiumPaid" as "PremiumPaid"',
        'p."Receipt" as "Receipt"',
      ])
      .where('p."PolicyNumber" IN (:...policyNumbers)', { policyNumbers })
      .andWhere('p."PaymentDate" IS NOT NULL');

    const total = await qb.getCount();
    const totalPages = Math.ceil(total / pageSize);
    const records = await qb
      .orderBy('p."PaymentDate"', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany();

    console.log(`[Related-Premiums Payment API] Retrieved ${records.length} premium records (page ${page}/${totalPages}, total: ${total}) for ${policyNumbers.length} claim policies`);
    return { total, page, pageSize, totalPages, records };
  }

  private resolvePolicyEffectiveYears(q: ClaimBaseQueryParams): number[] | null {
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
