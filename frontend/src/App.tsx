import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { DashboardLayout } from '@/layouts/DashboardLayout';

import LoginPage from '@/pages/Login';
import JoinPage from '@/pages/Join';
import DashboardPage from '@/pages/Dashboard';
import ChatPage from '@/pages/Chat';
import TasksPage from '@/pages/Tasks';
import AdminPage from '@/pages/admin/Admin';
import KnowledgePage from '@/pages/admin/Knowledge';
import SourcesPage from '@/pages/admin/Sources';
import DepartmentsPage from '@/pages/admin/Departments';
import EmployeesPage from '@/pages/admin/Employees';
import WorkflowsPage from '@/pages/admin/Workflows';
import AnalyticsPage from '@/pages/admin/Analytics';
import SettingsPage from '@/pages/admin/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

function AppRoutes() {
  const { fetchUser, isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
      } />
      <Route path="/join" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <JoinPage />
      } />

      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/knowledge" element={<KnowledgePage />} />
        <Route path="/admin/sources" element={<SourcesPage />} />
        <Route path="/admin/departments" element={<DepartmentsPage />} />
        <Route path="/admin/employees" element={<EmployeesPage />} />
        <Route path="/admin/workflows" element={<WorkflowsPage />} />
        <Route path="/admin/analytics" element={<AnalyticsPage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
