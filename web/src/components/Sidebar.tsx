import React from 'react';
import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import {
  SquaresFour,
  Laptop,
  UsersThree,
  ClipboardText,
  WarningCircle,
  BellRinging,
  FileText,
  Buildings,
  X,
} from '@phosphor-icons/react';

export type NavView =
  | 'dashboard'
  | 'assets'
  | 'users'
  | 'departments'
  | 'audits'
  | 'discrepancies'
  | 'alerts'
  | 'documents';

interface SidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  discrepanciesCount: number;
  alertsCount: number;
  pendingResponsivasCount: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  discrepanciesCount,
  alertsCount,
  pendingResponsivasCount,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const primaryItems = [
    { id: 'dashboard' as NavView, label: 'Inicio', icon: SquaresFour },
    { id: 'assets' as NavView, label: 'Inventario', icon: Laptop },
    { id: 'users' as NavView, label: 'Colaboradores', icon: UsersThree },
    { id: 'departments' as NavView, label: 'Deptos & Sites', icon: Buildings },
  ];

  const controlItems = [
    { id: 'audits' as NavView, label: 'Auditorías', icon: ClipboardText },
    {
      id: 'discrepancies' as NavView,
      label: 'Discrepancias',
      icon: WarningCircle,
      badge: discrepanciesCount > 0 ? discrepanciesCount : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    {
      id: 'alerts' as NavView,
      label: 'Alertas',
      icon: BellRinging,
      badge: alertsCount > 0 ? alertsCount : undefined,
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    },
    {
      id: 'documents' as NavView,
      label: 'Responsivas',
      icon: FileText,
      badge: pendingResponsivasCount > 0 ? pendingResponsivasCount : undefined,
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    },
  ];

  const handleNav = (view: NavView) => {
    onNavigate(view);
    if (onCloseMobile) onCloseMobile();
  };

  const renderGroup = (
    title: string,
    items: {
      id: NavView;
      label: string;
      icon: PhosphorIcon;
      badge?: number;
      badgeColor?: string;
    }[]
  ) => (
    <div className="space-y-1">
      <div className="px-3.5 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {title}
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleNav(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] transition-all active:scale-[0.98] ${
              isActive
                ? 'bg-[#F3F2FF] text-[#4F46E5] border border-[#E4E2F8] font-semibold shadow-2xs'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon
                weight="duotone"
                className={`w-4.5 h-4.5 ${isActive ? 'text-[#5B4FE9]' : 'text-slate-400'}`}
              />
              <span>{item.label}</span>
            </div>
            {item.badge !== undefined && (
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full border font-bold tabular-nums ${item.badgeColor}`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Navegación principal"
        className={`fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-[#E6E8F0] z-40 flex flex-col justify-between transition-transform duration-200 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-[#E6E8F0]">
            <div className="flex items-center gap-2.5">
              <img
                src="/optibelt-logo.webp"
                alt="Optibelt"
                className="h-8 w-auto object-contain"
              />
              <div>
                <h1 className="text-sm font-extrabold text-slate-900 tracking-tight leading-none">
                  Opti ITAM
                </h1>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Custodia de Activos
                </p>
              </div>
            </div>
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Cerrar menú"
                className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <nav className="p-3 space-y-3 overflow-y-auto">
            {renderGroup('Principal', primaryItems)}
            {renderGroup('Control y Auditoría', controlItems)}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E6E8F0]">
          <div className="rounded-xl bg-[#F6F7FB] border border-[#E6E8F0] px-3.5 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-700">San Juan del Río</p>
              <p className="text-[10px] text-slate-500">OPM • OMEX</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Activo
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
