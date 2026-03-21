import { IsString, IsOptional, IsUrl, IsInt, IsArray, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CrawlDocsDto {
  @ApiProperty({ example: 'CodeRabbit' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'https://docs.coderabbit.ai' })
  @IsUrl()
  docsUrl: string;

  @ApiProperty({ example: 'developer-tools' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ example: 100, description: 'Maximum pages to crawl' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxPages?: number;

  @ApiPropertyOptional({ example: 3, description: 'Maximum link depth to follow' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  maxDepth?: number;

  @ApiPropertyOptional({ example: 500, description: 'Delay between requests in ms' })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(5000)
  delay?: number;

  @ApiPropertyOptional({ example: ['/docs/', '/guide/'], description: 'URL patterns to include' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includePatterns?: string[];

  @ApiPropertyOptional({ example: ['/blog/', '/changelog/'], description: 'URL patterns to exclude' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePatterns?: string[];
}

export class CrawlSitemapDto {
  @ApiProperty({ example: 'AWS Documentation' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'https://docs.aws.amazon.com/sitemap.xml' })
  @IsUrl()
  sitemapUrl: string;

  @ApiProperty({ example: 'cloud-services' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxPages?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(5000)
  delay?: number;
}
