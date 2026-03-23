const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    if (this.token) return this.token;
    this.token = localStorage.getItem('token');
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
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

  async validateInvite(token: string) {
    return this.request<{
      email: string;
      firstName: string;
      lastName: string;
      jobTitle: string;
      department: string;
      organization: string;
      startDate: string;
    }>(`/auth/invites/validate?token=${token}`);
  }

  async registerWithInvite(token: string, password: string) {
    const result = await this.request<{
      accessToken: string;
      refreshToken: string;
    }>('/auth/register-with-invite', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
    this.setToken(result.accessToken);
    return result;
  }

  async createInvite(data: {
    email: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
    departmentId: string;
    managerId?: string;
    startDate: string;
  }) {
    return this.request<{
      id: string;
      token: string;
      email: string;
      inviteLink: string;
      expiresAt: string;
    }>('/auth/invites', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listInvites() {
    return this.request<Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      jobTitle: string;
      token: string;
      startDate: string;
      department: { id: string; name: string };
      createdBy: { firstName: string; lastName: string };
      expiresAt: string;
      usedAt: string | null;
      createdAt: string;
    }>>('/auth/invites');
  }

  async revokeInvite(id: string) {
    return this.request(`/auth/invites/${id}`, { method: 'DELETE' });
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
    return this.request<any[]>(`/tasks/my-tasks${status ? `?status=${status}` : ''}`);
  }

  async getAllTasks(params?: { status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryStr = query.toString();
    return this.request<{
      tasks: Array<{
        id: string;
        title: string;
        description?: string;
        type: string;
        status: string;
        dueDate?: string;
        employee: {
          id: string;
          user: { firstName: string; lastName: string; email: string };
        };
      }>;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/tasks/all${queryStr ? `?${queryStr}` : ''}`);
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

  async getTask(taskId: string) {
    return this.request<{
      id: string;
      title: string;
      description?: string;
      type: string;
      status: string;
      dueDate?: string;
      employee: { id: string; user: { firstName: string; lastName: string } };
    }>(`/tasks/${taskId}`);
  }

  async createTask(data: {
    employeeId: string;
    title: string;
    description?: string;
    type: string;
    dueDate?: string;
  }) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getEmployeeTasks(employeeId: string, status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request<any[]>(`/tasks/employee/${employeeId}${query}`);
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

  async uploadDocumentFromUrl(data: {
    url: string;
    title?: string;
    category: string;
    departmentId?: string;
    isOrgWide?: boolean;
  }) {
    return this.request('/documents/upload-url', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async indexAllPending() {
    return this.request('/documents/index-all-pending', { method: 'POST' });
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

  async crawlSitemap(data: {
    name: string;
    sitemapUrl: string;
    category: string;
    maxPages?: number;
  }) {
    return this.request('/external-docs/crawl-sitemap', {
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

  async getDepartments() {
    return this.request<Array<{
      id: string;
      name: string;
      description?: string;
      parentId?: string;
      headId?: string;
      head?: { id: string; firstName: string; lastName: string; email: string };
      parent?: { id: string; name: string };
      createdAt: string;
      _count: {
        employees: number;
        knowledgeDocuments: number;
        dataSources: number;
        children: number;
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

  async createDepartment(data: { name: string; description?: string; parentId?: string }) {
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

  async setDepartmentHead(departmentId: string, headId: string) {
    return this.request(`/departments/${departmentId}/head`, {
      method: 'PUT',
      body: JSON.stringify({ headId }),
    });
  }

  async removeDepartmentHead(departmentId: string) {
    return this.request(`/departments/${departmentId}/head`, { method: 'DELETE' });
  }

  async getDepartmentHierarchy() {
    return this.request<any[]>('/departments/hierarchy');
  }

  async getDepartmentManagers(departmentId: string) {
    return this.request<Array<{
      id: string;
      user: { id: string; firstName: string; lastName: string; email: string };
      jobTitle: string;
    }>>(`/departments/${departmentId}/managers`);
  }

  async getMyOrgChart() {
    return this.request<{
      employee: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        jobTitle: string;
      };
      department: {
        id: string;
        name: string;
        head?: { id: string; firstName: string; lastName: string; email: string };
        parent?: {
          id: string;
          name: string;
          head?: { id: string; firstName: string; lastName: string; email: string };
        };
      };
      directManager?: { id: string; firstName: string; lastName: string; email: string };
      managerChain: Array<{
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        jobTitle?: string;
        department?: { id: string; name: string };
      }>;
      colleagues: Array<{
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        jobTitle: string;
        role: string;
      }>;
    }>('/employees/me/org-chart');
  }

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
    userId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    departmentId: string;
    managerId?: string;
    jobTitle: string;
    startDate: string;
    accessibleDepartmentIds?: string[];
    role?: string;
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

  async getOnboardingStatus() {
    return this.request<{
      phase: string;
      daysInRole: number;
      milestones: {
        total: number;
        completed: number;
        pending: number;
        overdue: number;
        completionRate: number;
        nextTask: any | null;
      };
      employee: {
        name: string;
        department: string;
        jobTitle: string;
        startDate: string;
        manager: string | null;
      };
    }>('/chat/onboarding-status');
  }

  async getWorkflowPlans(departmentId?: string) {
    const query = departmentId ? `?departmentId=${departmentId}` : '';
    return this.request<Array<{
      id: string;
      name: string;
      description?: string;
      isDefault: boolean;
      department?: { id: string; name: string };
      _count: { taskTemplates: number };
    }>>(`/admin/workflows/plans${query}`);
  }

  async getWorkflowPlan(id: string) {
    return this.request<{
      id: string;
      name: string;
      description?: string;
      isDefault: boolean;
      taskTemplates: Array<{
        id: string;
        title: string;
        description?: string;
        type: string;
        daysFromStart: number;
        durationDays: number;
        order: number;
        isRequired: boolean;
      }>;
      department?: { id: string; name: string };
    }>(`/admin/workflows/plans/${id}`);
  }

  async createWorkflowPlan(data: {
    name: string;
    description?: string;
    departmentId?: string;
    isDefault?: boolean;
  }) {
    return this.request('/admin/workflows/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createStandardPlan(departmentId?: string) {
    return this.request('/admin/workflows/plans/create-standard', {
      method: 'POST',
      body: JSON.stringify({ departmentId }),
    });
  }

  async addTaskTemplate(planId: string, data: {
    title: string;
    description?: string;
    type: string;
    daysFromStart?: number;
    durationDays?: number;
    isRequired?: boolean;
  }) {
    return this.request(`/admin/workflows/plans/${planId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteWorkflowPlan(id: string) {
    return this.request(`/admin/workflows/plans/${id}`, { method: 'DELETE' });
  }

  async reorderTaskTemplates(planId: string, taskIds: string[]) {
    return this.request(`/admin/workflows/plans/${planId}/reorder`, {
      method: 'POST',
      body: JSON.stringify({ taskIds }),
    });
  }

  async deleteTaskTemplate(taskId: string) {
    return this.request(`/admin/workflows/tasks/${taskId}`, { method: 'DELETE' });
  }

  async getEmployeeMilestones(employeeId: string) {
    return this.request<{
      employeeId: string;
      daysInRole: number;
      currentMilestone: string;
      milestones: Array<{
        name: string;
        targetDay: number;
        tasksCompleted: number;
        tasksTotal: number;
        completionRate: number;
        isComplete: boolean;
        isCurrent: boolean;
        tasks: any[];
      }>;
      overallProgress: {
        completed: number;
        total: number;
        percentage: number;
      };
    }>(`/admin/workflows/employees/${employeeId}/milestones`);
  }

  async assignPlanToEmployee(employeeId: string, planId?: string) {
    return this.request<{
      assigned: boolean;
      planName: string;
      tasksCreated: number;
    }>(`/admin/workflows/employees/${employeeId}/assign-plan`, {
      method: 'POST',
      body: JSON.stringify({ planId }),
    });
  }

  async getForms(filters?: { status?: string; departmentId?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.departmentId) params.append('departmentId', filters.departmentId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<Form[]>(`/forms${query}`);
  }

  async getForm(id: string) {
    return this.request<Form>(`/forms/${id}`);
  }

  async createForm(data: CreateFormData) {
    return this.request<Form>('/forms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateForm(id: string, data: Partial<CreateFormData> & { status?: string }) {
    return this.request<Form>(`/forms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteForm(id: string) {
    return this.request(`/forms/${id}`, { method: 'DELETE' });
  }

  async addFormField(formId: string, field: FormFieldData) {
    return this.request<FormField>(`/forms/${formId}/fields`, {
      method: 'POST',
      body: JSON.stringify(field),
    });
  }

  async updateFormField(fieldId: string, field: Partial<FormFieldData>) {
    return this.request<FormField>(`/forms/fields/${fieldId}`, {
      method: 'PUT',
      body: JSON.stringify(field),
    });
  }

  async deleteFormField(fieldId: string) {
    return this.request(`/forms/fields/${fieldId}`, { method: 'DELETE' });
  }

  async reorderFormFields(formId: string, fieldIds: string[]) {
    return this.request<Form>(`/forms/${formId}/reorder`, {
      method: 'POST',
      body: JSON.stringify({ fieldIds }),
    });
  }

  async getMyForms() {
    return this.request<(Form & { isSubmitted: boolean })[]>('/forms/my-forms');
  }

  async submitForm(formId: string, data: Record<string, any>) {
    return this.request(`/forms/${formId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
  }

  async getMySubmission(formId: string) {
    return this.request<FormSubmission | null>(`/forms/${formId}/my-submission`);
  }

  async getFormSubmissions(formId: string) {
    return this.request<{ form: Form; submissions: FormSubmission[] }>(`/forms/${formId}/submissions`);
  }

  async exportFormSubmissions(formId: string, format: 'csv' | 'json' = 'csv') {
    const response = await fetch(`${API_BASE}/forms/${formId}/export?format=${format}`, {
      headers: { Authorization: `Bearer ${this.getToken()}` },
    });
    if (format === 'json') {
      return response.json();
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `form_submissions.${format}`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async createHelpRequest(data: { category: string; subject: string; description: string; taskId?: string }) {
    return this.request<HelpRequest>('/help-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyHelpRequests() {
    return this.request<HelpRequest[]>('/help-requests/my');
  }

  async getHelpRequest(id: string) {
    return this.request<HelpRequest>(`/help-requests/${id}`);
  }

  async addHelpRequestReply(requestId: string, message: string) {
    return this.request<HelpRequestReply>(`/help-requests/${requestId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async getAdminHelpRequests(filters?: { status?: string; category?: string }) {
    const query = new URLSearchParams();
    if (filters?.status) query.set('status', filters.status);
    if (filters?.category) query.set('category', filters.category);
    const queryStr = query.toString();
    return this.request<HelpRequest[]>(`/admin/help-requests${queryStr ? `?${queryStr}` : ''}`);
  }

  async getAdminHelpRequestStats() {
    return this.request<{ open: number; inProgress: number; resolvedToday: number; total: number }>(
      '/admin/help-requests/stats'
    );
  }

  async getAdminHelpRequest(id: string) {
    return this.request<HelpRequest>(`/admin/help-requests/${id}`);
  }

  async updateHelpRequest(id: string, data: { status?: string; assignedToId?: string; resolution?: string }) {
    return this.request<HelpRequest>(`/admin/help-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addAdminHelpRequestReply(requestId: string, message: string) {
    return this.request<HelpRequestReply>(`/admin/help-requests/${requestId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async getNotifications() {
    return this.request<{ count: number; type: string }>('/help-requests/notifications');
  }
}

export interface FormField {
  id: string;
  formId: string;
  label: string;
  type: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: string[];
  validation?: Record<string, any>;
  order: number;
}

export interface Form {
  id: string;
  name: string;
  description?: string;
  isOrgWide: boolean;
  status: string;
  departmentId?: string;
  department?: { id: string; name: string };
  createdBy: { id: string; firstName: string; lastName: string };
  fields: FormField[];
  _count: { submissions: number };
  createdAt: string;
  updatedAt: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  employeeId: string;
  data: Record<string, any>;
  submittedAt: string;
  employee: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    jobTitle: string;
    department: { id: string; name: string };
    user?: { firstName: string; lastName: string; email: string };
  };
  form?: Form;
}

export interface CreateFormData {
  name: string;
  description?: string;
  isOrgWide: boolean;
  departmentId?: string;
  fields?: FormFieldData[];
}

export interface FormFieldData {
  label: string;
  type: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: string[];
  validation?: Record<string, any>;
  order: number;
}

export interface HelpRequest {
  id: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolution?: string;
  employee?: {
    id: string;
    user?: { firstName: string; lastName: string; email: string };
    department?: { id: string; name: string };
  };
  task?: { id: string; title: string; type: string; status?: string };
  assignedTo?: { id: string; firstName: string; lastName: string };
  replies?: HelpRequestReply[];
  _count?: { replies: number };
}

export interface HelpRequestReply {
  id: string;
  message: string;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; role: string };
}

export const api = new ApiClient();
