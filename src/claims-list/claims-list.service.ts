import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Claim } from '../entities/claim.entity';
import { Policy } from '../entities/policy.entity';
import { ClaimPaymentQueryParams } from '../share/dto/claim-query-params.dto';
import { resolveYears, yearCondition, resolveMonths, monthCondition } from '../share/helpers/date-filter.helper';

@Injectable()
export class ClaimsListService {
  constructor(
    @InjectRepository(Claim) private claimRepo: Repository<Claim>,
  ) {}

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
}
