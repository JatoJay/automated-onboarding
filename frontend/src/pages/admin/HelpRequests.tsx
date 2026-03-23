import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { HelpRequest, HelpRequestReply } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Inbox,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Send,
  ArrowLeft,
  Loader2,
  User,
} from 'lucide-react';

const categories = [
  { value: 'TASK_BLOCKED', label: 'Task Blocked' },
  { value: 'QUESTION', label: 'Question' },
  { value: 'TECHNICAL_ISSUE', label: 'Technical Issue' },
  { value: 'ACCESS_REQUEST', label: 'Access Request' },
  { value: 'OTHER', label: 'Other' },
];

const statuses = [
  { value: 'OPEN', label: 'Open', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'RESOLVED', label: 'Resolved', color: 'bg-green-100 text-green-800' },
  { value: 'CLOSED', label: 'Closed', color: 'bg-gray-100 text-gray-800' },
];

const statusColors: Record<string, string> = {
  OPEN: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

export default function AdminHelpRequestsPage() {
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [stats, setStats] = useState<{ open: number; inProgress: number; resolvedToday: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter, categoryFilter]);

  const loadData = async () => {
    try {
      const [requestsData, statsData] = await Promise.all([
        api.getAdminHelpRequests({ status: statusFilter || undefined, category: categoryFilter || undefined }),
        api.getAdminHelpRequestStats(),
      ]);
      setRequests(requestsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load help requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const openRequest = async (request: HelpRequest) => {
    try {
      const full = await api.getAdminHelpRequest(request.id);
      setSelectedRequest(full);
    } catch (error) {
      console.error('Failed to load request:', error);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedRequest) return;
    setUpdating(true);
    try {
      const updated = await api.updateHelpRequest(selectedRequest.id, { status });
      setSelectedRequest({ ...selectedRequest, ...updated });
      loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedRequest) return;
    const resolution = prompt('Enter resolution summary (optional):');
    setUpdating(true);
    try {
      const updated = await api.updateHelpRequest(selectedRequest.id, {
        status: 'RESOLVED',
        resolution: resolution || undefined,
      });
      setSelectedRequest({ ...selectedRequest, ...updated, status: 'RESOLVED', resolution: resolution || undefined });
      loadData();
    } catch (error) {
      console.error('Failed to resolve:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedRequest || !replyMessage.trim()) return;

    setSendingReply(true);
    try {
      const reply = await api.addAdminHelpRequestReply(selectedRequest.id, replyMessage);
      setSelectedRequest({
        ...selectedRequest,
        replies: [...(selectedRequest.replies || []), reply],
      });
      setReplyMessage('');
      loadData();
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setSendingReply(false);
    }
  };

  if (loading) {
    return <div className="p-8 animate-pulse">Loading...</div>;
  }

  if (selectedRequest) {
    const emp = selectedRequest.employee;
    const empName = emp?.user ? `${emp.user.firstName} ${emp.user.lastName}` : 'Unknown';

    return (
      <div className="p-8 max-w-4xl mx-auto">
        <button onClick={() => setSelectedRequest(null)} className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back to Inbox
        </button>

        <div className="bg-white rounded-lg shadow border">
          <div className="p-6 border-b">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold">{selectedRequest.subject}</h1>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                  <span className={`px-2 py-0.5 rounded text-xs ${statusColors[selectedRequest.status]}`}>
                    {selectedRequest.status.replace('_', ' ')}
                  </span>
                  <span>{categories.find(c => c.value === selectedRequest.category)?.label}</span>
                  <span>{new Date(selectedRequest.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedRequest.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updating}
                  className="px-3 py-1.5 border rounded text-sm"
                >
                  {statuses.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                {selectedRequest.status !== 'RESOLVED' && selectedRequest.status !== 'CLOSED' && (
                  <Button size="sm" onClick={handleResolve} disabled={updating}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Resolve
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded flex items-center gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{empName}</span>
              </div>
              {emp?.user?.email && <span className="text-gray-500">{emp.user.email}</span>}
              {emp?.department && <span className="text-gray-500">{emp.department.name}</span>}
            </div>

            {selectedRequest.task && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <span className="font-medium">Related task:</span> {selectedRequest.task.title}
                <span className="ml-2 text-xs bg-gray-200 px-1.5 py-0.5 rounded">{selectedRequest.task.type}</span>
                {selectedRequest.task.status && (
                  <span className="ml-2 text-xs">{selectedRequest.task.status}</span>
                )}
              </div>
            )}
          </div>

          <div className="p-6 border-b">
            <h3 className="font-medium mb-2 text-gray-500 text-sm">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{selectedRequest.description}</p>
          </div>

          <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
            <h3 className="font-medium text-gray-500 text-sm">Conversation</h3>
            {selectedRequest.replies?.map((reply) => (
              <div key={reply.id} className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                  reply.user.role === 'HR' || reply.user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {reply.user.firstName[0]}{reply.user.lastName[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{reply.user.firstName} {reply.user.lastName}</span>
                    {(reply.user.role === 'HR' || reply.user.role === 'ADMIN') && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">HR</span>
                    )}
                    <span className="text-xs text-gray-500">{new Date(reply.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-gray-700 mt-1">{reply.message}</p>
                </div>
              </div>
            ))}

            {(!selectedRequest.replies || selectedRequest.replies.length === 0) && (
              <p className="text-center text-gray-500 py-4">No replies yet</p>
            )}
          </div>

          {selectedRequest.status !== 'CLOSED' && (
            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-2">
                <Input
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Reply to employee..."
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendReply()}
                />
                <Button onClick={handleSendReply} disabled={sendingReply || !replyMessage.trim()}>
                  {sendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {selectedRequest.resolution && (
            <div className="p-4 border-t bg-green-50">
              <h3 className="font-medium text-green-800 mb-1">Resolution</h3>
              <p className="text-green-700">{selectedRequest.resolution}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Help Requests</h1>
        <p className="text-gray-600 mt-1">Manage employee support requests</p>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('OPEN')}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{stats.open}</p>
                  <p className="text-sm text-gray-500">Open</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('IN_PROGRESS')}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                  <p className="text-sm text-gray-500">In Progress</p>
                </div>
                <Clock className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.resolvedToday}</p>
                  <p className="text-sm text-gray-500">Resolved Today</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md" onClick={() => setStatusFilter('')}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-gray-500">Total</p>
                </div>
                <Inbox className="h-8 w-8 text-gray-200" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-4 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">All Statuses</option>
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {requests.map((request) => {
          const emp = request.employee;
          const empName = emp?.user ? `${emp.user.firstName} ${emp.user.lastName}` : 'Unknown';

          return (
            <div
              key={request.id}
              onClick={() => openRequest(request)}
              className="bg-white rounded-lg shadow border p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs ${statusColors[request.status]}`}>
                      {request.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {categories.find(c => c.value === request.category)?.label}
                    </span>
                  </div>
                  <h3 className="font-medium">{request.subject}</h3>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                    <span className="font-medium text-gray-700">{empName}</span>
                    {emp?.department && <span>{emp.department.name}</span>}
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500 ml-4">
                  <div>{new Date(request.createdAt).toLocaleDateString()}</div>
                  {(request._count?.replies ?? 0) > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-blue-600">
                      <MessageSquare className="h-3 w-3" />
                      {request._count?.replies}
                    </div>
                  )}
                </div>
              </div>
              {request.task && (
                <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded inline-block">
                  Task: {request.task.title}
                </div>
              )}
            </div>
          );
        })}

        {requests.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Inbox className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No help requests found</p>
          </div>
        )}
      </div>
    </div>
  );
}
