import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Claim } from '../entities/claim.entity';
import { Policy } from '../entities/policy.entity';
import {
  ClaimBaseQueryParams,
  ClaimPaymentQueryParams,
  ClaimInstallmentQueryParams,
} from '../share/dto/claim-query-params.dto';
import {
  resolveYears,
  yearCondition,
  getInstallmentNo,
  resolveMonths,
  resolveInstallments,
  monthCondition,
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

  async getPolicyYearsForInstallment(q: ClaimInstallmentQueryParams): Promise<number[]> {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];
    const installments = resolveInstallments(q);

    const qb = this.claimRepo
      .createQueryBuilder('c')
      .innerJoin(Policy, 'pol', 'pol.policy_number = c."PolicyNumber"')
      .select('DISTINCT EXTRACT(YEAR FROM pol.effective_date::date)::int', 'year')
      .where(yearCondition('c', 'ClaimDate', years))
      .andWhere('pol.effective_date IS NOT NULL')
      .andWhere('c."ClaimDate" IS NOT NULL')
      .orderBy('year', 'ASC');

    if (q.product) qb.andWhere('c."Product" = :product', { product: q.product });
    if (q.status) qb.andWhere('c."ClaimStatus" = :status', { status: q.status });
    if (q.claimType) qb.andWhere('c."ClaimType" = :claimType', { claimType: q.claimType });
    if (policies.length) qb.andWhere('c."PolicyNumber" IN (:...policies)', { policies });
    
    // Filter by installments if specified
    if (installments && installments.length > 0) {
      const monthDiffExpr = `(
        (EXTRACT(YEAR FROM c."ClaimDate"::date) - EXTRACT(YEAR FROM pol.effective_date::date)) * 12
        + (EXTRACT(MONTH FROM c."ClaimDate"::date) - EXTRACT(MONTH FROM pol.effective_date::date))
      )`;
      const installmentExpr = `CASE 
        WHEN ${monthDiffExpr} >= 0 THEN ${monthDiffExpr} + 1
        ELSE ${monthDiffExpr}
      END`;
      qb.andWhere(`${installmentExpr} IN (:...installments)`, { installments });
    }

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

  async getRecords(q: ClaimPaymentQueryParams | ClaimInstallmentQueryParams) {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];
    const months = 'months' in q ? resolveMonths(q) : null;
    const installments = 'installments' in q ? resolveInstallments(q) : null;
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

    let records = await qb.orderBy('c."ClaimDate"', 'ASC').getRawMany();

    // Filter by installments in-memory if needed
    if (installments && installments.length > 0) {
      records = records.filter((r) => {
        const no = getInstallmentNo(r.EffectiveDate, r.ClaimDate);
        return no !== null && installments.includes(no);
      });
    }

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

  async getByInstallment(q: ClaimInstallmentQueryParams) {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];

    const qb = this.claimRepo
      .createQueryBuilder('c')
      .innerJoin(Policy, 'pol', 'pol.policy_number = c."PolicyNumber"')
      .select([
        'c."PolicyNumber"',
        'c."ClaimDate"',
        'c."AmountPaid"',
        'pol.effective_date as "EffectiveDate"',
      ])
      .where(yearCondition('c', 'ClaimDate', years));

    if (q.product) qb.andWhere('c."Product" = :product', { product: q.product });
    if (q.status) qb.andWhere('c."ClaimStatus" = :status', { status: q.status });
    if (q.claimType) qb.andWhere('c."ClaimType" = :claimType', { claimType: q.claimType });
    if (policies.length) qb.andWhere('c."PolicyNumber" IN (:...policies)', { policies });

    const rows = await qb.getRawMany();
    const grouped = new Map<number, { totalAmount: number; count: number; days: number[] }>();

    rows.forEach((r) => {
      const no = getInstallmentNo(r.EffectiveDate, r.ClaimDate);
      if (no === null) return;
      const entry = grouped.get(no) ?? { totalAmount: 0, count: 0, days: [] };
      entry.totalAmount += +r.AmountPaid;
      entry.count += 1;
      entry.days.push(new Date(r.ClaimDate).getDate());
      grouped.set(no, entry);
    });

    return Array.from(grouped.entries())
      .map(([installmentNo, { totalAmount, count, days }]) => {
        const freq = new Map<number, number>();
        days.forEach((d) => freq.set(d, (freq.get(d) ?? 0) + 1));
        const paymentDay = days.length ? [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0] : null;
        return { installmentNo, totalAmount, count, paymentDay };
      })
      .sort((a, b) => a.installmentNo - b.installmentNo);
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
    };
  }

  async getList(q: ClaimPaymentQueryParams | ClaimInstallmentQueryParams) {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];
    const months = 'months' in q ? resolveMonths(q) : null;
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

  async getPoliciesByInstallment(q: ClaimInstallmentQueryParams) {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];
    const installments = resolveInstallments(q);
    const policyEffectiveYears = this.resolvePolicyEffectiveYears(q);
    const page = q.page ? +q.page : 1;
    const pageSize = q.pageSize ? +q.pageSize : 10;

    // Calculate installment number in SQL
    const monthDiffExpr = `(
      (EXTRACT(YEAR FROM c."ClaimDate"::date) - EXTRACT(YEAR FROM pol.effective_date::date)) * 12
      + (EXTRACT(MONTH FROM c."ClaimDate"::date) - EXTRACT(MONTH FROM pol.effective_date::date))
    )`;
    const installmentExpr = `CASE 
      WHEN ${monthDiffExpr} >= 0 THEN ${monthDiffExpr} + 1
      ELSE ${monthDiffExpr}
    END`;

    const qb = this.claimRepo
      .createQueryBuilder('c')
      .innerJoin(Policy, 'pol', 'pol.policy_number = c."PolicyNumber"')
      .select([
        'c."PolicyNumber" as "PolicyNumber"',
        'pol.subscriber_name as "SubscriberName"',
        'pol.subscriber_number as "SubscriberNumber"',
        'c."Product" as "Product"',
        'pol.effective_date as "EffectiveDate"',
        'pol.expiry_date as "ExpiryDate"',
        'COUNT(c."ClaimNumber") as "ClaimCount"',
        'SUM(c."AmountPaid") as "TotalAmountPaid"',
      ])
      .where(yearCondition('c', 'ClaimDate', years))
      .andWhere('c."ClaimDate" IS NOT NULL')
      .andWhere('pol.effective_date IS NOT NULL')
      .groupBy('c."PolicyNumber", pol.subscriber_name, pol.subscriber_number, c."Product", pol.effective_date, pol.expiry_date');

    if (q.product) qb.andWhere('c."Product" = :product', { product: q.product });
    if (q.status) qb.andWhere('c."ClaimStatus" = :status', { status: q.status });
    if (q.claimType) qb.andWhere('c."ClaimType" = :claimType', { claimType: q.claimType });
    if (policies.length) qb.andWhere('c."PolicyNumber" IN (:...policies)', { policies });
    if (policyEffectiveYears) qb.andWhere(yearCondition('pol', 'effective_date', policyEffectiveYears));
    if (q.search) {
      qb.andWhere(
        '(pol.subscriber_name ILIKE :s OR c."PolicyNumber" ILIKE :s)',
        { s: `%${q.search}%` },
      );
    }
    
    // Filter by installments in SQL
    if (installments && installments.length > 0) {
      qb.andWhere(`${installmentExpr} IN (:...installments)`, { installments });
    }

    const total = await qb.getCount();
    const totalPages = Math.ceil(total / pageSize);
    const records = await qb
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany();

    console.log(`[Claim-Policies-Installment API] Retrieved ${records.length} policies (page ${page}/${totalPages}, total: ${total})`);

    return { total, page, pageSize, totalPages, records };
  }

  async getClaimsByInstallment(q: ClaimInstallmentQueryParams) {
    const years = resolveYears(q);
    const policies = q.policies?.split(',').filter(Boolean) ?? [];
    const installments = resolveInstallments(q);
    const policyEffectiveYears = this.resolvePolicyEffectiveYears(q);
    const page = q.page ? +q.page : 1;
    const pageSize = q.pageSize ? +q.pageSize : 10;

    // Calculate installment number in SQL
    const monthDiffExpr = `(
      (EXTRACT(YEAR FROM c."ClaimDate"::date) - EXTRACT(YEAR FROM pol.effective_date::date)) * 12
      + (EXTRACT(MONTH FROM c."ClaimDate"::date) - EXTRACT(MONTH FROM pol.effective_date::date))
    )`;
    const installmentExpr = `CASE 
      WHEN ${monthDiffExpr} >= 0 THEN ${monthDiffExpr} + 1
      ELSE ${monthDiffExpr}
    END`;

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
        `${installmentExpr} as "InstallmentNo"`,
      ])
      .where(yearCondition('c', 'ClaimDate', years))
      .andWhere('c."ClaimDate" IS NOT NULL')
      .andWhere('pol.effective_date IS NOT NULL');

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
    
    // Filter by installments in SQL
    if (installments && installments.length > 0) {
      qb.andWhere(`${installmentExpr} IN (:...installments)`, { installments });
    }

    const total = await qb.getCount();
    const totalPages = Math.ceil(total / pageSize);
    const records = await qb
      .orderBy('c."ClaimDate"', 'ASC')
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany();

    console.log(`[Claim-Details-Installment API] Retrieved ${records.length} claims (page ${page}/${totalPages}, total: ${total})`);

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
