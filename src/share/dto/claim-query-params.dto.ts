import { IsOptional, IsIn, IsNumberString, IsString } from 'class-validator';
import { BaseQueryParams } from './base-query-params.dto';

export class ClaimBaseQueryParams extends BaseQueryParams {
  @IsOptional()
  @IsString()
  product?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  claimType?: string;

  @IsOptional()
  @IsString()
  policies?: string;

  @IsOptional()
  @IsIn(['single', 'range', 'multi'])
  policyEffectiveFilterMode?: 'single' | 'range' | 'multi';

  @IsOptional()
  @IsNumberString()
  policyYear?: string;

  @IsOptional()
  @IsNumberString()
  policyStartYear?: string;

  @IsOptional()
  @IsNumberString()
  policyEndYear?: string;

  @IsOptional()
  @IsString()
  policyYears?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  pageSize?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class ClaimPaymentQueryParams extends ClaimBaseQueryParams {
  @IsOptional()
  @IsString()
  months?: string;
}

export class ClaimInstallmentQueryParams extends ClaimBaseQueryParams {
  @IsOptional()
  @IsString()
  installments?: string;
}
