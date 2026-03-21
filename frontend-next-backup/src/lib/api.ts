const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
      }
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  async login(email: string, password: string) {
    const data = await this.request<{
      accessToken: string;
      refreshToken: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.accessToken);
    return data;
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const result = await this.request<{
      accessToken: string;
      refreshToken: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(result.accessToken);
    return result;
  }

  async getMe() {
    return this.request<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
    }>('/auth/me');
  }

  async getMyProfile() {
    return this.request('/employees/me');
  }

  async getMyProgress() {
    return this.request<{
      total: number;
      completed: number;
      percentage: number;
      byStatus: {
        pending: number;
        inProgress: number;
        completed: number;
        blocked: number;
      };
    }>('/employees/me/progress');
  }

  async getMyTasks(status?: string) {
    return this.request<any[]>(`/employees/me/tasks${status ? `?status=${status}` : ''}`);
  }

  async updateTask(taskId: string, data: { status?: string }) {
    return this.request(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async completeTask(taskId: string) {
    return this.request(`/tasks/${taskId}/complete`, { method: 'POST' });
  }

  async sendChatMessage(message: string, departmentId?: string) {
    return this.request<{
      message: string;
      sources: Array<{ id: string; title: string; category: string }>;
      messageId: string;
    }>('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message, departmentId }),
    });
  }

  async getChatHistory() {
    return this.request<
      Array<{
        id: string;
        role: string;
        content: string;
        sources?: any[];
        createdAt: string;
      }>
    >('/chat/history');
  }

  async getChatSuggestions() {
    return this.request<string[]>('/chat/suggestions');
  }

  // Document Management
  async getDocuments(params?: {
    category?: string;
    status?: string;
    departmentId?: string;
    includeOrgWide?: boolean;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.status) query.set('status', params.status);
    if (params?.departmentId) query.set('departmentId', params.departmentId);
    if (params?.includeOrgWide !== undefined) query.set('includeOrgWide', String(params.includeOrgWide));
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryStr = query.toString();
    return this.request<{
      documents: Array<{
        id: string;
        title: string;
        category: string;
        documentType: string;
        status: string;
        chunkCount: number;
        fileSize?: number;
        departmentId?: string;
        isOrgWide: boolean;
        department?: { id: string; name: string };
        createdAt: string;
        updatedAt: string;
      }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/documents${queryStr ? `?${queryStr}` : ''}`);
  }

  async getDocumentStatus(documentId: string) {
    return this.request<{
      id: string;
      title: string;
      status: string;
      chunkCount: number;
      errorMessage?: string;
      updatedAt: string;
    }>(`/documents/${documentId}/status`);
  }

  async uploadDocument(
    file: File,
    category: string,
    title?: string,
    departmentId?: string,
    isOrgWide?: boolean
  ) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (title) formData.append('title', title);
    if (departmentId) formData.append('departmentId', departmentId);
    if (isOrgWide !== undefined) formData.append('isOrgWide', String(isOrgWide));

    const token = this.getToken();
    const response = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  }

  async deleteDocument(documentId: string) {
    return this.request(`/documents/${documentId}`, { method: 'DELETE' });
  }

  async reindexDocument(documentId: string) {
    return this.request(`/documents/${documentId}/reindex`, { method: 'POST' });
  }

  async getCategories() {
    return this.request<Array<{ category: string; count: number }>>('/documents/categories');
  }

  async bulkUploadDocuments(documents: Array<{ title: string; content: string; category: string }>) {
    return this.request('/documents/bulk', {
      method: 'POST',
      body: JSON.stringify({ documents }),
    });
  }

  // External Docs / Data Sources
  async getDataSources() {
    return this.request<Array<{
      id: string;
      name: string;
      type: string;
      config: any;
      documentsCount: number;
      lastSyncAt?: string;
      createdAt: string;
    }>>('/external-docs');
  }

  async crawlDocs(data: {
    name: string;
    docsUrl: string;
    category: string;
    maxPages?: number;
    maxDepth?: number;
  }) {
    return this.request('/external-docs/crawl', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async crawlWithPlaywright(data: {
    name: string;
    docsUrl: string;
    category: string;
    maxPages?: number;
    waitForSelector?: string;
    scrollToBottom?: boolean;
  }) {
    return this.request('/connectors/playwright/crawl', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async syncNotion(data: {
    name: string;
    apiKey: string;
    category: string;
    pageIds?: string[];
    databaseIds?: string[];
  }) {
    return this.request('/connectors/notion/sync', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async syncConfluence(data: {
    name: string;
    baseUrl: string;
    email: string;
    apiToken: string;
    spaceKey: string;
    category: string;
    maxPages?: number;
  }) {
    return this.request('/connectors/confluence/sync', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async syncGitHub(data: {
    name: string;
    repoUrl: string;
    accessToken: string;
    category: string;
    branch?: string;
    maxFiles?: number;
    includePatterns?: string[];
    excludePatterns?: string[];
    departmentId?: string;
    isOrgWide?: boolean;
  }) {
    return this.request<{
      dataSourceId: string;
      status: string;
      repository: string;
      branch: string;
      message: string;
    }>('/connectors/github/sync', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getGitHubStatus(dataSourceId: string) {
    return this.request<{
      id: string;
      name: string;
      repository: string;
      branch: string;
      status: string;
      filesIndexed: number;
      totalFilesFound?: number;
      errors: number;
      lastSyncAt?: string;
      error?: string;
    }>(`/connectors/github/${dataSourceId}/status`);
  }

  async resyncGitHub(dataSourceId: string, accessToken: string) {
    return this.request(`/connectors/github/${dataSourceId}/resync`, {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
    });
  }

  async getDataSourceStatus(dataSourceId: string) {
    return this.request<{
      id: string;
      name: string;
      status: string;
      pagesIndexed: number;
      lastSyncAt?: string;
      error?: string;
    }>(`/external-docs/${dataSourceId}/status`);
  }

  async resyncDataSource(dataSourceId: string) {
    return this.request(`/external-docs/${dataSourceId}/resync`, { method: 'POST' });
  }

  async deleteDataSource(dataSourceId: string) {
    return this.request(`/external-docs/${dataSourceId}`, { method: 'DELETE' });
  }

  // Knowledge Search (for testing)
  async searchKnowledge(query: string, limit?: number) {
    return this.request<Array<{
      id: string;
      title: string;
      content: string;
      category: string;
      score: number;
    }>>('/knowledge/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    });
  }

  // Department Management
  async getDepartments() {
    return this.request<Array<{
      id: string;
      name: string;
      description?: string;
      createdAt: string;
      _count: {
        employees: number;
        knowledgeDocuments: number;
        dataSources: number;
      };
    }>>('/departments');
  }

  async getDepartment(id: string) {
    return this.request<{
      id: string;
      name: string;
      description?: string;
      employees: Array<{
        id: string;
        user: { id: string; firstName: string; lastName: string; email: string };
      }>;
      _count: { knowledgeDocuments: number; dataSources: number };
    }>(`/departments/${id}`);
  }

  async getDepartmentStats(id: string) {
    return this.request<{
      employeeCount: number;
      documentCount: number;
      sourceCount: number;
      pendingTasks: number;
    }>(`/departments/${id}/stats`);
  }

  async getDepartmentDocuments(id: string) {
    return this.request<Array<{
      id: string;
      title: string;
      category: string;
      status: string;
      isOrgWide: boolean;
      createdAt: string;
    }>>(`/departments/${id}/documents`);
  }

  async createDepartment(data: { name: string; description?: string }) {
    return this.request('/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDepartment(id: string, data: { name?: string; description?: string }) {
    return this.request(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDepartment(id: string) {
    return this.request(`/departments/${id}`, { method: 'DELETE' });
  }

  // Employee Management (HR)
  async getEmployees(params?: { departmentId?: string; status?: string }) {
    const query = new URLSearchParams();
    if (params?.departmentId) query.set('departmentId', params.departmentId);
    if (params?.status) query.set('status', params.status);
    const queryStr = query.toString();
    return this.request<Array<{
      id: string;
      jobTitle: string;
      startDate: string;
      onboardingStatus: string;
      user: { id: string; email: string; firstName: string; lastName: string; role: string };
      department: { id: string; name: string };
      manager?: { id: string; firstName: string; lastName: string; email: string };
      departmentAccess: Array<{ department: { id: string; name: string } }>;
      _count: { tasks: number };
    }>>(`/admin/employees${queryStr ? `?${queryStr}` : ''}`);
  }

  async getAvailableUsers() {
    return this.request<Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      createdAt: string;
    }>>('/admin/employees/users/available');
  }

  async getEmployeeDetails(id: string) {
    return this.request<{
      id: string;
      jobTitle: string;
      startDate: string;
      onboardingStatus: string;
      user: { id: string; email: string; firstName: string; lastName: string; role: string };
      department: { id: string; name: string };
      manager?: { id: string; firstName: string; lastName: string; email: string };
      departmentAccess: Array<{ department: { id: string; name: string } }>;
      tasks: Array<{ id: string; title: string; status: string; createdAt: string }>;
    }>(`/admin/employees/${id}`);
  }

  async getEmployeeAccessibleDepartments(id: string) {
    return this.request<Array<{ id: string; name: string; isPrimary: boolean }>>(
      `/admin/employees/${id}/accessible-departments`
    );
  }

  async createEmployee(data: {
    userId: string;
    departmentId: string;
    managerId?: string;
    jobTitle: string;
    startDate: string;
    accessibleDepartmentIds?: string[];
  }) {
    return this.request('/admin/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmployee(id: string, data: {
    departmentId?: string;
    managerId?: string;
    jobTitle?: string;
  }) {
    return this.request(`/admin/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateEmployeeDepartmentAccess(id: string, departmentIds: string[]) {
    return this.request(`/admin/employees/${id}/department-access`, {
      method: 'PUT',
      body: JSON.stringify({ departmentIds }),
    });
  }

  async grantDepartmentAccess(employeeId: string, departmentId: string) {
    return this.request(`/admin/employees/${employeeId}/grant-access/${departmentId}`, {
      method: 'POST',
    });
  }

  async revokeDepartmentAccess(employeeId: string, departmentId: string) {
    return this.request(`/admin/employees/${employeeId}/revoke-access/${departmentId}`, {
      method: 'DELETE',
    });
  }

  async deleteEmployee(id: string) {
    return this.request(`/admin/employees/${id}`, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
