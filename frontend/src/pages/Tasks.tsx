import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { TaskList } from '@/components/tasks/task-list';
import { Button } from '@/components/ui/button';

const statuses = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'BLOCKED', label: 'Blocked' },
];

const TASKS_PER_PAGE = 10;

export default function TasksPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'HR';

  const { data: myTasks = [], isLoading: myTasksLoading } = useQuery({
    queryKey: ['myTasks', status],
    queryFn: () => api.getMyTasks(status || undefined),
    enabled: !isAdmin,
  });

  const { data: allTasksData, isLoading: allTasksLoading } = useQuery({
    queryKey: ['allTasks', status, page],
    queryFn: () => api.getAllTasks({
      status: status || undefined,
      page,
      limit: TASKS_PER_PAGE
    }),
    enabled: isAdmin,
  });

  const isLoading = isAdmin ? allTasksLoading : myTasksLoading;
  const tasks = isAdmin ? (allTasksData?.tasks || []) : myTasks;
  const pagination = allTasksData?.pagination;

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <p className="text-muted-foreground">
          {isAdmin ? 'Manage all employee tasks' : 'Manage your onboarding tasks'}
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {statuses.map((s) => (
          <Button
            key={s.value}
            variant={status === s.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleStatusChange(s.value)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <TaskList tasks={tasks} showEmployee={isAdmin} />

          {isAdmin && pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * TASKS_PER_PAGE + 1} to{' '}
                {Math.min(page * TASKS_PER_PAGE, pagination.total)} of {pagination.total} tasks
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
