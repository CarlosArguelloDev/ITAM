import React from 'react';
import {
  LayoutDashboard,
  Laptop,
  Users,
  ClipboardCheck,
  AlertTriangle,
  Bell,
  FileText,
} from 'lucide-react';

export type NavView = 'dashboard' | 'assets' | 'users' | 'audits' | 'discrepancies' | 'alerts' | 'documents';

interface SidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  discrepanciesCount: number;
  alertsCount: number;
  pendingResponsivasCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  discrepanciesCount,
  alertsCount,
  pendingResponsivasCount,
}) => {
  const navItems = [
    { id: 'dashboard' as NavView, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assets' as NavView, label: 'Assets', icon: Laptop },
    { id: 'users' as NavView, label: 'Users & Diagrams', icon: Users },
    { id: 'audits' as NavView, label: 'Auditorías', icon: ClipboardCheck },
    {
      id: 'discrepancies' as NavView,
      label: 'Discrepancias',
      icon: AlertTriangle,
      badge: discrepanciesCount > 0 ? discrepanciesCount : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    {
      id: 'alerts' as NavView,
      label: 'Alerts',
      icon: Bell,
      badge: alertsCount > 0 ? alertsCount : undefined,
      badgeColor: 'bg-red-100 text-red-800 border-red-200',
    },
    {
      id: 'documents' as NavView,
      label: 'Documents (Responsivas)',
      icon: FileText,
      badge: pendingResponsivasCount > 0 ? pendingResponsivasCount : undefined,
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    },
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-[#E2E8F0] z-30 flex flex-col justify-between shadow-sm">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-[#E2E8F0] gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-white shadow-sm font-bold text-sm">
            IT
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
              Opti ITAM
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">Asset & Custody Manager</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 border border-sky-100 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};
