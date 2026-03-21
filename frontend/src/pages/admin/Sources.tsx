
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import {
  Globe,
  FileText,
  RefreshCw,
  Trash2,
  Plus,
  ExternalLink,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Chrome,
} from 'lucide-react';

interface DataSource {
  id: string;
  name: string;
  type: string;
  config: any;
  documentsCount: number;
  lastSyncAt?: string;
  createdAt: string;
}

const NotionIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.886l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.22.186c-.094-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
  </svg>
);

const ConfluenceIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M.87 18.257c-.248.382-.53.875-.763 1.245a.764.764 0 0 0 .255 1.04l4.965 3.054a.764.764 0 0 0 1.058-.26c.199-.332.454-.763.733-1.221 1.967-3.247 3.945-2.853 7.508-1.146l4.957 2.377a.764.764 0 0 0 1.028-.382l2.245-5.072a.764.764 0 0 0-.382-1.012l-4.87-2.335c-4.87-2.336-8.892-4.27-16.734 3.712zM23.131 5.743c.249-.405.531-.875.764-1.245a.764.764 0 0 0-.256-1.04L18.675.404a.764.764 0 0 0-1.058.26c-.199.332-.454.764-.733 1.222-1.967 3.247-3.945 2.853-7.508 1.145L4.42.655a.764.764 0 0 0-1.028.382L1.147 6.109a.764.764 0 0 0 .382 1.012l4.87 2.335c4.87 2.335 8.893 4.27 16.732-3.713z" />
  </svg>
);

