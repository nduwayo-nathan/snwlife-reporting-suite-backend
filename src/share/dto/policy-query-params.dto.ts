import { IsOptional, IsIn, IsString } from 'class-validator';
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
  installment?: string;

  @IsOptional()
  @IsString()
  policies?: string;
}
