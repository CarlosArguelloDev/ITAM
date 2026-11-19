import React from 'react';
import { Barcode, List } from '@phosphor-icons/react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenScanner: () => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onOpenScanner,
  onOpenMobileMenu,
}) => {
  return (
    <header className="h-16 bg-white/95 backdrop-blur-sm border-b border-[#E6E8F0] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Abrir menú de navegación"
            className="lg:hidden p-2 rounded-xl border border-[#E6E8F0] text-slate-600 hover:bg-slate-50"
          >
            <List weight="bold" className="w-4 h-4" />
          </button>
        )}
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-500 font-medium truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onOpenScanner}
          className="flex items-center gap-2 bg-[#5B4FE9] hover:bg-[#4B3FD8] text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-[0.98]"
        >
          <Barcode weight="duotone" className="w-4 h-4" />
          <span className="hidden sm:inline">Escanear Código</span>
          <span className="sm:hidden">Escanear</span>
        </button>
      </div>
    </header>
  );
};
