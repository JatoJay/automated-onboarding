'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';

interface TaskTemplate {
  id: string;
  title: string;
  description?: string;
  type: string;
  daysFromStart: number;
  order: number;
  isRequired: boolean;
}

interface OnboardingPlan {
  id: string;
  name: string;
  description?: string;
  departmentId?: string;
  isDefault: boolean;
  taskTemplates: TaskTemplate[];
}

const taskTypes = ['DOCUMENT', 'FORM', 'TRAINING', 'MEETING', 'APPROVAL'];

export default function WorkflowsPage() {
  const [plans, setPlans] = useState<OnboardingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', description: '' });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/admin/workflows/plans', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:4000/admin/workflows/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newPlan),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewPlan({ name: '', description: '' });
        loadPlans();
      }
    } catch (error) {
      console.error('Failed to create plan:', error);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Delete this onboarding plan?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:4000/admin/workflows/plans/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      loadPlans();
    } catch (error) {
      console.error('Failed to delete plan:', error);
    }
  };

  const handleAddTask = async (planId: string) => {
    const title = prompt('Task title:');
    if (!title) return;

    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:4000/admin/workflows/plans/${planId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          type: 'DOCUMENT',
          daysFromStart: 0,
          isRequired: true,
        }),
      });
      loadPlans();
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:4000/admin/workflows/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      loadPlans();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  if (loading) {
    return <div className="p-8 animate-pulse">Loading workflows...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Onboarding Workflows</h1>
          <p className="text-gray-600 mt-1">
            Configure onboarding plans and task templates
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Plan
        </Button>
      </div>

      <div className="space-y-4">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader
              className="cursor-pointer"
              onClick={() =>
                setExpandedPlan(expandedPlan === plan.id ? null : plan.id)
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {expandedPlan === plan.id ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {plan.name}
                      {plan.isDefault && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </CardTitle>
                    {plan.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {plan.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {plan.taskTemplates?.length || 0} tasks
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlan(plan.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {expandedPlan === plan.id && (
              <CardContent>
                <div className="space-y-2">
                  {plan.taskTemplates
                    ?.sort((a, b) => a.order - b.order)
                    .map((task, index) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <GripVertical className="h-4 w-4 text-gray-400" />
                        <span className="w-6 text-center text-sm text-gray-500">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <div className="font-medium">{task.title}</div>
                          <div className="text-sm text-gray-500">
                            <span className="px-2 py-0.5 bg-gray-200 rounded text-xs mr-2">
                              {task.type}
                            </span>
                            Day {task.daysFromStart}
                            {task.isRequired && ' (Required)'}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}

                  {(!plan.taskTemplates || plan.taskTemplates.length === 0) && (
                    <p className="text-center text-gray-500 py-4">
                      No tasks in this plan yet
                    </p>
                  )}

                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => handleAddTask(plan.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        {plans.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <p>No onboarding plans yet.</p>
              <Button
                variant="link"
                onClick={() => setShowCreateModal(true)}
                className="mt-2"
              >
                Create your first plan
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Onboarding Plan</h2>
            <form onSubmit={handleCreatePlan}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <Input
                    value={newPlan.name}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, name: e.target.value })
                    }
                    placeholder="e.g., Engineering Onboarding"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <Input
                    value={newPlan.description}
                    onChange={(e) =>
                      setNewPlan({ ...newPlan, description: e.target.value })
                    }
                    placeholder="Brief description of this plan"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Plan</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
