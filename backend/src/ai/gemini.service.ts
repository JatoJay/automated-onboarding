import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VertexAI } from '@google-cloud/vertexai';
import { GoogleAuth } from 'google-auth-library';

@Injectable()
export class GeminiService implements OnModuleInit {
  private vertexAI: VertexAI;
  private projectId: string;
  private location: string;
  private auth: GoogleAuth;

  constructor(private configService: ConfigService) {
    this.projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT') || '';
    this.location = this.configService.get<string>('GOOGLE_CLOUD_LOCATION') || 'us-central1';

    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }

  async onModuleInit() {
    this.vertexAI = new VertexAI({
      project: this.projectId,
      location: this.location,
    });
  }

  async generateChatResponse(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'model'; content: string }>,
  ): Promise<string> {
    const model = this.vertexAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
    });

    const chat = model.startChat({
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
      history: messages.slice(0, -1).map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;

    return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/text-embedding-004:predict`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          instances: [{ content: text }],
          parameters: {
            outputDimensionality: 768,
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Embedding API error: ${error}`);
    }

    const data = await response.json();
    return data.predictions?.[0]?.embeddings?.values || [];
  }

  private async getAccessToken(): Promise<string> {
    const client = await this.auth.getClient();
    const tokenResponse = await client.getAccessToken();
    return tokenResponse.token || '';
  }
}
