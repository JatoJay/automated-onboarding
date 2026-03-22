import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Users, Crown, Building2 } from 'lucide-react';

interface DepartmentHead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Department {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  head?: DepartmentHead;
  parent?: { id: string; name: string };
  createdAt: string;
  _count: {
    employees: number;
    knowledgeDocuments: number;
    dataSources: number;
    children: number;
  };
}

interface Manager {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  role: string;
}

export default function DepartmentsPage() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHeadModal, setShowHeadModal] = useState<string | null>(null);
  const [newDept, setNewDept] = useState({ name: '', description: '', parentId: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadDepartments();
    loadManagers();
  }, []);

  const loadDepartments = async () => {
    try {
      const data = await api.getDepartments();
      setDepartments(data);
    } catch (error) {
      console.error('Failed to load departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadManagers = async () => {
    try {
      const employees = await api.getEmployees();
      const mgrs = employees
        .filter((e: any) => ['MANAGER', 'ADMIN', 'HR', 'ORG_ADMIN'].includes(e.user.role))
        .map((e: any) => ({
          id: e.user.id,
          firstName: e.user.firstName,
          lastName: e.user.lastName,
          email: e.user.email,
          jobTitle: e.jobTitle,
          role: e.user.role,
        }));
      setManagers(mgrs);
    } catch (error) {
      console.error('Failed to load managers:', error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDept.name.trim()) return;

    setCreating(true);
    try {
      await api.createDepartment({
        name: newDept.name,
        description: newDept.description || undefined,
        parentId: newDept.parentId || undefined,
      });
      setNewDept({ name: '', description: '', parentId: '' });
      setShowCreateModal(false);
      loadDepartments();
    } catch (error) {
      console.error('Failed to create department:', error);
      alert('Failed to create department');
    } finally {
      setCreating(false);
    }
  };

  const handleSetHead = async (departmentId: string, headId: string) => {
    try {
      await api.setDepartmentHead(departmentId, headId);
      setShowHeadModal(null);
      loadDepartments();
    } catch (error) {
      console.error('Failed to set department head:', error);
      alert('Failed to set department head');
    }
  };

  const handleRemoveHead = async (departmentId: string) => {
    if (!confirm('Remove department head?')) return;
    try {
      await api.removeDepartmentHead(departmentId);
      loadDepartments();
    } catch (error) {
      console.error('Failed to remove department head:', error);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteDepartment(id);
      loadDepartments();
    } catch (error) {
      console.error('Failed to delete department:', error);
      alert('Failed to delete department. Make sure there are no employees or documents assigned.');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">Loading departments...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="text-gray-600 mt-1">
            Manage departments, hierarchy, and department heads
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Department
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="bg-white rounded-lg shadow border p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-gray-400" />
                  {dept.name}
                </h3>
                {dept.parent && (
                  <p className="text-xs text-gray-500 mt-1">
                    Under: {dept.parent.name}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDelete(dept.id, dept.name)}
                className="text-gray-400 hover:text-red-600 text-sm"
              >
                Delete
              </button>
            </div>

            {dept.description && (
              <p className="text-gray-600 text-sm mb-3">{dept.description}</p>
            )}

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Department Head</span>
                </div>
                {dept.head ? (
                  <button
                    onClick={() => handleRemoveHead(dept.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={() => setShowHeadModal(dept.id)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Assign
                  </button>
                )}
              </div>
              {dept.head ? (
                <div className="mt-2 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                    {dept.head.firstName[0]}{dept.head.lastName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {dept.head.firstName} {dept.head.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{dept.head.email}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 mt-2">No head assigned</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 text-center border-t pt-4">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {dept._count.employees}
                </div>
                <div className="text-xs text-gray-500">Employees</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {dept._count.knowledgeDocuments}
                </div>
                <div className="text-xs text-gray-500">Documents</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {dept._count.children}
                </div>
                <div className="text-xs text-gray-500">Sub-depts</div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => navigate(`/admin/departments/${dept.id}`)}
                className="flex-1 text-center bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200 text-sm"
              >
                View Details
              </button>
              <button
                onClick={() => navigate(`/admin/knowledge?departmentId=${dept.id}`)}
                className="flex-1 text-center bg-blue-50 text-blue-700 px-3 py-2 rounded hover:bg-blue-100 text-sm"
              >
                Manage Docs
              </button>
            </div>
          </div>
        ))}

        {departments.length === 0 && (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-4">No departments yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-blue-600 hover:underline"
            >
              Create your first department
            </button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Department</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={newDept.name}
                  onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g., Engineering, Sales, HR"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Parent Department (optional)
                </label>
                <select
                  value={newDept.parentId}
                  onChange={(e) => setNewDept({ ...newDept, parentId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">None (top-level)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newDept.description}
                  onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Brief description of this department"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHeadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Assign Department Head</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Select a manager to lead this department:
              </p>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {managers.map((mgr) => (
                  <button
                    key={mgr.id}
                    onClick={() => handleSetHead(showHeadModal, mgr.id)}
                    className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                      {mgr.firstName[0]}{mgr.lastName[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{mgr.firstName} {mgr.lastName}</p>
                      <p className="text-sm text-gray-500">{mgr.email}</p>
                      {mgr.jobTitle && (
                        <p className="text-xs text-gray-400">{mgr.jobTitle}</p>
                      )}
                    </div>
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded">{mgr.role}</span>
                  </button>
                ))}
                {managers.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    No managers available. Promote an employee to manager role first.
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowHeadModal(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
