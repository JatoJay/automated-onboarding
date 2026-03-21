'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export function ProgressCard() {
  const { data: progress } = useQuery({
    queryKey: ['progress'],
    queryFn: () => api.getMyProgress(),
  });

  if (!progress) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>
                {progress.completed} of {progress.total} tasks completed
              </span>
              <span className="font-medium">{progress.percentage}%</span>
            </div>
            <Progress value={progress.percentage} />
          </div>

          <div className="grid grid-cols-4 gap-4 pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{progress.byStatus.pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-500">
                {progress.byStatus.inProgress}
              </p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">
                {progress.byStatus.completed}
              </p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">
                {progress.byStatus.blocked}
              </p>
              <p className="text-sm text-muted-foreground">Blocked</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
