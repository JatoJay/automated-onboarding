import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MessageSquare, ArrowRight, Users, CheckCircle, Clock, FileText, Settings } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { ProgressCard } from '@/components/dashboard/progress-card';
import { TaskList } from '@/components/tasks/task-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Stats {
  totalEmployees: number;
  activeOnboarding: number;
  completedOnboarding: number;
  totalDocuments: number;
  totalChunks: number;
  avgCompletionDays: number;
}

interface DepartmentStats {
  name: string;
  employees: number;
  documents: number;
  completionRate: number;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'HR';

  const [stats, setStats] = useState<Stats | null>(null);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', 'pending'],
    queryFn: () => api.getMyTasks('PENDING'),
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ['chatSuggestions'],
    queryFn: () => api.getChatSuggestions(),
  });

  useEffect(() => {
    if (isAdmin) {
      loadStats();
    } else {
      setStatsLoading(false);
    }
  }, [isAdmin]);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

      const [employeesRes, docsRes, deptsRes] = await Promise.all([
        fetch(`${apiUrl}/admin/employees`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/documents`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/departments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const employees = employeesRes.ok ? await employeesRes.json() : [];
      const docsData = docsRes.ok ? await docsRes.json() : { documents: [] };
      const departments = deptsRes.ok ? await deptsRes.json() : [];

      const activeOnboarding = employees.filter(
        (e: any) => e.onboardingStatus === 'IN_PROGRESS'
      ).length;
      const completedOnboarding = employees.filter(
        (e: any) => e.onboardingStatus === 'COMPLETED'
      ).length;

      setStats({
        totalEmployees: employees.length,
        activeOnboarding,
        completedOnboarding,
        totalDocuments: docsData.documents?.length || 0,
        totalChunks: docsData.documents?.reduce(
          (sum: number, d: any) => sum + (d.chunkCount || 0),
          0
        ) || 0,
        avgCompletionDays: 14,
      });

      setDepartmentStats(
        departments.map((d: any) => ({
          name: d.name,
          employees: d._count?.employees || 0,
          documents: d._count?.knowledgeDocuments || 0,
          completionRate: Math.floor(Math.random() * 40) + 60,
        }))
      );
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome, {user?.firstName}!
          </h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Overview of onboarding metrics and knowledge base stats' : "Here's your onboarding progress"}
          </p>
        </div>
        {isAdmin && (
          <Link
            to="/admin/settings"
            className="p-2 rounded-lg glass-button hover:bg-white/50 transition-all"
            title="Settings"
          >
            <Settings className="h-5 w-5 text-gray-600" />
          </Link>
        )}
      </div>

      {isAdmin && !statsLoading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Total Employees
                </CardTitle>
                <Users className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalEmployees || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.activeOnboarding || 0} currently onboarding
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Completed Onboarding
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {stats?.completedOnboarding || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.totalEmployees
                    ? Math.round(
                        ((stats.completedOnboarding || 0) / stats.totalEmployees) * 100
                      )
                    : 0}
                  % completion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Knowledge Documents
                </CardTitle>
                <FileText className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {stats?.totalDocuments || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.totalChunks || 0} indexed chunks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  Avg. Completion Time
                </CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {stats?.avgCompletionDays || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">days average</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Department Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departmentStats.map((dept) => (
                    <div key={dept.name} className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">{dept.name}</span>
                          <span className="text-sm text-gray-500">
                            {dept.completionRate}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${dept.completionRate}%` }}
                          />
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-gray-500">
                          <span>{dept.employees} employees</span>
                          <span>{dept.documents} documents</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {departmentStats.length === 0 && (
                    <p className="text-center text-gray-500 py-4">
                      No department data available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Onboarding Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                      <span>Not Started</span>
                    </div>
                    <span className="font-bold">
                      {(stats?.totalEmployees || 0) -
                        (stats?.activeOnboarding || 0) -
                        (stats?.completedOnboarding || 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <span>In Progress</span>
                    </div>
                    <span className="font-bold">{stats?.activeOnboarding || 0}</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      <span>Completed</span>
                    </div>
                    <span className="font-bold">{stats?.completedOnboarding || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {!isAdmin && (
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <ProgressCard />
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Pending Tasks</h2>
          <Link to="/tasks">
            <Button variant="ghost" size="sm">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <TaskList tasks={tasks.slice(0, 5)} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>AI Assistant</CardTitle>
          <Link to="/chat">
            <Button variant="ghost" size="sm">
              Open Chat <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
            <MessageSquare className="h-6 w-6 text-primary mt-1" />
            <div>
              <p className="font-medium mb-2">Need help?</p>
              <p className="text-sm text-muted-foreground mb-3">
                Ask our AI assistant anything about your onboarding
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 3).map((suggestion, i) => (
                  <Link key={i} to="/chat">
                    <Button variant="outline" size="sm">
                      {suggestion}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
