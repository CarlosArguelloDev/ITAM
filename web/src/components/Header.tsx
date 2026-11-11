import React from 'react';
import { Barcode } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenScanner: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onOpenScanner,
}) => {
  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onOpenScanner}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-all hover:shadow"
        >
          <Barcode className="w-4 h-4" />
          <span>Escanear Código de Barras</span>
        </button>
      </div>
    </header>
  );
};
