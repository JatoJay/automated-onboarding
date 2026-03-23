import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Form, FormField } from '@/lib/api';
import { FileText, CheckCircle, Clock, Globe, Building2, Send } from 'lucide-react';

export default function MyFormsPage() {
  const [forms, setForms] = useState<(Form & { isSubmitted: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [submissionData, setSubmissionData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      const data = await api.getMyForms();
      setForms(data);
    } catch (error) {
      console.error('Failed to load forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const openForm = async (form: Form) => {
    setSelectedForm(form);
    setSubmissionData({});
    try {
      const submission = await api.getMySubmission(form.id);
      if (submission) {
        setExistingSubmission(submission.data);
        setSubmissionData(submission.data);
      } else {
        setExistingSubmission(null);
      }
    } catch (error) {
      console.error('Failed to load submission:', error);
      setExistingSubmission(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForm) return;

    setSubmitting(true);
    try {
      await api.submitForm(selectedForm.id, submissionData);
      setSelectedForm(null);
      loadForms();
    } catch (error: any) {
      console.error('Failed to submit form:', error);
      alert(error.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setSubmissionData({ ...submissionData, [fieldId]: value });
  };

  if (loading) {
    return <div className="p-8 animate-pulse">Loading forms...</div>;
  }

  if (selectedForm) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <button
          onClick={() => setSelectedForm(null)}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          &larr; Back to Forms
        </button>

        <div className="bg-white rounded-lg shadow border p-6">
          <h1 className="text-2xl font-bold mb-2">{selectedForm.name}</h1>
          {selectedForm.description && (
            <p className="text-gray-600 mb-6">{selectedForm.description}</p>
          )}

          {existingSubmission && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">
                You have already submitted this form. You can update your responses below.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {selectedForm.fields.map((field) => (
                <FormFieldInput
                  key={field.id}
                  field={field}
                  value={submissionData[field.id]}
                  onChange={(value) => handleFieldChange(field.id, value)}
                />
              ))}
            </div>

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedForm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Submitting...' : existingSubmission ? 'Update Submission' : 'Submit Form'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const pendingForms = forms.filter((f) => !f.isSubmitted);
  const completedForms = forms.filter((f) => f.isSubmitted);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Forms</h1>
        <p className="text-gray-600 mt-1">Complete the forms assigned to you</p>
      </div>

      {pendingForms.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Pending Forms ({pendingForms.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingForms.map((form) => (
              <FormCard key={form.id} form={form} onClick={() => openForm(form)} />
            ))}
          </div>
        </div>
      )}

      {completedForms.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Completed Forms ({completedForms.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedForms.map((form) => (
              <FormCard key={form.id} form={form} onClick={() => openForm(form)} completed />
            ))}
          </div>
        </div>
      )}

      {forms.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No forms assigned to you yet.</p>
        </div>
      )}
    </div>
  );
}

function FormCard({
  form,
  onClick,
  completed = false,
}: {
  form: Form;
  onClick: () => void;
  completed?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow border p-4 cursor-pointer hover:shadow-md transition-shadow ${
        completed ? 'border-green-200' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className={`h-5 w-5 ${completed ? 'text-green-600' : 'text-blue-600'}`} />
          <h3 className="font-semibold">{form.name}</h3>
        </div>
        {completed && <CheckCircle className="h-5 w-5 text-green-500" />}
      </div>

      {form.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{form.description}</p>
      )}

      <div className="flex items-center gap-2 text-sm text-gray-500">
        {form.isOrgWide ? (
          <span className="flex items-center gap-1">
            <Globe className="h-4 w-4" />
            Organization
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            {form.department?.name}
          </span>
        )}
        <span className="text-gray-300">|</span>
        <span>{form.fields.length} fields</span>
      </div>

      <div className="mt-3 pt-3 border-t">
        <span className={`text-sm ${completed ? 'text-green-600' : 'text-blue-600'}`}>
          {completed ? 'View / Edit Submission' : 'Fill Out Form'} &rarr;
        </span>
      </div>
    </div>
  );
}

function FormFieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
}) {
  const baseInputClass = 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  const renderInput = () => {
    switch (field.type) {
      case 'TEXT':
      case 'EMAIL':
      case 'PHONE':
        return (
          <input
            type={field.type === 'EMAIL' ? 'email' : field.type === 'PHONE' ? 'tel' : 'text'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={baseInputClass}
          />
        );

      case 'TEXTAREA':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
            className={baseInputClass}
          />
        );

      case 'NUMBER':
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            placeholder={field.placeholder}
            required={field.required}
            className={baseInputClass}
          />
        );

      case 'DATE':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseInputClass}
          />
        );

      case 'SELECT':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className={baseInputClass}
          >
            <option value="">Select...</option>
            {(field.options as string[] || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case 'MULTI_SELECT':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {(field.options as string[] || []).map((opt) => (
              <label key={opt} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(opt)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...selectedValues, opt]);
                    } else {
                      onChange(selectedValues.filter((v: string) => v !== opt));
                    }
                  }}
                  className="rounded"
                />
                {opt}
              </label>
            ))}
          </div>
        );

      case 'CHECKBOX':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              className="rounded"
            />
            Yes
          </label>
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className={baseInputClass}
          />
        );
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderInput()}
      {field.helpText && <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>}
    </div>
  );
}
