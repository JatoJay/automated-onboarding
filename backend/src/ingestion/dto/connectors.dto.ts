import { IsString, IsOptional, IsUrl, IsInt, IsArray, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlaywrightCrawlDto {
  @ApiProperty({ example: 'CodeRabbit Docs' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'https://docs.coderabbit.ai' })
  @IsUrl()
  docsUrl: string;

  @ApiProperty({ example: 'developer-tools' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  maxPages?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  maxDepth?: number;

  @ApiPropertyOptional({ example: 2000, description: 'Delay between requests in ms' })
  @IsOptional()
  @IsInt()
  @Min(500)
  @Max(10000)
  delay?: number;

  @ApiPropertyOptional({ example: '.documentation', description: 'CSS selector to wait for' })
  @IsOptional()
  @IsString()
  waitForSelector?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  scrollToBottom?: boolean;

  @ApiPropertyOptional({ example: ['/docs/', '/guide/'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includePatterns?: string[];

  @ApiPropertyOptional({ example: ['/blog/', '/changelog/'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePatterns?: string[];
}

export class NotionSyncDto {
  @ApiProperty({ example: 'Company Wiki' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'secret_xxx', description: 'Notion Integration API Key' })
  @IsString()
  apiKey: string;

  @ApiProperty({ example: 'internal-docs' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ example: ['page-id-1', 'page-id-2'], description: 'Specific page IDs to sync' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pageIds?: string[];

  @ApiPropertyOptional({ example: ['db-id-1'], description: 'Database IDs to sync all pages from' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  databaseIds?: string[];
}

export class ConfluenceSyncDto {
  @ApiProperty({ example: 'Engineering Wiki' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'https://yourcompany.atlassian.net' })
  @IsUrl()
  baseUrl: string;

  @ApiProperty({ example: 'user@company.com' })
  @IsString()
  email: string;

  @ApiProperty({ example: 'ATATT3xFfGF0...', description: 'Atlassian API Token' })
  @IsString()
  apiToken: string;

  @ApiProperty({ example: 'ENG', description: 'Confluence Space Key' })
  @IsString()
  spaceKey: string;

  @ApiProperty({ example: 'engineering' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxPages?: number;

  @ApiPropertyOptional({ description: 'Only sync children of this page' })
  @IsOptional()
  @IsString()
  parentPageId?: string;
}

export class GitHubSyncDto {
  @ApiProperty({ example: 'Backend Codebase' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'https://github.com/company/backend-api' })
  @IsUrl()
  repoUrl: string;

  @ApiProperty({ example: 'ghp_xxxxxxxxxxxx', description: 'GitHub Personal Access Token' })
  @IsString()
  accessToken: string;

  @ApiProperty({ example: 'codebase' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ example: 'main', description: 'Branch to sync (defaults to default branch)' })
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiPropertyOptional({ example: 500, description: 'Maximum files to index' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2000)
  maxFiles?: number;

  @ApiPropertyOptional({ example: ['src/', 'lib/'], description: 'Regex patterns for files to include' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includePatterns?: string[];

  @ApiPropertyOptional({ example: ['test/', '__tests__/'], description: 'Regex patterns for files to exclude' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePatterns?: string[];

  @ApiPropertyOptional({ description: 'Department ID for scoped access' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ example: false, description: 'Make accessible to all departments' })
  @IsOptional()
  @IsBoolean()
  isOrgWide?: boolean;
}
