import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

const phaseLabels: Record<string, string> = {
  first_week: 'First Week',
  first_month: 'Month 1',
  second_month: 'Month 2',
  third_month: 'Month 3',
  post_onboarding: 'Completed',
};

export function ProgressCard() {
  const { data: progress } = useQuery({
    queryKey: ['progress'],
    queryFn: () => api.getMyProgress(),
  });

  const { data: onboardingStatus } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: () => api.getOnboardingStatus(),
  });

  if (!progress) return null;

  const currentPhase = onboardingStatus?.phase || 'first_week';
  const daysInRole = onboardingStatus?.daysInRole || 0;

  const milestones = [
    { key: 'first_week', label: 'Week 1', day: 7 },
    { key: 'first_month', label: 'Day 30', day: 30 },
    { key: 'second_month', label: 'Day 60', day: 60 },
    { key: 'third_month', label: 'Day 90', day: 90 },
  ];

  const getMilestoneStatus = (milestoneDay: number) => {
    if (daysInRole >= milestoneDay) return 'completed';
    if (daysInRole >= milestoneDay - 7) return 'current';
    return 'upcoming';
  };

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Onboarding Progress</span>
          <span className="text-sm font-normal text-muted-foreground">
            Day {daysInRole} - {phaseLabels[currentPhase]}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>
                {progress.completed} of {progress.total} tasks completed
              </span>
              <span className="font-medium">{progress.percentage}%</span>
            </div>
            <Progress value={progress.percentage} className="h-3" />
          </div>

          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-3 h-0.5 bg-gray-200" />
            {milestones.map((milestone, index) => {
              const status = getMilestoneStatus(milestone.day);
              return (
                <div key={milestone.key} className="relative flex flex-col items-center z-10">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      status === 'completed'
                        ? 'bg-green-500 text-white'
                        : status === 'current'
                        ? 'bg-blue-500 text-white animate-pulse'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : status === 'current' ? (
                      <Clock className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-1 ${
                      status === 'current' ? 'font-semibold text-blue-600' : 'text-gray-500'
                    }`}
                  >
                    {milestone.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-4 gap-4 pt-2">
            <div className="text-center p-3 rounded-lg bg-gray-50">
              <p className="text-2xl font-bold">{progress.byStatus.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-50">
              <p className="text-2xl font-bold text-blue-600">
                {progress.byStatus.inProgress}
              </p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50">
              <p className="text-2xl font-bold text-green-600">
                {progress.byStatus.completed}
              </p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50">
              <p className="text-2xl font-bold text-red-600">
                {progress.byStatus.blocked}
              </p>
              <p className="text-xs text-muted-foreground">Blocked</p>
            </div>
          </div>

          {onboardingStatus?.milestones?.nextTask && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm font-medium text-blue-800">Next up:</p>
              <p className="text-sm text-blue-600">{onboardingStatus.milestones.nextTask.title}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
