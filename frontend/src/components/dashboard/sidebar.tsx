import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  CheckSquare,
  Settings,
  LogOut,
  BarChart3,
  Building2,
  Users,
  FileText,
  Globe,
  BookOpen,
  ChevronDown,
  GitBranch,
  ClipboardList,
  HelpCircle,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/chat', label: 'AI Assistant', icon: MessageSquare },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/forms', label: 'My Forms', icon: ClipboardList },
  { href: '/help', label: 'Get Help', icon: HelpCircle },
  { href: '/org-chart', label: 'My Organization', icon: GitBranch },
];

const adminNavItems = [
  { href: '/admin/departments', label: 'Departments', icon: Building2 },
  { href: '/admin/employees', label: 'Employees', icon: Users },
  { href: '/admin/forms', label: 'Form Builder', icon: ClipboardList },
  { href: '/admin/help-requests', label: 'Help Requests', icon: Inbox },
  { href: '/admin/knowledge', label: 'Knowledge Base', icon: FileText },
  { href: '/admin/sources', label: 'External Sources', icon: Globe },
  { href: '/admin/workflows', label: 'Workflows', icon: BookOpen },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'HR';
  const [adminExpanded, setAdminExpanded] = useState(location.pathname.startsWith('/admin'));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdminActive = location.pathname.startsWith('/admin');

  return (
    <aside className="flex flex-col w-64 glass-sidebar h-screen">
      <div className="p-6">
        <h1 className="text-xl font-bold">Onboarding</h1>
      </div>

      <nav className="flex-1 px-4 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <button
              onClick={() => setAdminExpanded(!adminExpanded)}
              className={cn(
                'flex items-center justify-between w-full px-4 py-3 rounded-lg mb-1 transition-colors',
                isAdminActive ? 'bg-accent' : 'hover:bg-accent'
              )}
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5" />
                <span>Admin</span>
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  adminExpanded && 'rotate-180'
                )}
              />
            </button>

            {adminExpanded && (
              <div className="ml-4 border-l pl-2 mb-2">
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg mb-1 text-sm transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </div>
          <div>
            <p className="font-medium">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
