import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { HelpRequest, HelpRequestReply } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  HelpCircle,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Send,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

const categories = [
  { value: 'TASK_BLOCKED', label: 'Task Blocked', icon: AlertCircle },
  { value: 'QUESTION', label: 'Question', icon: HelpCircle },
  { value: 'TECHNICAL_ISSUE', label: 'Technical Issue', icon: AlertCircle },
  { value: 'ACCESS_REQUEST', label: 'Access Request', icon: AlertCircle },
  { value: 'OTHER', label: 'Other', icon: HelpCircle },
];

const statusColors: Record<string, string> = {
  OPEN: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

export default function HelpPage() {
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(null);
  const [newRequest, setNewRequest] = useState({ category: 'QUESTION', subject: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await api.getMyHelpRequests();
      setRequests(data);
    } catch (error) {
      console.error('Failed to load help requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.subject.trim() || !newRequest.description.trim()) return;

    setSubmitting(true);
    try {
      await api.createHelpRequest(newRequest);
      setShowCreate(false);
      setNewRequest({ category: 'QUESTION', subject: '', description: '' });
      loadRequests();
    } catch (error) {
      console.error('Failed to create help request:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedRequest || !replyMessage.trim()) return;

    setSendingReply(true);
    try {
      const reply = await api.addHelpRequestReply(selectedRequest.id, replyMessage);
      setSelectedRequest({
        ...selectedRequest,
        replies: [...(selectedRequest.replies || []), reply],
      });
      setReplyMessage('');
      loadRequests();
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setSendingReply(false);
    }
  };

  const openRequest = async (request: HelpRequest) => {
    try {
      const full = await api.getHelpRequest(request.id);
      setSelectedRequest(full);
    } catch (error) {
      console.error('Failed to load request:', error);
    }
  };

  if (loading) {
    return <div className="p-8 animate-pulse">Loading...</div>;
  }

  if (selectedRequest) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <button onClick={() => setSelectedRequest(null)} className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back to Requests
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
            </div>
            {selectedRequest.task && (
              <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                Related task: <span className="font-medium">{selectedRequest.task.title}</span>
              </div>
            )}
          </div>

          <div className="p-6 border-b">
            <p className="text-gray-700 whitespace-pre-wrap">{selectedRequest.description}</p>
          </div>

          <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
            {selectedRequest.replies?.map((reply) => (
              <div key={reply.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-medium flex-shrink-0">
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
                  placeholder="Add a reply..."
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

  if (showCreate) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <button onClick={() => setShowCreate(false)} className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="bg-white rounded-lg shadow border p-6">
          <h1 className="text-xl font-bold mb-6">Request Help</h1>

          <form onSubmit={handleCreate}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={newRequest.category}
                  onChange={(e) => setNewRequest({ ...newRequest, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Subject *</label>
                <Input
                  value={newRequest.subject}
                  onChange={(e) => setNewRequest({ ...newRequest, subject: e.target.value })}
                  placeholder="Brief summary of your issue"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description *</label>
                <textarea
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                  placeholder="Please describe your issue in detail..."
                  rows={5}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const openRequests = requests.filter(r => r.status === 'OPEN' || r.status === 'IN_PROGRESS');
  const closedRequests = requests.filter(r => r.status === 'RESOLVED' || r.status === 'CLOSED');

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Help & Support</h1>
          <p className="text-gray-600 mt-1">Get help with your onboarding tasks</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Request Help
        </Button>
      </div>

      {openRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Active Requests ({openRequests.length})
          </h2>
          <div className="space-y-3">
            {openRequests.map((request) => (
              <RequestCard key={request.id} request={request} onClick={() => openRequest(request)} />
            ))}
          </div>
        </div>
      )}

      {closedRequests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Resolved ({closedRequests.length})
          </h2>
          <div className="space-y-3">
            {closedRequests.map((request) => (
              <RequestCard key={request.id} request={request} onClick={() => openRequest(request)} />
            ))}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <HelpCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No help requests yet.</p>
          <Button variant="link" onClick={() => setShowCreate(true)} className="mt-2">
            Create your first request
          </Button>
        </div>
      )}
    </div>
  );
}

function RequestCard({ request, onClick }: { request: HelpRequest; onClick: () => void }) {
  return (
    <div onClick={onClick} className="bg-white rounded-lg shadow border p-4 cursor-pointer hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded text-xs ${statusColors[request.status]}`}>
              {request.status.replace('_', ' ')}
            </span>
            <span className="text-xs text-gray-500">
              {categories.find(c => c.value === request.category)?.label}
            </span>
          </div>
          <h3 className="font-medium">{request.subject}</h3>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{request.description}</p>
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
        <div className="mt-2 text-xs text-gray-500">
          Task: {request.task.title}
        </div>
      )}
    </div>
  );
}
