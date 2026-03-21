'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import {
  Upload,
  FileText,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Globe,
  Building2,
  Github,
  Code,
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
}

interface Document {
  id: string;
  title: string;
  category: string;
  documentType: string;
  status: string;
  chunkCount: number;
  fileSize?: number;
  departmentId?: string;
  isOrgWide: boolean;
  department?: { id: string; name: string };
  createdAt: string;
}

const statusIcons: Record<string, React.ReactNode> = {
  INDEXED: <CheckCircle className="h-4 w-4 text-green-500" />,
  FAILED: <XCircle className="h-4 w-4 text-red-500" />,
  PROCESSING: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  PENDING: <Clock className="h-4 w-4 text-yellow-500" />,
};

export default function KnowledgeBasePage() {
  const searchParams = useSearchParams();
  const initialDeptId = searchParams.get('departmentId') || '';

  const [documents, setDocuments] = useState<Document[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Array<{ category: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>(initialDeptId);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadCategory, setUploadCategory] = useState('general');
  const [uploadDepartment, setUploadDepartment] = useState<string>(initialDeptId);
  const [uploadIsOrgWide, setUploadIsOrgWide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [githubSyncing, setGithubSyncing] = useState(false);
  const [githubForm, setGithubForm] = useState({
    name: '',
    repoUrl: '',
    accessToken: '',
    category: 'codebase',
    branch: '',
    maxFiles: 500,
    departmentId: '',
    isOrgWide: true,
  });

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadDocuments();
    loadCategories();
  }, [selectedCategory, selectedDepartment]);

  const loadDepartments = async () => {
    try {
      const data = await api.getDepartments();
      setDepartments(data);
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await api.getDocuments({
        category: selectedCategory || undefined,
        departmentId: selectedDepartment || undefined,
        includeOrgWide: true,
        limit: 50,
      });
      setDocuments(data.documents);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await api.uploadDocument(
          file,
          uploadCategory,
          undefined,
          uploadIsOrgWide ? undefined : uploadDepartment || undefined,
          uploadIsOrgWide
        );
      }
      await loadDocuments();
      await loadCategories();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await api.deleteDocument(documentId);
      await loadDocuments();
      await loadCategories();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleReindex = async (documentId: string) => {
    try {
      await api.reindexDocument(documentId);
      await loadDocuments();
    } catch (error) {
      console.error('Reindex failed:', error);
    }
  };

  const handleGitHubSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubForm.name || !githubForm.repoUrl || !githubForm.accessToken) {
      alert('Please fill in all required fields');
      return;
    }

    setGithubSyncing(true);
    try {
      const result = await api.syncGitHub({
        name: githubForm.name,
        repoUrl: githubForm.repoUrl,
        accessToken: githubForm.accessToken,
        category: githubForm.category,
        branch: githubForm.branch || undefined,
        maxFiles: githubForm.maxFiles,
        departmentId: githubForm.isOrgWide ? undefined : githubForm.departmentId || undefined,
        isOrgWide: githubForm.isOrgWide,
      });
      alert(`Started syncing ${result.repository} (${result.branch}). Check back in a few minutes.`);
      setShowGitHubModal(false);
      setGithubForm({
        name: '',
        repoUrl: '',
        accessToken: '',
        category: 'codebase',
        branch: '',
        maxFiles: 500,
        departmentId: '',
        isOrgWide: true,
      });
      loadDocuments();
    } catch (error: any) {
      alert(error.message || 'Failed to sync GitHub repository');
    } finally {
      setGithubSyncing(false);
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Knowledge Base</h1>
        <p className="text-muted-foreground">
          Manage documents that power the AI assistant
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <Input
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  placeholder="e.g., policies, engineering"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Scope</label>
                <div className="mt-2 space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={uploadIsOrgWide}
                      onChange={(e) => setUploadIsOrgWide(e.target.checked)}
                      className="rounded"
                    />
                    <Globe className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Organization-wide</span>
                  </label>
                  {!uploadIsOrgWide && (
                    <select
                      value={uploadDepartment}
                      onChange={(e) => setUploadDepartment(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">No department (org-wide)</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.md,.html"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {uploading ? 'Uploading...' : 'Upload Files'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Supported: PDF, DOCX, TXT, MD, HTML (max 50MB)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Github className="h-4 w-4" />
                GitHub Repository
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Index code from a GitHub repository for codebase Q&A
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowGitHubModal(true)}
              >
                <Code className="h-4 w-4 mr-2" />
                Connect Repository
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Departments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedDepartment('')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                    !selectedDepartment ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  }`}
                >
                  All Documents
                </button>
                {departments.map((dept) => (
                  <button
                    key={dept.id}
                    onClick={() => setSelectedDepartment(dept.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                      selectedDepartment === dept.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                  >
                    {dept.name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                    !selectedCategory ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.category}
                    onClick={() => setSelectedCategory(cat.category)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm flex justify-between ${
                      selectedCategory === cat.category
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <span>{cat.category}</span>
                    <span className="opacity-60">{cat.count}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Documents ({filteredDocuments.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search documents..."
                      className="pl-9 w-64"
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={loadDocuments}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No documents found</p>
                  <p className="text-sm">Upload documents to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
                    >
                      <div className="flex items-center gap-4">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <h3 className="font-medium flex items-center gap-2">
                            {doc.title}
                            {doc.isOrgWide && (
                              <Globe className="h-4 w-4 text-blue-500" title="Organization-wide" />
                            )}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="px-2 py-0.5 bg-accent rounded">
                              {doc.category}
                            </span>
                            {doc.department && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                                {doc.department.name}
                              </span>
                            )}
                            <span>{doc.documentType}</span>
                            <span>{formatFileSize(doc.fileSize)}</span>
                            <span>{doc.chunkCount} chunks</span>
                            <span>{formatDate(doc.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 mr-4">
                          {statusIcons[doc.status]}
                          <span className="text-sm">{doc.status}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReindex(doc.id)}
                          title="Reindex"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showGitHubModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Github className="h-5 w-5" />
              Connect GitHub Repository
            </h2>
            <form onSubmit={handleGitHubSync}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={githubForm.name}
                    onChange={(e) =>
                      setGithubForm({ ...githubForm, name: e.target.value })
                    }
                    placeholder="e.g., Backend API"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Repository URL <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={githubForm.repoUrl}
                    onChange={(e) =>
                      setGithubForm({ ...githubForm, repoUrl: e.target.value })
                    }
                    placeholder="https://github.com/owner/repo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Personal Access Token <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="password"
                    value={githubForm.accessToken}
                    onChange={(e) =>
                      setGithubForm({ ...githubForm, accessToken: e.target.value })
                    }
                    placeholder="ghp_xxxxxxxxxxxx"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Needs repo read access. Create at GitHub Settings &gt; Developer settings &gt; Personal access tokens
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <Input
                      value={githubForm.category}
                      onChange={(e) =>
                        setGithubForm({ ...githubForm, category: e.target.value })
                      }
                      placeholder="codebase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Branch (optional)</label>
                    <Input
                      value={githubForm.branch}
                      onChange={(e) =>
                        setGithubForm({ ...githubForm, branch: e.target.value })
                      }
                      placeholder="main (default)"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Max Files</label>
                  <Input
                    type="number"
                    value={githubForm.maxFiles}
                    onChange={(e) =>
                      setGithubForm({ ...githubForm, maxFiles: parseInt(e.target.value) || 500 })
                    }
                    min={1}
                    max={2000}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Scope</label>
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={githubForm.isOrgWide}
                        onChange={(e) =>
                          setGithubForm({ ...githubForm, isOrgWide: e.target.checked })
                        }
                        className="rounded"
                      />
                      <Globe className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Organization-wide</span>
                    </label>
                    {!githubForm.isOrgWide && (
                      <select
                        value={githubForm.departmentId}
                        onChange={(e) =>
                          setGithubForm({ ...githubForm, departmentId: e.target.value })
                        }
                        className="w-full border rounded-md px-3 py-2 text-sm"
                      >
                        <option value="">Select department...</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowGitHubModal(false)}
                  disabled={githubSyncing}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={githubSyncing}>
                  {githubSyncing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Github className="h-4 w-4 mr-2" />
                      Start Sync
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
