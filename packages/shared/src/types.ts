import { UserRole, TaskStatus, TaskType, OnboardingStatus } from './enums';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  userId: string;
  departmentId: string;
  managerId?: string;
  jobTitle: string;
  startDate: string;
  onboardingStatus: OnboardingStatus;
  user?: Pick<User, 'email' | 'firstName' | 'lastName' | 'role'>;
  department?: Department;
  manager?: Pick<User, 'firstName' | 'lastName' | 'email'>;
  tasks?: Task[];
}

export interface Department {
  id: string;
  name: string;
  createdAt: string;
}

export interface Task {
  id: string;
  employeeId: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  dueDate?: string;
  completedAt?: string;
  assignedById?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingPlan {
  id: string;
  name: string;
  description?: string;
  departmentId?: string;
  isDefault: boolean;
  taskTemplates?: TaskTemplate[];
  department?: Department;
}

export interface TaskTemplate {
  id: string;
  onboardingPlanId: string;
  title: string;
  description?: string;
  type: TaskType;
  daysFromStart: number;
  durationDays: number;
  order: number;
  isRequired: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: DocumentReference[];
  createdAt: string;
}

export interface DocumentReference {
  id: string;
  title: string;
  category: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingProgress {
  total: number;
  completed: number;
  percentage: number;
  byStatus: {
    pending: number;
    inProgress: number;
    completed: number;
    blocked: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  message: string;
  sources: DocumentReference[];
  messageId: string;
}

export interface CreateTaskRequest {
  employeeId: string;
  title: string;
  description?: string;
  type: TaskType;
  dueDate?: string;
  assignedById?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
}

export interface CreateEmployeeRequest {
  userId: string;
  departmentId: string;
  managerId?: string;
  jobTitle: string;
  startDate: string;
}

export interface CreatePlanRequest {
  name: string;
  description?: string;
  departmentId?: string;
  isDefault?: boolean;
}

export interface CreateTaskTemplateRequest {
  title: string;
  description?: string;
  type: TaskType;
  daysFromStart?: number;
  durationDays?: number;
  isRequired?: boolean;
}

export interface AddDocumentRequest {
  title: string;
  content: string;
  category: string;
  metadata?: Record<string, unknown>;
}
