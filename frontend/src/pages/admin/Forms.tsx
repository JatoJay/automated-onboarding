import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Form, FormField } from '@/lib/api';
import {
  Plus,
  FileText,
  Trash2,
  Edit,
  Eye,
  Download,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Globe,
  Building2,
  CheckCircle,
  Clock,
  Archive,
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
}

const FIELD_TYPES = [
  { value: 'TEXT', label: 'Short Text' },
  { value: 'TEXTAREA', label: 'Long Text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DATE', label: 'Date' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'SELECT', label: 'Dropdown' },
  { value: 'MULTI_SELECT', label: 'Multi-Select' },
  { value: 'CHECKBOX', label: 'Checkbox' },
];

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [viewingSubmissions, setViewingSubmissions] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');

  const [newForm, setNewForm] = useState({
    name: '',
    description: '',
    isOrgWide: true,
    departmentId: '',
  });

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    try {
      const [formsData, deptsData] = await Promise.all([
        api.getForms({ status: filterStatus || undefined }),
        api.getDepartments(),
      ]);
      setForms(formsData);
      setDepartments(deptsData);
    } catch (error) {
      console.error('Failed to load forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createForm({
        name: newForm.name,
        description: newForm.description || undefined,
        isOrgWide: newForm.isOrgWide,
        departmentId: newForm.isOrgWide ? undefined : newForm.departmentId,
      });
      setShowCreateModal(false);
      setNewForm({ name: '', description: '', isOrgWide: true, departmentId: '' });
      loadData();
    } catch (error) {
      console.error('Failed to create form:', error);
      alert('Failed to create form');
    }
  };

  const handleDeleteForm = async (id: string, name: string) => {
    if (!confirm(`Delete form "${name}"? This will also delete all submissions.`)) return;
    try {
      await api.deleteForm(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete form:', error);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.updateForm(id, { status });
      loadData();
    } catch (error) {
      console.error('Failed to update form status:', error);
    }
  };

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    ACTIVE: 'bg-green-100 text-green-700',
    ARCHIVED: 'bg-amber-100 text-amber-700',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    DRAFT: <Clock className="h-3 w-3" />,
    ACTIVE: <CheckCircle className="h-3 w-3" />,
    ARCHIVED: <Archive className="h-3 w-3" />,
  };

  if (loading) {
    return <div className="p-8 animate-pulse">Loading forms...</div>;
  }

  if (editingForm) {
    return (
      <FormBuilder
        form={editingForm}
        departments={departments}
        onSave={() => {
          setEditingForm(null);
          loadData();
        }}
        onCancel={() => setEditingForm(null)}
      />
    );
  }

  if (viewingSubmissions) {
    return (
      <SubmissionsViewer
        formId={viewingSubmissions}
        onBack={() => setViewingSubmissions(null)}
      />
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Form Builder</h1>
          <p className="text-gray-600 mt-1">Create and manage custom forms for employees</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Form
        </button>
      </div>

      <div className="mb-6 flex gap-4 items-center">
        <label className="text-sm font-medium">Filter by Status:</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {forms.map((form) => (
          <div
            key={form.id}
            className="bg-white rounded-lg shadow border p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">{form.name}</h3>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${statusColors[form.status]}`}
              >
                {statusIcons[form.status]}
                {form.status}
              </span>
            </div>

            {form.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{form.description}</p>
            )}

            <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
              {form.isOrgWide ? (
                <span className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  Organization-wide
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {form.department?.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <span>{form.fields.length} fields</span>
              <span>{form._count.submissions} submissions</span>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t">
              <button
                onClick={() => setEditingForm(form)}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => setViewingSubmissions(form.id)}
                className="flex items-center gap-1 text-green-600 hover:text-green-800 text-sm"
              >
                <Eye className="h-4 w-4" />
                Submissions
              </button>
              <div className="flex-1" />
              <select
                value={form.status}
                onChange={(e) => handleStatusChange(form.id, e.target.value)}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
              <button
                onClick={() => handleDeleteForm(form.id, form.name)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {forms.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No forms yet. Create your first form to get started.
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New Form</h2>
            <form onSubmit={handleCreateForm}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Form Name</label>
                  <input
                    type="text"
                    value={newForm.name}
                    onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., Employee Bio Data"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={newForm.description}
                    onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={3}
                    placeholder="Brief description of the form"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Scope</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={newForm.isOrgWide}
                        onChange={() => setNewForm({ ...newForm, isOrgWide: true })}
                      />
                      <Globe className="h-4 w-4 text-blue-600" />
                      Organization-wide (all employees)
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={!newForm.isOrgWide}
                        onChange={() => setNewForm({ ...newForm, isOrgWide: false })}
                      />
                      <Building2 className="h-4 w-4 text-purple-600" />
                      Department-specific
                    </label>
                  </div>
                </div>

                {!newForm.isOrgWide && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Department</label>
                    <select
                      value={newForm.departmentId}
                      onChange={(e) => setNewForm({ ...newForm, departmentId: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      required={!newForm.isOrgWide}
                    >
                      <option value="">Select department...</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
                  Create Form
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FormBuilder({
  form,
  departments,
  onSave,
  onCancel,
}: {
  form: Form;
  departments: Department[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<FormField[]>(form.fields);
  const [formData, setFormData] = useState({
    name: form.name,
    description: form.description || '',
    isOrgWide: form.isOrgWide,
    departmentId: form.departmentId || '',
  });
  const [showAddField, setShowAddField] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [saving, setSaving] = useState(false);

  const [newField, setNewField] = useState({
    label: '',
    type: 'TEXT',
    placeholder: '',
    helpText: '',
    required: false,
    options: '',
  });

  const handleSaveForm = async () => {
    setSaving(true);
    try {
      await api.updateForm(form.id, {
        name: formData.name,
        description: formData.description || undefined,
        isOrgWide: formData.isOrgWide,
        departmentId: formData.isOrgWide ? undefined : formData.departmentId,
      });
      onSave();
    } catch (error) {
      console.error('Failed to save form:', error);
      alert('Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const field = await api.addFormField(form.id, {
        label: newField.label,
        type: newField.type,
        placeholder: newField.placeholder || undefined,
        helpText: newField.helpText || undefined,
        required: newField.required,
        options: ['SELECT', 'MULTI_SELECT'].includes(newField.type)
          ? newField.options.split('\n').filter(Boolean)
          : undefined,
        order: fields.length,
      });
      setFields([...fields, field]);
      setShowAddField(false);
      setNewField({
        label: '',
        type: 'TEXT',
        placeholder: '',
        helpText: '',
        required: false,
        options: '',
      });
    } catch (error) {
      console.error('Failed to add field:', error);
    }
  };

  const handleUpdateField = async (fieldId: string, updates: Partial<FormField>) => {
    try {
      await api.updateFormField(fieldId, updates);
      setFields(fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)));
      setEditingField(null);
    } catch (error) {
      console.error('Failed to update field:', error);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Delete this field?')) return;
    try {
      await api.deleteFormField(fieldId);
      setFields(fields.filter((f) => f.id !== fieldId));
    } catch (error) {
      console.error('Failed to delete field:', error);
    }
  };

  const moveField = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    const newFields = [...fields];
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    setFields(newFields);

    try {
      await api.reorderFormFields(form.id, newFields.map((f) => f.id));
    } catch (error) {
      console.error('Failed to reorder fields:', error);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Edit Form</h1>
          <p className="text-gray-600">Configure form settings and add fields</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={handleSaveForm}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow border p-4">
            <h2 className="font-semibold mb-4">Form Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isOrgWide}
                    onChange={(e) => setFormData({ ...formData, isOrgWide: e.target.checked })}
                  />
                  Organization-wide
                </label>
              </div>
              {!formData.isOrgWide && (
                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Select...</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow border p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Form Fields</h2>
              <button
                onClick={() => setShowAddField(true)}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Field
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="border rounded-lg p-3 flex items-start gap-3 bg-gray-50"
                >
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveField(index, 'up')}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <GripVertical className="h-4 w-4 text-gray-400" />
                    <button
                      onClick={() => moveField(index, 'down')}
                      disabled={index === fields.length - 1}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{field.label}</span>
                      {field.required && (
                        <span className="text-red-500 text-xs">*Required</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      Type: {FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type}
                      {field.options && Array.isArray(field.options) && (
                        <span className="ml-2">
                          ({(field.options as string[]).length} options)
                        </span>
                      )}
                    </div>
                    {field.helpText && (
                      <div className="text-xs text-gray-400 mt-1">{field.helpText}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingField(field)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteField(field.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {fields.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No fields yet. Add fields to build your form.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddField && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Field</h2>
            <form onSubmit={handleAddField}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Label</label>
                  <input
                    type="text"
                    value={newField.label}
                    onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., Full Name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Field Type</label>
                  <select
                    value={newField.type}
                    onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {FIELD_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                {['SELECT', 'MULTI_SELECT'].includes(newField.type) && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Options (one per line)
                    </label>
                    <textarea
                      value={newField.options}
                      onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      rows={4}
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Placeholder</label>
                  <input
                    type="text"
                    value={newField.placeholder}
                    onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Placeholder text..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Help Text</label>
                  <input
                    type="text"
                    value={newField.helpText}
                    onChange={(e) => setNewField({ ...newField, helpText: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Additional instructions..."
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newField.required}
                    onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                  />
                  Required field
                </label>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddField(false)}
                  className="px-4 py-2 text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Add Field
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingField && (
        <FieldEditModal
          field={editingField}
          onSave={(updates) => handleUpdateField(editingField.id, updates)}
          onClose={() => setEditingField(null)}
        />
      )}
    </div>
  );
}

function FieldEditModal({
  field,
  onSave,
  onClose,
}: {
  field: FormField;
  onSave: (updates: Partial<FormField>) => void;
  onClose: () => void;
}) {
  const [data, setData] = useState({
    label: field.label,
    type: field.type,
    placeholder: field.placeholder || '',
    helpText: field.helpText || '',
    required: field.required,
    options: Array.isArray(field.options) ? (field.options as string[]).join('\n') : '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      label: data.label,
      type: data.type,
      placeholder: data.placeholder || undefined,
      helpText: data.helpText || undefined,
      required: data.required,
      options: ['SELECT', 'MULTI_SELECT'].includes(data.type)
        ? data.options.split('\n').filter(Boolean)
        : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Edit Field</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Label</label>
              <input
                type="text"
                value={data.label}
                onChange={(e) => setData({ ...data, label: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Field Type</label>
              <select
                value={data.type}
                onChange={(e) => setData({ ...data, type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                {FIELD_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            {['SELECT', 'MULTI_SELECT'].includes(data.type) && (
              <div>
                <label className="block text-sm font-medium mb-1">Options (one per line)</label>
                <textarea
                  value={data.options}
                  onChange={(e) => setData({ ...data, options: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={4}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Placeholder</label>
              <input
                type="text"
                value={data.placeholder}
                onChange={(e) => setData({ ...data, placeholder: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Help Text</label>
              <input
                type="text"
                value={data.helpText}
                onChange={(e) => setData({ ...data, helpText: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.required}
                onChange={(e) => setData({ ...data, required: e.target.checked })}
              />
              Required field
            </label>
          </div>
          <div className="flex gap-3 justify-end mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600">
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SubmissionsViewer({ formId, onBack }: { formId: string; onBack: () => void }) {
  const [data, setData] = useState<{ form: Form; submissions: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubmissions();
  }, [formId]);

  const loadSubmissions = async () => {
    try {
      const result = await api.getFormSubmissions(formId);
      setData(result);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      await api.exportFormSubmissions(formId, format);
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const getEmployeeName = (emp: any) => {
    if (emp.user) return `${emp.user.firstName} ${emp.user.lastName}`;
    return `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown';
  };

  const getEmployeeEmail = (emp: any) => {
    return emp.user?.email || emp.email || '';
  };

  if (loading) {
    return <div className="p-8 animate-pulse">Loading submissions...</div>;
  }

  if (!data) {
    return <div className="p-8">Failed to load submissions</div>;
  }

  const { form, submissions } = data;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={onBack} className="text-blue-600 hover:text-blue-800 mb-2">
            &larr; Back to Forms
          </button>
          <h1 className="text-2xl font-bold">{form.name} - Submissions</h1>
          <p className="text-gray-600">{submissions.length} submissions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Employee</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Department</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Submitted</th>
                {form.fields.map((field) => (
                  <th key={field.id} className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                    {field.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{getEmployeeName(sub.employee)}</div>
                    <div className="text-sm text-gray-500">{getEmployeeEmail(sub.employee)}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">{sub.employee.department.name}</td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(sub.submittedAt).toLocaleDateString()}
                  </td>
                  {form.fields.map((field) => {
                    const value = sub.data[field.id];
                    let displayValue = value;
                    if (Array.isArray(value)) displayValue = value.join(', ');
                    if (value === true) displayValue = 'Yes';
                    if (value === false) displayValue = 'No';
                    return (
                      <td key={field.id} className="px-4 py-3 text-sm">
                        {displayValue ?? '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr>
                  <td
                    colSpan={3 + form.fields.length}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No submissions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
