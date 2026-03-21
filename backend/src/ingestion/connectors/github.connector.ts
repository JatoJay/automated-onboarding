import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QdrantService } from '../../ai/qdrant.service';
import { ChunkingService } from '../services/chunking.service';

interface GitHubFile {
  path: string;
  name: string;
  type: 'file' | 'dir';
  sha: string;
  size?: number;
  url: string;
  download_url?: string;
}

interface GitHubRepo {
  name: string;
  full_name: string;
  description?: string;
  default_branch: string;
  language?: string;
}

interface SyncOptions {
  branch?: string;
  maxFiles?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  departmentId?: string;
  isOrgWide?: boolean;
  [key: string]: any;
}

const CODE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.pyw',
  '.java', '.kt', '.kts',
  '.go',
  '.rs',
  '.rb',
  '.php',
  '.cs',
  '.cpp', '.c', '.h', '.hpp',
  '.swift',
  '.scala',
  '.vue', '.svelte',
  '.sql',
  '.sh', '.bash', '.zsh',
  '.yaml', '.yml',
  '.json',
  '.toml',
  '.xml',
  '.graphql', '.gql',
  '.proto',
  '.tf', '.hcl',
  '.dockerfile',
  '.md', '.mdx',
  '.txt',
  '.env.example',
  '.gitignore',
  '.eslintrc',
  '.prettierrc',
];

const SKIP_DIRECTORIES = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '__pycache__',
  '.pytest_cache',
  'venv',
  '.venv',
  'vendor',
  'target',
  'bin',
  'obj',
  '.idea',
  '.vscode',
  'coverage',
  '.nyc_output',
];

@Injectable()
export class GitHubConnector {
  private readonly logger = new Logger(GitHubConnector.name);
  private readonly apiBase = 'https://api.github.com';

  constructor(
    private prisma: PrismaService,
    private qdrantService: QdrantService,
    private chunkingService: ChunkingService,
  ) {}

  async syncRepository(
    organizationId: string,
    name: string,
    repoUrl: string,
    accessToken: string,
    category: string,
    options: SyncOptions = {},
  ) {
    const { owner, repo } = this.parseGitHubUrl(repoUrl);
    if (!owner || !repo) {
      throw new Error('Invalid GitHub repository URL. Expected format: https://github.com/owner/repo');
    }

    const repoInfo = await this.fetchRepoInfo(owner, repo, accessToken);
    const branch = options.branch || repoInfo.default_branch;

    const dataSource = await this.prisma.dataSource.create({
      data: {
        organizationId,
        name,
        type: 'GITHUB',
        departmentId: options.departmentId,
        isOrgWide: options.isOrgWide ?? false,
        config: {
          repoUrl,
          owner,
          repo,
          branch,
          category,
          options,
          repoInfo: {
            fullName: repoInfo.full_name,
            description: repoInfo.description,
            language: repoInfo.language,
          },
          status: 'syncing',
          startedAt: new Date().toISOString(),
        },
      },
    });

    this.syncInBackground(
      dataSource.id,
      organizationId,
      owner,
      repo,
      branch,
      accessToken,
      category,
      options,
    );

    return {
      dataSourceId: dataSource.id,
      status: 'syncing',
      repository: repoInfo.full_name,
      branch,
      message: `Started syncing ${repoInfo.full_name} (${branch} branch). This may take a few minutes.`,
    };
  }

