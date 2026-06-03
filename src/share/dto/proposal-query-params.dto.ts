import { IsOptional, IsString } from 'class-validator';
import { BaseQueryParams } from './base-query-params.dto';

export class ProposalQueryParams extends BaseQueryParams {
  @IsOptional()
  @IsString()
  product?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
