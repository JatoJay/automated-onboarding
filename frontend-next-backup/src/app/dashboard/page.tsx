'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { ProgressCard } from '@/components/dashboard/progress-card';
import { TaskList } from '@/components/tasks/task-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', 'pending'],
    queryFn: () => api.getMyTasks('PENDING'),
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ['chatSuggestions'],
    queryFn: () => api.getChatSuggestions(),
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Welcome, {user?.firstName}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s your onboarding progress
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ProgressCard />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>AI Assistant</CardTitle>
            <Link href="/chat">
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
                  {suggestions.slice(0, 2).map((suggestion, i) => (
                    <Link key={i} href="/chat">
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

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Pending Tasks</h2>
          <Link href="/tasks">
            <Button variant="ghost" size="sm">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <TaskList tasks={tasks.slice(0, 5)} />
      </div>
    </div>
  );
}
