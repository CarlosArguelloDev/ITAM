import React, { useState } from 'react';
import { Copy, Check } from '@phosphor-icons/react';

interface CopyButtonProps {
  value?: string | null;
  label?: string;
  className?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  value,
  label = 'dato',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const text = (value || '').trim();
  if (!text || text === '—' || text === 'NA' || text === 'N/A' || text === 'NO LEGIBLE') {
    return null;
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? `${label} copiado` : `Copiar ${label}: ${text}`}
      title={copied ? '¡Copiado!' : `Copiar ${label}`}
      className={`inline-flex items-center justify-center p-1 rounded-md transition active:scale-[0.95] ${
        copied
          ? 'text-emerald-600 bg-emerald-50'
          : 'text-slate-400 hover:text-[#5B4FE9] hover:bg-[#F3F2FF]'
      } ${className}`}
    >
      {copied ? (
        <Check weight="bold" className="w-3.5 h-3.5" />
      ) : (
        <Copy weight="duotone" className="w-3.5 h-3.5" />
      )}
    </button>
  );
};
