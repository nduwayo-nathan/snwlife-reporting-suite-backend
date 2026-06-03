import { IsOptional, IsIn, IsNumberString, IsString } from 'class-validator';

export class BaseQueryParams {
  @IsOptional()
  @IsIn(['single', 'range', 'multi'])
  filterMode?: 'single' | 'range' | 'multi';

  @IsOptional()
  @IsNumberString()
  year?: string;

  @IsOptional()
  @IsNumberString()
  startYear?: string;

  @IsOptional()
  @IsNumberString()
  endYear?: string;

  @IsOptional()
  @IsString()
  years?: string;
}
