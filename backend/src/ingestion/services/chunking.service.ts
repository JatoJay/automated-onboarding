import { Injectable } from '@nestjs/common';

export interface Chunk {
  content: string;
  index: number;
  tokenCount: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class ChunkingService {
  private readonly DEFAULT_CHUNK_SIZE = 1000;
  private readonly DEFAULT_OVERLAP = 200;

  chunk(
    text: string,
    options?: {
      chunkSize?: number;
      overlap?: number;
      separators?: string[];
    },
  ): Chunk[] {
    const chunkSize = options?.chunkSize || this.DEFAULT_CHUNK_SIZE;
    const overlap = options?.overlap || this.DEFAULT_OVERLAP;
    const separators = options?.separators || ['\n\n', '\n', '. ', ' '];

    const chunks: Chunk[] = [];
    let currentText = text.trim();
    let index = 0;

    while (currentText.length > 0) {
      let chunkEnd = Math.min(chunkSize, currentText.length);

      if (chunkEnd < currentText.length) {
        const searchStart = Math.max(0, chunkEnd - 100);
        const searchArea = currentText.substring(searchStart, chunkEnd);

        for (const separator of separators) {
          const lastSeparator = searchArea.lastIndexOf(separator);
          if (lastSeparator !== -1) {
            chunkEnd = searchStart + lastSeparator + separator.length;
            break;
          }
        }
      }

      const chunkContent = currentText.substring(0, chunkEnd).trim();

      if (chunkContent.length > 0) {
        chunks.push({
          content: chunkContent,
          index,
          tokenCount: this.estimateTokens(chunkContent),
        });
        index++;
      }

      const nextStart = Math.max(0, chunkEnd - overlap);
      currentText = currentText.substring(nextStart).trim();

      if (nextStart === 0) break;
    }

    return chunks;
  }

  chunkByParagraph(text: string, maxChunkSize = 2000): Chunk[] {
    const paragraphs = text.split(/\n\n+/);
    const chunks: Chunk[] = [];
    let currentChunk = '';
    let index = 0;

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;

      if (currentChunk.length + trimmed.length + 2 <= maxChunkSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
      } else {
        if (currentChunk) {
          chunks.push({
            content: currentChunk,
            index,
            tokenCount: this.estimateTokens(currentChunk),
          });
          index++;
        }

        if (trimmed.length > maxChunkSize) {
          const subChunks = this.chunk(trimmed, { chunkSize: maxChunkSize });
          for (const subChunk of subChunks) {
            chunks.push({
              ...subChunk,
              index,
            });
            index++;
          }
          currentChunk = '';
        } else {
          currentChunk = trimmed;
        }
      }
    }

    if (currentChunk) {
      chunks.push({
        content: currentChunk,
        index,
        tokenCount: this.estimateTokens(currentChunk),
      });
    }

    return chunks;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