  private parseGitHubUrl(url: string): { owner: string; repo: string } {
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/\.]+)/,
      /github\.com:([^\/]+)\/([^\/\.]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return { owner: match[1], repo: match[2].replace('.git', '') };
      }
    }

    return { owner: '', repo: '' };
  }

  private async fetchRepoInfo(owner: string, repo: string, token: string): Promise<GitHubRepo> {
    const response = await fetch(`${this.apiBase}/repos/${owner}/${repo}`, {
      headers: this.getHeaders(token),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid GitHub access token');
      }
      if (response.status === 404) {
        throw new Error('Repository not found. Check the URL and ensure token has access.');
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return response.json();
  }

  private getHeaders(token: string): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'OnboardingBot/1.0',
    };
  }

  private async syncInBackground(
    dataSourceId: string,
    organizationId: string,
    owner: string,
    repo: string,
    branch: string,
    token: string,
    category: string,
    options: SyncOptions,
  ) {
    try {
      const files = await this.fetchFileTree(owner, repo, branch, token, '', options);
      this.logger.log(`Found ${files.length} files in ${owner}/${repo}`);

      const maxFiles = options.maxFiles || 500;
      const filesToProcess = files.slice(0, maxFiles);

      let processedCount = 0;
      let errorCount = 0;

      for (const file of filesToProcess) {
        try {
          const content = await this.fetchFileContent(file.download_url!, token);
          if (content && content.length > 0) {
            await this.indexFile(
              dataSourceId,
              organizationId,
              owner,
              repo,
              branch,
              file,
              content,
              category,
              options,
            );
            processedCount++;
            this.logger.log(`Indexed (${processedCount}/${filesToProcess.length}): ${file.path}`);
          }
          await this.sleep(100);
        } catch (error) {
          errorCount++;
          this.logger.warn(`Failed to index ${file.path}: ${error.message}`);
        }
      }

      await this.prisma.dataSource.update({
        where: { id: dataSourceId },
        data: {
          lastSyncAt: new Date(),
          config: {
            repoUrl: `https://github.com/${owner}/${repo}`,
            owner,
            repo,
            branch,
            category,
            options,
            status: 'completed',
            filesIndexed: processedCount,
            errors: errorCount,
            totalFilesFound: files.length,
            completedAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log(`Completed syncing ${owner}/${repo}: ${processedCount} files indexed`);
    } catch (error) {
      this.logger.error(`Sync failed for ${owner}/${repo}: ${error.message}`);

      await this.prisma.dataSource.update({
        where: { id: dataSourceId },
        data: {
          config: {
            status: 'failed',
            error: error.message,
            failedAt: new Date().toISOString(),
          },
        },
      });
    }
  }

  private async fetchFileTree(
    owner: string,
    repo: string,
    branch: string,
    token: string,
    path: string,
    options: SyncOptions,
  ): Promise<GitHubFile[]> {
    const allFiles: GitHubFile[] = [];
    const queue: string[] = [path];

    while (queue.length > 0 && allFiles.length < (options.maxFiles || 500)) {
      const currentPath = queue.shift()!;

      try {
        const url = currentPath
          ? `${this.apiBase}/repos/${owner}/${repo}/contents/${currentPath}?ref=${branch}`
          : `${this.apiBase}/repos/${owner}/${repo}/contents?ref=${branch}`;

        const response = await fetch(url, {
          headers: this.getHeaders(token),
        });

        if (!response.ok) continue;

        const items: GitHubFile[] = await response.json();

        for (const item of items) {
          if (item.type === 'dir') {
            if (!SKIP_DIRECTORIES.includes(item.name)) {
              queue.push(item.path);
            }
          } else if (item.type === 'file') {
            if (this.shouldIncludeFile(item.path, options)) {
              allFiles.push(item);
            }
          }
        }

        await this.sleep(50);
      } catch (error) {
        this.logger.warn(`Failed to fetch tree at ${currentPath}: ${error.message}`);
      }
    }

    return allFiles;
  }

  private shouldIncludeFile(filePath: string, options: SyncOptions): boolean {
    const fileName = filePath.split('/').pop() || '';
    const extension = '.' + fileName.split('.').pop()?.toLowerCase();

    if (options.excludePatterns?.length) {
      for (const pattern of options.excludePatterns) {
        if (new RegExp(pattern).test(filePath)) return false;
      }
    }

    if (options.includePatterns?.length) {
      for (const pattern of options.includePatterns) {
        if (new RegExp(pattern).test(filePath)) return true;
      }
      return false;
    }

    if (fileName === 'Dockerfile' || fileName === 'Makefile') return true;
    if (fileName.startsWith('.') && !fileName.includes('rc') && !fileName.includes('ignore')) return false;
    if (!CODE_EXTENSIONS.some(ext => fileName.toLowerCase().endsWith(ext))) return false;

    return true;
  }

  private async fetchFileContent(downloadUrl: string, token: string): Promise<string | null> {
    try {
      const response = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'OnboardingBot/1.0',
        },
      });

      if (!response.ok) return null;

      const content = await response.text();
      if (content.length > 100000) {
        return content.substring(0, 100000) + '\n\n... [truncated]';
      }
      return content;
    } catch {
      return null;
    }
  }

  private async indexFile(
    dataSourceId: string,
    organizationId: string,
    owner: string,
    repo: string,
    branch: string,
    file: GitHubFile,
    content: string,
    category: string,
    options: SyncOptions,
  ) {
    const fileUrl = `https://github.com/${owner}/${repo}/blob/${branch}/${file.path}`;
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const language = this.getLanguageFromExtension(extension);

    const document = await this.prisma.knowledgeDocument.create({
      data: {
        organizationId,
        dataSourceId,
        departmentId: options.departmentId,
        isOrgWide: options.isOrgWide ?? false,
        title: file.path,
        content: content.substring(0, 50000),
        category,
        documentType: 'CODE' as const,
        status: 'PROCESSING',
        fileUrl,
        metadata: {
          repository: `${owner}/${repo}`,
          branch,
          filePath: file.path,
          fileName: file.name,
          language,
          sha: file.sha,
          size: file.size,
          syncedAt: new Date().toISOString(),
        },
      },
    });

    const chunks = this.chunkCodeFile(content, file.path, language);

    for (const chunk of chunks) {
      const savedChunk = await this.prisma.documentChunk.create({
        data: {
          documentId: document.id,
          content: chunk.content,
          chunkIndex: chunk.index,
          tokenCount: Math.ceil(chunk.content.length / 4),
          metadata: {
            filePath: file.path,
            repository: `${owner}/${repo}`,
            branch,
            language,
            category,
            organizationId,
            departmentId: options.departmentId,
            chunkType: chunk.type,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
          },
        },
      });

      const qdrantId = `${document.id}_${chunk.index}`;

      await this.qdrantService.upsertDocument({
        id: qdrantId,
        title: file.path,
        content: chunk.content,
        category,
        metadata: {
          documentId: document.id,
          chunkIndex: chunk.index,
          organizationId,
          departmentId: options.departmentId,
          isOrgWide: options.isOrgWide ?? false,
          dataSourceId,
          filePath: file.path,
          repository: `${owner}/${repo}`,
          branch,
          language,
          chunkType: chunk.type,
        },
      });

      await this.prisma.documentChunk.update({
        where: { id: savedChunk.id },
        data: { qdrantId },
      });
    }

    await this.prisma.knowledgeDocument.update({
      where: { id: document.id },
      data: {
        status: 'INDEXED',
        chunkCount: chunks.length,
      },
    });
  }

  private chunkCodeFile(
    content: string,
    filePath: string,
    language: string,
  ): Array<{ content: string; index: number; type: string; startLine: number; endLine: number }> {
    const chunks: Array<{ content: string; index: number; type: string; startLine: number; endLine: number }> = [];
    const lines = content.split('\n');

    const fileHeader = `File: ${filePath}\nLanguage: ${language}\n\n`;

    if (content.length < 2000) {
      chunks.push({
        content: fileHeader + content,
        index: 0,
        type: 'full_file',
        startLine: 1,
        endLine: lines.length,
      });
      return chunks;
    }

    const functionPatterns: Record<string, RegExp[]> = {
      typescript: [
        /^(export\s+)?(async\s+)?function\s+\w+/,
        /^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?\(/,
        /^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?function/,
        /^(export\s+)?class\s+\w+/,
        /^(export\s+)?interface\s+\w+/,
        /^(export\s+)?type\s+\w+/,
        /^\s+(async\s+)?(\w+)\s*\([^)]*\)\s*[:{]/,
      ],
      python: [
        /^(async\s+)?def\s+\w+/,
        /^class\s+\w+/,
        /^@\w+/,
      ],
      go: [
        /^func\s+(\(\w+\s+\*?\w+\)\s+)?\w+/,
        /^type\s+\w+\s+(struct|interface)/,
      ],
      java: [
        /^(public|private|protected)?\s*(static\s+)?(class|interface|enum)\s+\w+/,
        /^(public|private|protected)?\s*(static\s+)?[\w<>\[\]]+\s+\w+\s*\(/,
      ],
      rust: [
        /^(pub\s+)?(async\s+)?fn\s+\w+/,
        /^(pub\s+)?struct\s+\w+/,
        /^(pub\s+)?enum\s+\w+/,
        /^(pub\s+)?trait\s+\w+/,
        /^impl\s+/,
      ],
    };

    const patterns = functionPatterns[language] || functionPatterns.typescript;

    let currentChunk: string[] = [];
    let currentStartLine = 1;
    let chunkIndex = 0;
    let braceCount = 0;
    let inBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      const isBlockStart = patterns.some(p => p.test(line.trim()));

      if (isBlockStart && currentChunk.length > 0 && !inBlock) {
        const chunkContent = currentChunk.join('\n');
        if (chunkContent.trim().length > 50) {
          chunks.push({
            content: fileHeader + chunkContent,
            index: chunkIndex++,
            type: 'code_block',
            startLine: currentStartLine,
            endLine: lineNum - 1,
          });
        }
        currentChunk = [];
        currentStartLine = lineNum;
      }

      currentChunk.push(line);

      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      inBlock = braceCount > 0;

      if (currentChunk.join('\n').length > 3000 && !inBlock) {
        const chunkContent = currentChunk.join('\n');
        chunks.push({
          content: fileHeader + chunkContent,
          index: chunkIndex++,
          type: 'code_block',
          startLine: currentStartLine,
          endLine: lineNum,
        });
        currentChunk = [];
        currentStartLine = lineNum + 1;
      }
    }

    if (currentChunk.length > 0) {
      const chunkContent = currentChunk.join('\n');
      if (chunkContent.trim().length > 20) {
        chunks.push({
          content: fileHeader + chunkContent,
          index: chunkIndex,
          type: 'code_block',
          startLine: currentStartLine,
          endLine: lines.length,
        });
      }
    }

    return chunks;
  }

  private getLanguageFromExtension(ext: string): string {
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      mjs: 'javascript',
      cjs: 'javascript',
      py: 'python',
      pyw: 'python',
      java: 'java',
      kt: 'kotlin',
      kts: 'kotlin',
      go: 'go',
      rs: 'rust',
      rb: 'ruby',
      php: 'php',
      cs: 'csharp',
      cpp: 'cpp',
      c: 'c',
      h: 'c',
      hpp: 'cpp',
      swift: 'swift',
      scala: 'scala',
      vue: 'vue',
      svelte: 'svelte',
      sql: 'sql',
      sh: 'bash',
      bash: 'bash',
      zsh: 'bash',
      yaml: 'yaml',
      yml: 'yaml',
      json: 'json',
      toml: 'toml',
      xml: 'xml',
      graphql: 'graphql',
      gql: 'graphql',
      proto: 'protobuf',
      tf: 'terraform',
      hcl: 'hcl',
      md: 'markdown',
      mdx: 'markdown',
    };

    return languageMap[ext] || 'text';
  }

  async getSyncStatus(dataSourceId: string) {
    const dataSource = await this.prisma.dataSource.findUnique({
      where: { id: dataSourceId },
      include: {
        _count: {
          select: { knowledgeDocuments: true },
        },
      },
    });

    if (!dataSource) return null;

    const config = dataSource.config as any;

    return {
      id: dataSource.id,
      name: dataSource.name,
      repository: `${config?.owner}/${config?.repo}`,
      branch: config?.branch,
      status: config?.status || 'unknown',
      filesIndexed: dataSource._count.knowledgeDocuments,
      totalFilesFound: config?.totalFilesFound,
      errors: config?.errors || 0,
      lastSyncAt: dataSource.lastSyncAt,
      error: config?.error,
    };
  }

  async resync(dataSourceId: string, accessToken: string) {
    const dataSource = await this.prisma.dataSource.findUnique({
      where: { id: dataSourceId },
    });

    if (!dataSource) throw new Error('DataSource not found');
    if (dataSource.type !== 'GITHUB') throw new Error('Not a GitHub data source');

    const config = dataSource.config as any;

    await this.prisma.knowledgeDocument.deleteMany({
      where: { dataSourceId },
    });

    return this.syncRepository(
      dataSource.organizationId,
      dataSource.name,
      config.repoUrl,
      accessToken,
      config.category,
      config.options,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
