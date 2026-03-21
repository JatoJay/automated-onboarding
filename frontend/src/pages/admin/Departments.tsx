import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

interface Department {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  _count: {
    employees: number;
    knowledgeDocuments: number;
    dataSources: number;
  };
}

export default function DepartmentsPage() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadDepartments();
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDept.name.trim()) return;

    setCreating(true);
    try {
      await api.createDepartment(newDept);
      setNewDept({ name: '', description: '' });
      setShowCreateModal(false);
      loadDepartments();
    } catch (error) {
      console.error('Failed to create department:', error);
      alert('Failed to create department');
    } finally {
      setCreating(false);
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
            Manage departments and their knowledge bases
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
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">{dept.name}</h3>
              <button
                onClick={() => handleDelete(dept.id, dept.name)}
                className="text-gray-400 hover:text-red-600 text-sm"
              >
                Delete
              </button>
            </div>

            {dept.description && (
              <p className="text-gray-600 text-sm mb-4">{dept.description}</p>
            )}

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
                  {dept._count.dataSources}
                </div>
                <div className="text-xs text-gray-500">Sources</div>
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
    </div>
  );
}
