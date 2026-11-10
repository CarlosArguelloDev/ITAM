import React from 'react';
import {
  LayoutDashboard,
  Laptop,
  Users,
  AlertTriangle,
  Bell,
  FileText,
  Cpu,
} from 'lucide-react';

export type NavView = 'dashboard' | 'assets' | 'users' | 'discrepancies' | 'alerts' | 'documents';

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
    {
      id: 'discrepancies' as NavView,
      label: 'Discrepancies',
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

      {/* Embedded Raspberry Pi Footer Status */}
      <div className="p-4 m-3 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2 mb-1.5">
          <Cpu className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold text-slate-700">Raspberry Pi (ARM64)</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Memoria estimada:</span>
          <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
            &lt; 35 MB RAM
          </span>
        </div>
        <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-200 pt-1.5">
          <span>Engine: Go 1.23 + WAL</span>
          <span>v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};
