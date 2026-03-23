
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Mail, UserPlus, Users, Copy, Check, Building2 } from 'lucide-react';

interface Invite {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  token: string;
  startDate: string;
  expiresAt: string;
  usedAt: string | null;
  department: { id: string; name: string };
}

interface Employee {
  id: string;
  jobTitle: string;
  startDate: string;
  onboardingStatus: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  user?: { id: string; email: string; firstName: string; lastName: string; role: string };
  department: { id: string; name: string };
  manager?: { id: string; firstName: string; lastName: string; email: string };
  departmentAccess: Array<{ department: { id: string; name: string } }>;
  _count?: { tasks: number };
}

interface Department {
  id: string;
  name: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState<Employee | null>(null);
  const [selectedAccess, setSelectedAccess] = useState<string[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'employees' | 'invites'>('employees');

  const [newInvite, setNewInvite] = useState({
    email: '',
    firstName: '',
    lastName: '',
    jobTitle: '',
    departmentId: '',
    startDate: new Date().toISOString().split('T')[0],
  });

  const [newDirectoryEntry, setNewDirectoryEntry] = useState({
    firstName: '',
    lastName: '',
    email: '',
    departmentId: '',
    jobTitle: '',
    startDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, [filterDept]);

  const loadData = async () => {
    try {
      const [emps, depts, inviteList] = await Promise.all([
        api.getEmployees({ departmentId: filterDept || undefined }),
        api.getDepartments(),
        api.listInvites(),
      ]);
      setEmployees(emps);
      setDepartments(depts);
      setInvites(inviteList);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createInvite(newInvite);
      setShowInviteModal(false);
      setNewInvite({
        email: '',
        firstName: '',
        lastName: '',
        jobTitle: '',
        departmentId: '',
        startDate: new Date().toISOString().split('T')[0],
      });
      loadData();
    } catch (error) {
      console.error('Failed to create invite:', error);
      alert('Failed to send invite');
    }
  };

  const handleRevokeInvite = async (id: string, name: string) => {
    if (!confirm(`Revoke invite for "${name}"?`)) return;
    try {
      await api.revokeInvite(id);
      loadData();
    } catch (error) {
      console.error('Failed to revoke invite:', error);
    }
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/register?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleCreateDirectoryEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createEmployee(newDirectoryEntry);
      setShowCreateModal(false);
      setNewDirectoryEntry({
        firstName: '',
        lastName: '',
        email: '',
        departmentId: '',
        jobTitle: '',
        startDate: new Date().toISOString().split('T')[0],
      });
      loadData();
    } catch (error) {
      console.error('Failed to create directory entry:', error);
      alert('Failed to create directory entry');
    }
  };

  const openAccessModal = (emp: Employee) => {
    setShowAccessModal(emp);
    setSelectedAccess([
      emp.department.id,
      ...emp.departmentAccess.map((a) => a.department.id),
    ]);
  };

  const handleUpdateAccess = async () => {
    if (!showAccessModal) return;
    try {
      await api.updateEmployeeDepartmentAccess(showAccessModal.id, selectedAccess);
      setShowAccessModal(null);
      loadData();
    } catch (error) {
      console.error('Failed to update access:', error);
      alert('Failed to update department access');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete employee "${name}"? This cannot be undone.`)) return;
    try {
      await api.deleteEmployee(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete employee');
    }
  };

  const getEmployeeName = (emp: Employee) => {
    if (emp.user) {
      return `${emp.user.firstName} ${emp.user.lastName}`;
    }
    return `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown';
  };

  const getEmployeeEmail = (emp: Employee) => {
    return emp.user?.email || emp.email || '';
  };

  const isDirectoryOnly = (emp: Employee) => !emp.user;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const statusColors: Record<string, string> = {
    NOT_STARTED: 'bg-gray-100 text-gray-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-green-100 text-green-700',
  };

  const roleColors: Record<string, string> = {
    EMPLOYEE: 'bg-gray-100 text-gray-700',
    MANAGER: 'bg-amber-100 text-amber-700',
    HR: 'bg-pink-100 text-pink-700',
    ADMIN: 'bg-red-100 text-red-700',
  };

  if (loading) {
    return <div className="p-8 animate-pulse">Loading employees...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Employee Management</h1>
          <p className="text-gray-600 mt-1">
            Manage employees and their department access
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Invite New Employee
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
          >
            <Building2 className="h-4 w-4" />
            Add Directory Entry
          </button>
        </div>
      </div>

      <div className="mb-6 flex gap-4 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              activeTab === 'employees'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users className="h-4 w-4" />
            Employees ({employees.length})
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              activeTab === 'invites'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Mail className="h-4 w-4" />
            Pending Invites ({invites.filter(i => !i.usedAt).length})
          </button>
        </div>
        {activeTab === 'employees' && (
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium">Filter by Department:</label>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {activeTab === 'employees' && (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                Employee
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                Type
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                Department
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                Job Title
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                Start Date
              </th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                Status
              </th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium">{getEmployeeName(emp)}</div>
                  <div className="text-sm text-gray-500">{getEmployeeEmail(emp)}</div>
                </td>
                <td className="px-6 py-4">
                  {isDirectoryOnly(emp) ? (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                      Directory
                    </span>
                  ) : (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      roleColors[emp.user?.role || 'EMPLOYEE'] || 'bg-gray-100'
                    }`}>
                      {emp.user?.role || 'EMPLOYEE'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                    {emp.department.name}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">{emp.jobTitle}</td>
                <td className="px-6 py-4 text-sm">{formatDate(emp.startDate)}</td>
                <td className="px-6 py-4">
                  {isDirectoryOnly(emp) ? (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">
                      N/A
                    </span>
                  ) : (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      statusColors[emp.onboardingStatus] || 'bg-gray-100'
                    }`}>
                      {emp.onboardingStatus.replace('_', ' ')}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {!isDirectoryOnly(emp) && (
                    <button
                      onClick={() => openAccessModal(emp)}
                      className="text-blue-600 hover:text-blue-800 mr-3 text-sm"
                    >
                      Manage Access
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(emp.id, getEmployeeName(emp))}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No employees found. Add your first employee to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'invites' && (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                  Invitee
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                  Job Title
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                  Department
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                  Start Date
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                  Invite Link
                </th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invites.map((invite) => (
                <tr key={invite.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium">
                      {invite.firstName} {invite.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{invite.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">{invite.jobTitle}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                      {invite.department?.name || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{formatDate(invite.startDate)}</td>
                  <td className="px-6 py-4">
                    {invite.usedAt ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                        Registered
                      </span>
                    ) : new Date(invite.expiresAt) < new Date() ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                        Expired
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {!invite.usedAt && new Date(invite.expiresAt) >= new Date() && (
                      <button
                        onClick={() => copyInviteLink(invite.token)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        {copiedToken === invite.token ? (
                          <>
                            <Check className="h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy Link
                          </>
                        )}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!invite.usedAt && (
                      <button
                        onClick={() =>
                          handleRevokeInvite(
                            invite.id,
                            `${invite.firstName} ${invite.lastName}`
                          )
                        }
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {invites.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No invites sent yet. Use "Invite New Employee" to send invites.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-2">Add Directory Entry</h2>
            <p className="text-gray-600 text-sm mb-4">
              Add a manager or department head to the org chart. They won't have login access.
            </p>
            <form onSubmit={handleCreateDirectoryEntry}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={newDirectoryEntry.firstName}
                      onChange={(e) =>
                        setNewDirectoryEntry({ ...newDirectoryEntry, firstName: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="John"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={newDirectoryEntry.lastName}
                      onChange={(e) =>
                        setNewDirectoryEntry({ ...newDirectoryEntry, lastName: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={newDirectoryEntry.email}
                    onChange={(e) =>
                      setNewDirectoryEntry({ ...newDirectoryEntry, email: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="john.doe@company.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Department
                  </label>
                  <select
                    value={newDirectoryEntry.departmentId}
                    onChange={(e) =>
                      setNewDirectoryEntry({ ...newDirectoryEntry, departmentId: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Select department...</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Job Title</label>
                  <input
                    type="text"
                    value={newDirectoryEntry.jobTitle}
                    onChange={(e) =>
                      setNewDirectoryEntry({ ...newDirectoryEntry, jobTitle: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., Engineering Manager"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newDirectoryEntry.startDate}
                    onChange={(e) =>
                      setNewDirectoryEntry({ ...newDirectoryEntry, startDate: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  Add Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Invite New Employee</h2>
            <form onSubmit={handleInvite}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={newInvite.firstName}
                      onChange={(e) =>
                        setNewInvite({ ...newInvite, firstName: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="John"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={newInvite.lastName}
                      onChange={(e) =>
                        setNewInvite({ ...newInvite, lastName: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={newInvite.email}
                    onChange={(e) =>
                      setNewInvite({ ...newInvite, email: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="john.doe@company.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Department
                  </label>
                  <select
                    value={newInvite.departmentId}
                    onChange={(e) =>
                      setNewInvite({ ...newInvite, departmentId: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Select department...</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Job Title</label>
                  <input
                    type="text"
                    value={newInvite.jobTitle}
                    onChange={(e) =>
                      setNewInvite({ ...newInvite, jobTitle: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., Software Engineer"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newInvite.startDate}
                    onChange={(e) =>
                      setNewInvite({ ...newInvite, startDate: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-4">
                An invite link will be generated. You can copy and share this link
                with the new employee to complete their registration.
              </p>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Create Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-2">Manage Department Access</h2>
            <p className="text-gray-600 mb-4">
              {getEmployeeName(showAccessModal)}
            </p>

            <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
              {departments.map((dept) => {
                const isPrimary = dept.id === showAccessModal.department.id;
                return (
                  <label
                    key={dept.id}
                    className={`flex items-center gap-2 p-2 rounded ${
                      isPrimary ? 'bg-purple-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAccess.includes(dept.id)}
                      disabled={isPrimary}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAccess([...selectedAccess, dept.id]);
                        } else {
                          setSelectedAccess(
                            selectedAccess.filter((id) => id !== dept.id)
                          );
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm flex-1">{dept.name}</span>
                    {isPrimary && (
                      <span className="text-xs text-purple-600 font-medium">
                        Primary
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            <p className="text-sm text-gray-500 mt-3">
              Employee will have access to documents from selected departments plus
              all organization-wide documents.
            </p>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowAccessModal(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAccess}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Save Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
