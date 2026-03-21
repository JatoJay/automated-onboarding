import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import MemoryClient from 'mem0ai';

@Injectable()
export class MemoryService {
  private client: MemoryClient | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('MEM0_API_KEY');
    if (apiKey) {
      this.client = new MemoryClient({ apiKey });
    }
  }

  async addMemory(userId: string, content: string, metadata?: Record<string, any>) {
    if (!this.client) return null;
    try {
      const result = await this.client.add(
        [{ role: 'user', content }],
        {
          user_id: userId,
          metadata: {
            source: 'onboarding_chat',
            ...metadata,
          },
        },
      );
      return result;
    } catch (error) {
      console.error('Failed to add memory:', error);
      return null;
    }
  }

  async getMemories(userId: string, query?: string) {
    if (!this.client) return [];
    try {
      if (query) {
        const results = await this.client.search(query, {
          user_id: userId,
          limit: 5,
        });
        return results;
      }

      const results = await this.client.getAll({
        user_id: userId,
        limit: 10,
      });
      return results;
    } catch (error) {
      console.error('Failed to get memories:', error);
      return [];
    }
  }

  async searchMemories(userId: string, query: string, limit = 5) {
    if (!this.client) return [];
    try {
      const results = await this.client.search(query, {
        user_id: userId,
        limit,
      });
      return results;
    } catch (error) {
      console.error('Failed to search memories:', error);
      return [];
    }
  }

  async deleteMemory(memoryId: string) {
    if (!this.client) return { deleted: false };
    try {
      await this.client.delete(memoryId);
      return { deleted: true };
    } catch (error) {
      console.error('Failed to delete memory:', error);
      return { deleted: false };
    }
  }

  async deleteUserMemories(userId: string) {
    if (!this.client) return { deleted: false };
    try {
      await this.client.deleteAll({ user_id: userId });
      return { deleted: true };
    } catch (error) {
      console.error('Failed to delete user memories:', error);
      return { deleted: false };
    }
  }
}
