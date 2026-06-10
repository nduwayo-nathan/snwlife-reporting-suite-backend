import { IsOptional, IsIn, IsNumberString, IsString } from 'class-validator';
import { BaseQueryParams } from './base-query-params.dto';

export class PremiumQueryParams extends BaseQueryParams {
  @IsOptional()
  @IsIn(['payment', 'effective'])
  dateMode?: 'payment' | 'effective';

  @IsOptional()
  @IsString()
  product?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  policies?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  pageSize?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  months?: string; // comma-separated month numbers e.g. "1,3,5"

  @IsOptional()
  @IsString()
  installments?: string; // comma-separated installment numbers e.g. "1,2,3"
}

export class PremiumListQueryParams extends PremiumQueryParams {}
