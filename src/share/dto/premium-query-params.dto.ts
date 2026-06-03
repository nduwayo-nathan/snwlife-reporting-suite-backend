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
}

export class PremiumListQueryParams extends PremiumQueryParams {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  pageSize?: string;
}
