

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  dueDate?: string;
  employee?: {
    id: string;
    user: { firstName: string; lastName: string; email: string };
  };
}

const statusIcons = {
  PENDING: Circle,
  IN_PROGRESS: Clock,
  COMPLETED: CheckCircle2,
  BLOCKED: AlertCircle,
};

const statusColors = {
  PENDING: 'text-muted-foreground',
  IN_PROGRESS: 'text-blue-500',
  COMPLETED: 'text-green-500',
  BLOCKED: 'text-red-500',
};

export function TaskList({ tasks, showEmployee = false, readOnly = false }: { tasks: Task[]; showEmployee?: boolean; readOnly?: boolean }) {
  const queryClient = useQueryClient();

  const updateTask = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateTask(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
  });

  const completeTask = useMutation({
    mutationFn: (id: string) => api.completeTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
  });

  if (!tasks.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No tasks found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const StatusIcon = statusIcons[task.status as keyof typeof statusIcons];
        const statusColor =
          statusColors[task.status as keyof typeof statusColors];

        return (
          <Card key={task.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <StatusIcon className={cn('h-5 w-5 mt-0.5', statusColor)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium">{task.title}</h3>
                    <span className="text-xs px-2 py-0.5 bg-secondary rounded">
                      {task.type}
                    </span>
                    {showEmployee && task.employee && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                        {task.employee.user.firstName} {task.employee.user.lastName}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {task.description}
                    </p>
                  )}
                  {task.dueDate && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {!readOnly && (
                  <div className="flex gap-2">
                    {task.status === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateTask.mutate({
                            id: task.id,
                            status: 'IN_PROGRESS',
                          })
                        }
                      >
                        Start
                      </Button>
                    )}
                    {task.status === 'IN_PROGRESS' && (
                      <Button
                        size="sm"
                        onClick={() => completeTask.mutate(task.id)}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
