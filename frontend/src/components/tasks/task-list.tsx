import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Clock, AlertCircle, HelpCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useError } from '@/contexts/ErrorContext';

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
  const navigate = useNavigate();
  const { showError, showSuccess } = useError();
  const [helpTaskId, setHelpTaskId] = useState<string | null>(null);
  const [helpDescription, setHelpDescription] = useState('');
  const [submittingHelp, setSubmittingHelp] = useState(false);

  const handleRequestHelp = async (task: Task) => {
    if (!helpDescription.trim()) return;
    setSubmittingHelp(true);
    try {
      await api.createHelpRequest({
        category: 'TASK_BLOCKED',
        subject: `Help needed: ${task.title}`,
        description: helpDescription,
        taskId: task.id,
      });
      setHelpTaskId(null);
      setHelpDescription('');
      showSuccess('Your help request has been submitted. You will be notified when someone responds.', 'Help Request Submitted');
      navigate('/help');
    } catch (error: any) {
      console.error('Failed to create help request:', error);
      showError(error.message || 'Failed to submit help request. Please try again.');
    } finally {
      setSubmittingHelp(false);
    }
  };

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
                    {task.status !== 'COMPLETED' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setHelpTaskId(helpTaskId === task.id ? null : task.id)}
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      >
                        <HelpCircle className="h-4 w-4 mr-1" />
                        Help
                      </Button>
                    )}
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
              {helpTaskId === task.id && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800 mb-2">What do you need help with?</p>
                  <textarea
                    value={helpDescription}
                    onChange={(e) => setHelpDescription(e.target.value)}
                    placeholder="Describe your issue or what's blocking you..."
                    className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setHelpTaskId(null);
                        setHelpDescription('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleRequestHelp(task)}
                      disabled={submittingHelp || !helpDescription.trim()}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      {submittingHelp ? 'Submitting...' : 'Submit Help Request'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
