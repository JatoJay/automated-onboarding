import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { QdrantService } from './qdrant.service';
import { MemoryService } from './memory.service';
import { GeminiService } from './gemini.service';
import { ChatMessageDto } from './dto/chat-message.dto';

interface OnboardingContext {
  employee: any;
  tasks: any[];
  milestones: any;
  daysInRole: number;
  onboardingPhase: string;
}

@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    private qdrantService: QdrantService,
    private memoryService: MemoryService,
    private geminiService: GeminiService,
  ) {}

  private getOnboardingPhase(daysInRole: number): string {
    if (daysInRole <= 7) return 'first_week';
    if (daysInRole <= 30) return 'first_month';
    if (daysInRole <= 60) return 'second_month';
    if (daysInRole <= 90) return 'third_month';
    return 'post_onboarding';
  }

  private async getOnboardingContext(userId: string): Promise<OnboardingContext | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      include: {
        department: { select: { id: true, name: true } },
        manager: { select: { firstName: true, lastName: true, email: true } },
        user: { select: { firstName: true, lastName: true } },
        departmentAccess: {
          select: { departmentId: true, department: { select: { name: true } } },
        },
        tasks: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!employee) return null;

    const daysInRole = Math.floor(
      (Date.now() - new Date(employee.startDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    const tasks = employee.tasks;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const pendingTasks = tasks.filter(t => t.status === 'PENDING');
    const overdueTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date());

    return {
      employee,
      tasks,
      milestones: {
        total: tasks.length,
        completed: completedTasks,
        pending: pendingTasks.length,
        overdue: overdueTasks.length,
        completionRate: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0,
        nextTask: pendingTasks[0] || null,
      },
      daysInRole,
      onboardingPhase: this.getOnboardingPhase(daysInRole),
    };
  }

  private buildOnboardingPrompt(context: OnboardingContext): string {
    const { employee, milestones, daysInRole, onboardingPhase } = context;
    const managerName = employee.manager
      ? `${employee.manager.firstName} ${employee.manager.lastName}`
      : 'Not assigned';

    const phaseGuidance: Record<string, string> = {
      first_week: `This employee is in their FIRST WEEK. Focus on:
- Basic setup and access (email, tools, systems)
- Team introductions and meeting key people
- Understanding immediate workspace and resources
- Completing required HR paperwork and compliance training
Be extra welcoming and patient. Offer proactive help.`,

      first_month: `This employee is in their FIRST MONTH (Day ${daysInRole}). Focus on:
- Deeper understanding of role and responsibilities
- Building relationships with team members
- Starting small projects or shadowing
- Learning team processes and workflows
Encourage questions and check on their comfort level.`,

      second_month: `This employee is in their SECOND MONTH (Day ${daysInRole}). Focus on:
- Taking ownership of initial projects
- Contributing to team meetings and discussions
- Understanding cross-functional dependencies
- Building confidence in role
Help them find opportunities to contribute meaningfully.`,

      third_month: `This employee is in their THIRD MONTH (Day ${daysInRole}). Focus on:
- Demonstrating competency in core responsibilities
- Working more independently
- Identifying areas for growth
- Preparing for end-of-probation review
Support their transition to full productivity.`,

      post_onboarding: `This employee has completed their 90-day onboarding. They should be:
- Fully integrated into the team
- Working independently on projects
- Contributing to team goals
Support their continued growth and development.`,
    };

    let taskContext = '';
    if (milestones.nextTask) {
      taskContext = `\nTheir next pending task is: "${milestones.nextTask.title}"${
        milestones.nextTask.dueDate
          ? ` (due: ${new Date(milestones.nextTask.dueDate).toLocaleDateString()})`
          : ''
      }`;
    }
    if (milestones.overdue > 0) {
      taskContext += `\n⚠️ They have ${milestones.overdue} overdue task(s). Gently remind them and offer help.`;
    }

    return `You are an AI ONBOARDING ASSISTANT specifically designed to help new employees succeed at their company.

=== EMPLOYEE CONTEXT ===
Name: ${employee.user.firstName} ${employee.user.lastName}
Job Title: ${employee.jobTitle}
Department: ${employee.department.name}
Manager: ${managerName}
Start Date: ${new Date(employee.startDate).toLocaleDateString()}
Days in Role: ${daysInRole}
Onboarding Status: ${employee.onboardingStatus}

=== ONBOARDING PROGRESS ===
Tasks Completed: ${milestones.completed}/${milestones.total} (${milestones.completionRate}%)
Pending Tasks: ${milestones.pending}
${taskContext}

=== PHASE-SPECIFIC GUIDANCE ===
${phaseGuidance[onboardingPhase] || phaseGuidance.post_onboarding}

=== YOUR ROLE ===
1. Be a knowledgeable, supportive onboarding guide
2. Answer questions using company knowledge base (provided context)
3. Help complete onboarding tasks and explain next steps
4. Proactively suggest relevant resources based on their current phase
5. Track their progress and celebrate milestones
6. Escalate concerns to manager if needed (suggest they reach out)
7. Be warm, encouraging, and patient - remember they're new!

If asked about something outside the knowledge base, be honest and suggest who might know (HR, IT, their manager, etc.).
`;
  }

  async chat(userId: string, dto: ChatMessageDto) {
    await this.prisma.chatMessage.create({
      data: {
        userId,
        role: 'user',
        content: dto.message,
      },
    });

    const onboardingContext = await this.getOnboardingContext(userId);
    const employee = onboardingContext?.employee;

    const accessibleDepartmentIds = employee
      ? [
          employee.departmentId,
          ...employee.departmentAccess.map((a: any) => a.departmentId),
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
          ...employee.departmentAccess.map((a: any) => a.department.name),
        ].filter(Boolean)
      : [];

    let systemPrompt: string;

    if (onboardingContext) {
      systemPrompt = this.buildOnboardingPrompt(onboardingContext);
      systemPrompt += `\n\n=== DEPARTMENT ACCESS ===
You have access to knowledge from: ${accessibleDeptNames.join(', ')} department(s).
Only reference information from these departments and company-wide resources.

=== KNOWLEDGE BASE CONTEXT ===
${knowledgeContext.map((doc) => `[${doc.isOrgWide ? 'Company-wide' : doc.category}] ${doc.content}`).join('\n\n')}${memoryContext}`;
    } else {
      systemPrompt = `You are an AI onboarding assistant helping employees at the company.
You have access to company documentation and policies. Be helpful, friendly, and concise.
Answer questions based on the provided context. If you don't know something, say so.
${accessibleDeptNames.length > 0 ? `\nThis employee has access to: ${accessibleDeptNames.join(', ')} department(s).` : ''}

Context from company knowledge base:
${knowledgeContext.map((doc) => `[${doc.isOrgWide ? 'Company-wide' : doc.category}] ${doc.content}`).join('\n\n')}${memoryContext}`;
    }

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
    const context = await this.getOnboardingContext(userId);

    if (!context) {
      return [
        'What are the company holidays this year?',
        'How do I set up my development environment?',
        'Where can I find the employee handbook?',
      ];
    }

    const { milestones, onboardingPhase, employee } = context;
    const suggestions: string[] = [];

    if (milestones.nextTask) {
      suggestions.push(`How do I complete "${milestones.nextTask.title}"?`);
    }

    if (milestones.overdue > 0) {
      suggestions.push('Help me catch up on my overdue tasks');
    }

    const phaseSuggestions: Record<string, string[]> = {
      first_week: [
        'What should I focus on in my first week?',
        'Who are the key people I should meet?',
        'How do I set up my accounts and tools?',
        'What are the most important company policies?',
      ],
      first_month: [
        'What should I accomplish by end of month one?',
        `Tell me about the ${employee.department.name} team`,
        'What projects can I start contributing to?',
        'How do performance reviews work here?',
      ],
      second_month: [
        'How can I increase my impact?',
        'What skills should I be developing?',
        'How do I request feedback from my manager?',
        'What are the team\'s current priorities?',
      ],
      third_month: [
        'How do I prepare for my 90-day review?',
        'What goals should I set for the next quarter?',
        'How can I build my network across teams?',
        'What growth opportunities are available?',
      ],
      post_onboarding: [
        'What career development resources are available?',
        'How do I mentor new team members?',
        'What leadership opportunities exist?',
        'How can I contribute to company culture?',
      ],
    };

    const phaseSpecific = phaseSuggestions[onboardingPhase] || phaseSuggestions.post_onboarding;
    suggestions.push(...phaseSpecific.slice(0, 4 - suggestions.length));

    return suggestions.slice(0, 4);
  }

  async getOnboardingStatus(userId: string) {
    const context = await this.getOnboardingContext(userId);
    if (!context) return null;

    return {
      phase: context.onboardingPhase,
      daysInRole: context.daysInRole,
      milestones: context.milestones,
      employee: {
        name: `${context.employee.user.firstName} ${context.employee.user.lastName}`,
        department: context.employee.department.name,
        jobTitle: context.employee.jobTitle,
        startDate: context.employee.startDate,
        manager: context.employee.manager
          ? `${context.employee.manager.firstName} ${context.employee.manager.lastName}`
          : null,
      },
    };
  }
}
