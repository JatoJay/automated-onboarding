'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Globe, Users, BarChart3, Settings, BookOpen } from 'lucide-react';

const adminLinks = [
  {
    href: '/admin/knowledge',
    title: 'Knowledge Base',
    description: 'Upload and manage documents that power the AI assistant',
    icon: FileText,
    color: 'text-blue-500',
  },
  {
    href: '/admin/sources',
    title: 'External Sources',
    description: 'Connect third-party documentation (Notion, Confluence, URLs)',
    icon: Globe,
    color: 'text-green-500',
  },
  {
    href: '/admin/employees',
    title: 'Employees',
    description: 'View and manage employee onboarding progress',
    icon: Users,
    color: 'text-purple-500',
  },
  {
    href: '/admin/workflows',
    title: 'Workflows',
    description: 'Configure onboarding plans and task templates',
    icon: BookOpen,
    color: 'text-orange-500',
  },
  {
    href: '/admin/analytics',
    title: 'Analytics',
    description: 'View onboarding metrics and insights',
    icon: BarChart3,
    color: 'text-cyan-500',
  },
  {
    href: '/admin/settings',
    title: 'Settings',
    description: 'Configure system settings and integrations',
    icon: Settings,
    color: 'text-gray-500',
  },
];

export default function AdminPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">
          Manage your onboarding system and knowledge base
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-accent ${link.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{link.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{link.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
