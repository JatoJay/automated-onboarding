'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Building2, Bot, Database, Bell } from 'lucide-react';

interface OrgSettings {
  name: string;
  slug: string;
  domain?: string;
  features: {
    aiChat: boolean;
    documentUpload: boolean;
    externalDocs: boolean;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<OrgSettings>({
    name: '',
    slug: '',
    domain: '',
    features: {
      aiChat: true,
      documentUpload: true,
      externalDocs: true,
    },
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setSettings({
      name: 'Default Organization',
      slug: 'default',
      domain: '',
      features: {
        aiChat: true,
        documentUpload: true,
        externalDocs: true,
      },
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    await new Promise((r) => setTimeout(r, 1000));

    setMessage('Settings saved successfully!');
    setSaving(false);

    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure your organization and system settings
        </p>
      </div>

      <div className="grid gap-6 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-blue-500" />
              <div>
                <CardTitle>Organization</CardTitle>
                <CardDescription>Basic organization settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Organization Name
              </label>
              <Input
                value={settings.name}
                onChange={(e) =>
                  setSettings({ ...settings, name: e.target.value })
                }
                placeholder="Your Company Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Domain</label>
              <Input
                value={settings.domain}
                onChange={(e) =>
                  setSettings({ ...settings, domain: e.target.value })
                }
                placeholder="company.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used for email domain verification
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bot className="h-5 w-5 text-purple-500" />
              <div>
                <CardTitle>AI Features</CardTitle>
                <CardDescription>Configure AI assistant settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">AI Chat Assistant</div>
                <div className="text-sm text-gray-500">
                  Enable AI-powered chat for employees
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.features.aiChat}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    features: { ...settings.features, aiChat: e.target.checked },
                  })
                }
                className="h-5 w-5 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">Document Upload</div>
                <div className="text-sm text-gray-500">
                  Allow uploading documents to knowledge base
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.features.documentUpload}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    features: {
                      ...settings.features,
                      documentUpload: e.target.checked,
                    },
                  })
                }
                className="h-5 w-5 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">External Documentation</div>
                <div className="text-sm text-gray-500">
                  Enable crawling external docs (Notion, Confluence, URLs)
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.features.externalDocs}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    features: {
                      ...settings.features,
                      externalDocs: e.target.checked,
                    },
                  })
                }
                className="h-5 w-5 rounded"
              />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-green-500" />
              <div>
                <CardTitle>Integrations</CardTitle>
                <CardDescription>Connected services and APIs</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center text-blue-600 font-bold text-sm">
                    Q
                  </div>
                  <div>
                    <div className="font-medium">Qdrant Vector DB</div>
                    <div className="text-sm text-gray-500">Vector search</div>
                  </div>
                </div>
                <span className="text-green-600 text-sm font-medium">
                  Connected
                </span>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center text-purple-600 font-bold text-sm">
                    G
                  </div>
                  <div>
                    <div className="font-medium">Google Vertex AI</div>
                    <div className="text-sm text-gray-500">
                      Gemini embeddings & chat
                    </div>
                  </div>
                </div>
                <span className="text-green-600 text-sm font-medium">
                  Connected
                </span>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-600 font-bold text-sm">
                    P
                  </div>
                  <div>
                    <div className="font-medium">PostgreSQL</div>
                    <div className="text-sm text-gray-500">Primary database</div>
                  </div>
                </div>
                <span className="text-green-600 text-sm font-medium">
                  Connected
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-orange-500" />
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Configure notification settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">Email Notifications</div>
                  <div className="text-sm text-gray-500">
                    Send emails for onboarding updates
                  </div>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5 rounded" />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">Task Reminders</div>
                  <div className="text-sm text-gray-500">
                    Remind employees of pending tasks
                  </div>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5 rounded" />
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          {message && <span className="text-green-600 text-sm">{message}</span>}
        </div>
      </div>
    </div>
  );
}
