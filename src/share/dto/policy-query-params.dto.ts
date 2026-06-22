import { IsOptional, IsIn, IsString, IsNumberString } from 'class-validator';
import { BaseQueryParams } from './base-query-params.dto';

export class PolicyQueryParams extends BaseQueryParams {
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
  gender?: string;

  @IsOptional()
  @IsString()
  months?: string;

  @IsOptional()
  @IsString()
  installments?: string;

  @IsOptional()
  @IsString()
  policies?: string;

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
