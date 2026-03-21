import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { QdrantService } from './qdrant.service';
import { MemoryService } from './memory.service';
import { GeminiService } from './gemini.service';
import { ChatMessageDto } from './dto/chat-message.dto';

@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    private qdrantService: QdrantService,
    private memoryService: MemoryService,
    private geminiService: GeminiService,
  ) {}

  async chat(userId: string, dto: ChatMessageDto) {
    await this.prisma.chatMessage.create({
      data: {
        userId,
        role: 'user',
        content: dto.message,
      },
    });

    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      select: {
        departmentId: true,
        department: { select: { name: true } },
        departmentAccess: {
          select: { departmentId: true, department: { select: { name: true } } },
        },
      },
    });

    const accessibleDepartmentIds = employee
      ? [
          employee.departmentId,
          ...employee.departmentAccess.map((a) => a.departmentId),
        ]
      : [];

    const [knowledgeContext, userMemories] = await Promise.all([
      this.qdrantService.search(dto.message, {
        limit: 5,
        departmentIds: accessibleDepartmentIds.length > 0 ? accessibleDepartmentIds : undefined,
        departmentId: dto.departmentId,
        includeOrgWide: true,
      }),
      this.memoryService.searchMemories(userId, dto.message, 3),
    ]);

    const history = await this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const memoryContext = userMemories.length
      ? `\n\nRelevant context about this user:\n${userMemories.map((m: any) => `- ${m.memory}`).join('\n')}`
      : '';

    const accessibleDeptNames = employee
      ? [
          employee.department?.name,
          ...employee.departmentAccess.map((a) => a.department.name),
        ].filter(Boolean)
      : [];

    const departmentContext = accessibleDeptNames.length > 0
      ? `\nThis employee has access to: ${accessibleDeptNames.join(', ')} department(s).`
      : '';

    const systemPrompt = `You are an AI onboarding assistant helping new employees at the company.
You have access to company documentation and policies. Be helpful, friendly, and concise.
Answer questions based on the provided context. If you don't know something, say so.${departmentContext}

Context from company knowledge base:
${knowledgeContext.map((doc) => `[${doc.isOrgWide ? 'Company-wide' : doc.category}] ${doc.content}`).join('\n\n')}${memoryContext}`;

    const messages = [
      ...history.reverse().map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model' as 'user' | 'model',
        content: msg.content,
      })),
      { role: 'user' as const, content: dto.message },
    ];

    const assistantMessage = await this.geminiService.generateChatResponse(
      systemPrompt,
      messages,
    );

    const savedMessage = await this.prisma.chatMessage.create({
      data: {
        userId,
        role: 'assistant',
        content: assistantMessage,
        sources: knowledgeContext.map((doc) => ({
          id: doc.id,
          title: doc.title,
          category: doc.category,
        })),
      },
    });

    this.memoryService.addMemory(
      userId,
      `User asked: "${dto.message}" - Assistant answered about: ${knowledgeContext.map((d) => d.title).join(', ') || 'general inquiry'}`,
      { messageId: savedMessage.id },
    );

    return {
      message: assistantMessage,
      sources: knowledgeContext.map((doc) => ({
        id: doc.id,
        title: doc.title,
        category: doc.category,
      })),
      messageId: savedMessage.id,
    };
  }

  async getChatHistory(userId: string, limit = 50) {
    return this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async getSuggestions(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      include: { tasks: { where: { status: 'PENDING' }, take: 3 } },
    });

    const suggestions = [
      'What are the company holidays this year?',
      'How do I set up my development environment?',
      'Where can I find the employee handbook?',
    ];

    if (employee?.tasks.length) {
      suggestions.unshift(
        `How do I complete "${employee.tasks[0].title}"?`,
      );
    }

    return suggestions;
  }
}
