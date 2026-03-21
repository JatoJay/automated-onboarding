'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Employee {
  id: string;
  jobTitle: string;
  startDate: string;
  onboardingStatus: string;
  user: { id: string; email: string; firstName: string; lastName: string; role: string };
  department: { id: string; name: string };
  manager?: { id: string; firstName: string; lastName: string; email: string };
  departmentAccess: Array<{ department: { id: string; name: string } }>;
  _count: { tasks: number };
}

interface Department {
  id: string;
  name: string;
}

interface AvailableUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState<Employee | null>(null);
  const [selectedAccess, setSelectedAccess] = useState<string[]>([]);

  const [newEmployee, setNewEmployee] = useState({
    userId: '',
    departmentId: '',
    jobTitle: '',
    startDate: new Date().toISOString().split('T')[0],
    accessibleDepartmentIds: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, [filterDept]);

  const loadData = async () => {
    try {
      const [emps, depts] = await Promise.all([
        api.getEmployees({ departmentId: filterDept || undefined }),
        api.getDepartments(),
      ]);
      setEmployees(emps);
      setDepartments(depts);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const users = await api.getAvailableUsers();
      setAvailableUsers(users);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createEmployee(newEmployee);
      setShowCreateModal(false);
      setNewEmployee({
        userId: '',
        departmentId: '',
        jobTitle: '',
        startDate: new Date().toISOString().split('T')[0],
        accessibleDepartmentIds: [],
      });
      loadData();
    } catch (error) {
      console.error('Failed to create employee:', error);
      alert('Failed to create employee');
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
        <button
          onClick={() => {
            loadAvailableUsers();
            setShowCreateModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Employee
        </button>
      </div>

      <div className="mb-6 flex gap-4 items-center">
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

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                Employee
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
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                Access
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
                  <div className="font-medium">
                    {emp.user.firstName} {emp.user.lastName}
                  </div>
                  <div className="text-sm text-gray-500">{emp.user.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                    {emp.department.name}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">{emp.jobTitle}</td>
                <td className="px-6 py-4 text-sm">{formatDate(emp.startDate)}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      statusColors[emp.onboardingStatus] || 'bg-gray-100'
                    }`}
                  >
                    {emp.onboardingStatus.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => openAccessModal(emp)}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {1 + emp.departmentAccess.length} dept(s)
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => openAccessModal(emp)}
                    className="text-blue-600 hover:text-blue-800 mr-3 text-sm"
                  >
                    Manage Access
                  </button>
                  <button
                    onClick={() =>
                      handleDelete(
                        emp.id,
                        `${emp.user.firstName} ${emp.user.lastName}`
                      )
                    }
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

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Add New Employee</h2>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Select User
                  </label>
                  <select
                    value={newEmployee.userId}
                    onChange={(e) =>
                      setNewEmployee({ ...newEmployee, userId: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Choose a registered user...</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </option>
                    ))}
                  </select>
                  {availableUsers.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      No available users. Users must register first.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Primary Department
                  </label>
                  <select
                    value={newEmployee.departmentId}
                    onChange={(e) =>
                      setNewEmployee({ ...newEmployee, departmentId: e.target.value })
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
                    value={newEmployee.jobTitle}
                    onChange={(e) =>
                      setNewEmployee({ ...newEmployee, jobTitle: e.target.value })
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
                    value={newEmployee.startDate}
                    onChange={(e) =>
                      setNewEmployee({ ...newEmployee, startDate: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Additional Department Access
                  </label>
                  <div className="border rounded-lg p-3 max-h-32 overflow-y-auto space-y-2">
                    {departments
                      .filter((d) => d.id !== newEmployee.departmentId)
                      .map((dept) => (
                        <label key={dept.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={newEmployee.accessibleDepartmentIds.includes(
                              dept.id
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewEmployee({
                                  ...newEmployee,
                                  accessibleDepartmentIds: [
                                    ...newEmployee.accessibleDepartmentIds,
                                    dept.id,
                                  ],
                                });
                              } else {
                                setNewEmployee({
                                  ...newEmployee,
                                  accessibleDepartmentIds:
                                    newEmployee.accessibleDepartmentIds.filter(
                                      (id) => id !== dept.id
                                    ),
                                });
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{dept.name}</span>
                        </label>
                      ))}
                    {departments.length <= 1 && (
                      <p className="text-sm text-gray-500">
                        Create more departments to grant cross-department access.
                      </p>
                    )}
                  </div>
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
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Add Employee
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
              {showAccessModal.user.firstName} {showAccessModal.user.lastName}
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
