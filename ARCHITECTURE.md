# AI-Powered Employee Onboarding Platform

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Dashboard  │  │  Chat UI    │  │  Tasks      │  │   Admin     │ │
│  │  (Employee) │  │  (AI Agent) │  │  Tracker    │  │   Panel     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND (NestJS)                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      API Gateway                             │   │
│  │              (Auth, Rate Limiting, Validation)               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                │                                    │
│  ┌──────────────┬──────────────┼──────────────┬──────────────┐     │
│  ▼              ▼              ▼              ▼              ▼     │
│ ┌────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌───────────┐  │
│ │  Auth  │ │ Onboard  │ │    AI     │ │ Workflow │ │Integration│  │
│ │ Module │ │  Module  │ │  Module   │ │  Engine  │ │  Module   │  │
│ └────────┘ └──────────┘ └───────────┘ └──────────┘ └───────────┘  │
│                              │                                      │
│                              ▼                                      │
│              ┌───────────────────────────────┐                     │
│              │      RAG Pipeline             │                     │
│              │  ┌─────────┐  ┌───────────┐   │                     │
│              │  │Embeddings│  │  Vector   │   │                     │
│              │  │ Service  │  │  Search   │   │                     │
│              │  └─────────┘  └───────────┘   │                     │
│              └───────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │ PostgreSQL  │  │  pgvector   │  │    Redis    │  │   S3/Minio│  │
│  │  (Primary)  │  │ (Embeddings)│  │   (Cache)   │  │   (Docs)  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       EXTERNAL INTEGRATIONS                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────┐  │
│  │  Slack  │  │ Google  │  │  Okta/  │  │  HRIS   │  │  LLM API │  │
│  │   Bot   │  │Calendar │  │  Auth0  │  │ (BambooHR)│ │(OpenAI)  │  │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Module Breakdown

### Backend Modules (NestJS)

1. **Auth Module**
   - JWT authentication
   - Role-based access (employee, manager, HR, admin)
   - SSO integration (OAuth2/OIDC)

2. **Onboarding Module**
   - Employee profiles
   - Onboarding progress tracking
   - Task assignments and completion

3. **AI Module**
   - Chat interface with context
   - RAG pipeline for knowledge retrieval
   - Intent classification
   - Response generation

4. **Workflow Engine**
   - Configurable onboarding workflows
   - Task dependencies and triggers
   - Approval flows
   - Notifications

5. **Integration Module**
   - Slack bot handlers
   - Calendar scheduling
   - HRIS sync
   - IT provisioning webhooks

### Frontend Pages (Next.js)

1. **Employee Dashboard** (`/dashboard`)
   - Onboarding progress
   - Pending tasks
   - Quick actions

2. **AI Chat** (`/chat`)
   - Conversational interface
   - Suggested questions
   - Action cards

3. **Task Manager** (`/tasks`)
   - Task list with filters
   - Document uploads
   - Form submissions

4. **Admin Panel** (`/admin`)
   - Workflow builder
   - Knowledge base management
   - Analytics & reporting
   - User management

## Data Models

### Core Entities

```typescript
// Employee
interface Employee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
  managerId: string;
  startDate: Date;
  status: 'pending' | 'active' | 'completed';
}

// OnboardingPlan
interface OnboardingPlan {
  id: string;
  name: string;
  departmentId: string;
  tasks: TaskTemplate[];
}

// Task
interface Task {
  id: string;
  employeeId: string;
  title: string;
  description: string;
  type: 'document' | 'form' | 'training' | 'meeting' | 'approval';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dueDate: Date;
  dependencies: string[];
}

// ChatMessage
interface ChatMessage {
  id: string;
  employeeId: string;
  role: 'user' | 'assistant';
  content: string;
  sources: DocumentReference[];
  timestamp: Date;
}

// KnowledgeDocument
interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  embedding: number[];
  metadata: Record<string, any>;
}
```

## API Endpoints

### Auth
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`

### Onboarding
- `GET /employees/:id`
- `GET /employees/:id/tasks`
- `PATCH /tasks/:id`
- `POST /tasks/:id/complete`

### AI Chat
- `POST /chat/message`
- `GET /chat/history`
- `GET /chat/suggestions`

### Admin
- `GET /admin/workflows`
- `POST /admin/workflows`
- `GET /admin/analytics`
- `POST /admin/knowledge/upload`

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React, TailwindCSS, shadcn/ui |
| Backend | NestJS, TypeScript, Prisma |
| Database | PostgreSQL + pgvector |
| Cache | Redis |
| Storage | S3/MinIO |
| AI/LLM | OpenAI API / Anthropic Claude |
| Auth | Passport.js, JWT |
| Queue | BullMQ (Redis-based) |
