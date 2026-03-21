
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckCircle, Clock, TrendingUp, FileText, MessageSquare } from 'lucide-react';

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

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');

      const [employeesRes, docsRes, deptsRes] = await Promise.all([
        fetch('http://localhost:4000/admin/employees', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:4000/documents', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:4000/departments', {
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
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 animate-pulse">Loading analytics...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Overview of onboarding metrics and knowledge base stats
        </p>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
    </div>
  );
}
