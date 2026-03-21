import { Injectable } from '@nestjs/common';
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';
import * as cheerio from 'cheerio';

export interface ParsedDocument {
  content: string;
  metadata: {
    pageCount?: number;
    wordCount?: number;
    title?: string;
  };
}

@Injectable()
export class DocumentParserService {
  async parse(buffer: Buffer, mimeType: string, filename: string): Promise<ParsedDocument> {
    switch (mimeType) {
      case 'application/pdf':
        return this.parsePdf(buffer);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.parseDocx(buffer);
      case 'text/html':
        return this.parseHtml(buffer);
      case 'text/plain':
      case 'text/markdown':
        return this.parseText(buffer);
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }

  private async parsePdf(buffer: Buffer): Promise<ParsedDocument> {
    const data = await pdfParse(buffer);
    return {
      content: data.text,
      metadata: {
        pageCount: data.numpages,
        wordCount: data.text.split(/\s+/).length,
      },
    };
  }

  private async parseDocx(buffer: Buffer): Promise<ParsedDocument> {
    const result = await mammoth.extractRawText({ buffer });
    return {
      content: result.value,
      metadata: {
        wordCount: result.value.split(/\s+/).length,
      },
    };
  }

  private parseHtml(buffer: Buffer): ParsedDocument {
    const html = buffer.toString('utf-8');
    const $ = cheerio.load(html);

    $('script, style, nav, footer, header').remove();

    const title = $('title').text() || $('h1').first().text();
    const content = $('body').text().replace(/\s+/g, ' ').trim();

    return {
      content,
      metadata: {
        title,
        wordCount: content.split(/\s+/).length,
      },
    };
  }

  private parseText(buffer: Buffer): ParsedDocument {
    const content = buffer.toString('utf-8');
    return {
      content,
      metadata: {
        wordCount: content.split(/\s+/).length,
      },
    };
  }

  async parseUrl(url: string): Promise<ParsedDocument> {
    const response = await fetch(url);
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      const html = await response.text();
      return this.parseHtml(Buffer.from(html));
    }

    if (contentType.includes('application/pdf')) {
      const arrayBuffer = await response.arrayBuffer();
      return this.parsePdf(Buffer.from(arrayBuffer));
    }

    const text = await response.text();
    return this.parseText(Buffer.from(text));
  }
}