export default function DataSourcesPage() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [activeTab, setActiveTab] = useState('url');

  const [urlForm, setUrlForm] = useState({
    name: '',
    docsUrl: '',
    category: 'external-docs',
    maxPages: 50,
    usePlaywright: false,
  });

  const [notionForm, setNotionForm] = useState({
    name: '',
    apiKey: '',
    category: 'notion',
    databaseIds: '',
  });

  const [confluenceForm, setConfluenceForm] = useState({
    name: '',
    baseUrl: '',
    email: '',
    apiToken: '',
    spaceKey: '',
    category: 'confluence',
    maxPages: 100,
  });

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    try {
      setLoading(true);
      const data = await api.getDataSources();
      setSources(data);
    } catch (error) {
      console.error('Failed to load data sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCrawlUrl = async () => {
    if (!urlForm.name || !urlForm.docsUrl) {
      alert('Please fill in all required fields');
      return;
    }

    setAdding(true);
    try {
      if (urlForm.usePlaywright) {
        await api.crawlWithPlaywright({
          name: urlForm.name,
          docsUrl: urlForm.docsUrl,
          category: urlForm.category,
          maxPages: urlForm.maxPages,
        });
      } else {
        await api.crawlDocs({
          name: urlForm.name,
          docsUrl: urlForm.docsUrl,
          category: urlForm.category,
          maxPages: urlForm.maxPages,
        });
      }
      setUrlForm({ name: '', docsUrl: '', category: 'external-docs', maxPages: 50, usePlaywright: false });
      await loadSources();
    } catch (error) {
      console.error('Crawl failed:', error);
      alert('Failed to start crawl. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const handleSyncNotion = async () => {
    if (!notionForm.name || !notionForm.apiKey) {
      alert('Please fill in all required fields');
      return;
    }

    setAdding(true);
    try {
      await api.syncNotion({
        name: notionForm.name,
        apiKey: notionForm.apiKey,
        category: notionForm.category,
        databaseIds: notionForm.databaseIds ? notionForm.databaseIds.split(',').map(s => s.trim()) : undefined,
      });
      setNotionForm({ name: '', apiKey: '', category: 'notion', databaseIds: '' });
      await loadSources();
    } catch (error) {
      console.error('Notion sync failed:', error);
      alert('Failed to sync Notion. Please check your API key.');
    } finally {
      setAdding(false);
    }
  };

  const handleSyncConfluence = async () => {
    if (!confluenceForm.name || !confluenceForm.baseUrl || !confluenceForm.email || !confluenceForm.apiToken || !confluenceForm.spaceKey) {
      alert('Please fill in all required fields');
      return;
    }

    setAdding(true);
    try {
      await api.syncConfluence({
        name: confluenceForm.name,
        baseUrl: confluenceForm.baseUrl,
        email: confluenceForm.email,
        apiToken: confluenceForm.apiToken,
        spaceKey: confluenceForm.spaceKey,
        category: confluenceForm.category,
        maxPages: confluenceForm.maxPages,
      });
      setConfluenceForm({ name: '', baseUrl: '', email: '', apiToken: '', spaceKey: '', category: 'confluence', maxPages: 100 });
      await loadSources();
    } catch (error) {
      console.error('Confluence sync failed:', error);
      alert('Failed to sync Confluence. Please check your credentials.');
    } finally {
      setAdding(false);
    }
  };

  const handleResync = async (sourceId: string) => {
    try {
      await api.resyncDataSource(sourceId);
      await loadSources();
    } catch (error) {
      console.error('Resync failed:', error);
    }
  };

  const handleDelete = async (sourceId: string) => {
    if (!confirm('Are you sure you want to delete this data source and all its documents?')) return;

    try {
      await api.deleteDataSource(sourceId);
      await loadSources();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const getStatusBadge = (config: any) => {
    const status = config?.status || 'unknown';
    switch (status) {
      case 'completed':
        return <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-4 w-4" /> Indexed</span>;
      case 'crawling':
      case 'syncing':
        return <span className="flex items-center gap-1 text-blue-600"><Loader2 className="h-4 w-4 animate-spin" /> Syncing</span>;
      case 'failed':
        return <span className="flex items-center gap-1 text-red-600"><XCircle className="h-4 w-4" /> Failed</span>;
      default:
        return <span className="flex items-center gap-1 text-yellow-600"><Clock className="h-4 w-4" /> Pending</span>;
    }
  };

  const getSourceIcon = (type: string) => {
    if (type === 'NOTION') return <NotionIcon />;
    if (type === 'CONFLUENCE') return <ConfluenceIcon />;
    if (type === 'EXTERNAL_DOCS_PLAYWRIGHT') return <Chrome className="h-5 w-5" />;
    return <Globe className="h-5 w-5" />;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">External Documentation</h1>
        <p className="text-muted-foreground">
          Connect third-party documentation sources to your knowledge base
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="url">URL</TabsTrigger>
                  <TabsTrigger value="notion">Notion</TabsTrigger>
                  <TabsTrigger value="confluence">Confluence</TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium">Name *</label>
                    <Input
                      value={urlForm.name}
                      onChange={(e) => setUrlForm({ ...urlForm, name: e.target.value })}
                      placeholder="e.g., CodeRabbit Docs"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Documentation URL *</label>
                    <Input
                      value={urlForm.docsUrl}
                      onChange={(e) => setUrlForm({ ...urlForm, docsUrl: e.target.value })}
                      placeholder="https://docs.example.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Input
                      value={urlForm.category}
                      onChange={(e) => setUrlForm({ ...urlForm, category: e.target.value })}
                      placeholder="external-docs"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max Pages</label>
                    <Input
                      type="number"
                      value={urlForm.maxPages}
                      onChange={(e) => setUrlForm({ ...urlForm, maxPages: parseInt(e.target.value) || 50 })}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="usePlaywright"
                      checked={urlForm.usePlaywright}
                      onChange={(e) => setUrlForm({ ...urlForm, usePlaywright: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="usePlaywright" className="text-sm">
                      Use browser (for JS-rendered or protected sites)
                    </label>
                  </div>
                  <Button onClick={handleCrawlUrl} disabled={adding} className="w-full">
                    {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
                    Start Crawling
                  </Button>
                </TabsContent>

                <TabsContent value="notion" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium">Name *</label>
                    <Input
                      value={notionForm.name}
                      onChange={(e) => setNotionForm({ ...notionForm, name: e.target.value })}
                      placeholder="e.g., Company Wiki"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Integration API Key *</label>
                    <Input
                      type="password"
                      value={notionForm.apiKey}
                      onChange={(e) => setNotionForm({ ...notionForm, apiKey: e.target.value })}
                      placeholder="secret_xxx..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Database IDs (comma-separated)</label>
                    <Input
                      value={notionForm.databaseIds}
                      onChange={(e) => setNotionForm({ ...notionForm, databaseIds: e.target.value })}
                      placeholder="db-id-1, db-id-2"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Input
                      value={notionForm.category}
                      onChange={(e) => setNotionForm({ ...notionForm, category: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleSyncNotion} disabled={adding} className="w-full">
                    {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <NotionIcon />}
                    <span className="ml-2">Sync Notion</span>
                  </Button>
                </TabsContent>

                <TabsContent value="confluence" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium">Name *</label>
                    <Input
                      value={confluenceForm.name}
                      onChange={(e) => setConfluenceForm({ ...confluenceForm, name: e.target.value })}
                      placeholder="e.g., Engineering Wiki"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Confluence URL *</label>
                    <Input
                      value={confluenceForm.baseUrl}
                      onChange={(e) => setConfluenceForm({ ...confluenceForm, baseUrl: e.target.value })}
                      placeholder="https://company.atlassian.net"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email *</label>
                    <Input
                      value={confluenceForm.email}
                      onChange={(e) => setConfluenceForm({ ...confluenceForm, email: e.target.value })}
                      placeholder="user@company.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">API Token *</label>
                    <Input
                      type="password"
                      value={confluenceForm.apiToken}
                      onChange={(e) => setConfluenceForm({ ...confluenceForm, apiToken: e.target.value })}
                      placeholder="ATATT3xFfGF0..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Space Key *</label>
                    <Input
                      value={confluenceForm.spaceKey}
                      onChange={(e) => setConfluenceForm({ ...confluenceForm, spaceKey: e.target.value })}
                      placeholder="ENG"
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleSyncConfluence} disabled={adding} className="w-full">
                    {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ConfluenceIcon />}
                    <span className="ml-2">Sync Confluence</span>
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Connected Sources ({sources.length})</CardTitle>
                <Button variant="outline" size="icon" onClick={loadSources}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : sources.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ExternalLink className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No external sources connected</p>
                  <p className="text-sm">Add a documentation source to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-accent rounded-lg">
                          {getSourceIcon(source.type)}
                        </div>
                        <div>
                          <h3 className="font-medium">{source.name}</h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{source.type.replace(/_/g, ' ')}</span>
                            <span>{source.documentsCount} docs</span>
                            {source.config?.docsUrl && (
                              <a
                                href={source.config.docsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-foreground"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getStatusBadge(source.config)}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleResync(source.id)}
                          title="Resync"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(source.id)}
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
    </div>
  );
}
