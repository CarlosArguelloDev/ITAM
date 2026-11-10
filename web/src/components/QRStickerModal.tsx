import React from 'react';
import { X, Printer, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Asset } from '../types';

interface QRStickerModalProps {
  asset: Asset;
  onClose: () => void;
}

export const QRStickerModal: React.FC<QRStickerModalProps> = ({ asset, onClose }) => {
  const auditUrl = `${window.location.origin}/audit/scan/${encodeURIComponent(asset.asset_tag)}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">Etiqueta de Activo Físico</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sticker Preview */}
        <div className="p-6 flex flex-col items-center">
          <p className="text-xs text-slate-500 mb-4 text-center">
            Formato estándar corporativo para rotulación e inventario con escáner de cámara.
          </p>

          {/* Tarjeta de Etiqueta Imprimible */}
          <div
            id="printable-content"
            className="w-72 bg-white border-2 border-dashed border-slate-400 p-4 rounded-xl flex flex-col items-center shadow-sm text-center relative"
          >
            <div className="w-full flex items-center justify-between border-b border-slate-200 pb-1.5 mb-3">
              <span className="text-[10px] font-bold tracking-wider uppercase text-sky-700">
                PROPIEDAD DE TI
              </span>
              <span className="text-[9px] font-mono text-slate-400">CONTROL TI</span>
            </div>

            {/* Código QR */}
            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-inner mb-3">
              <QRCodeSVG
                value={auditUrl}
                size={140}
                level="M"
                includeMargin={false}
              />
            </div>

            {/* Asset Tag */}
            <h4 className="text-base font-mono font-bold text-slate-900 tracking-tight">
              {asset.asset_tag}
            </h4>

            {/* Serial & Model */}
            <p className="text-xs font-semibold text-slate-700 mt-0.5">
              {asset.brand} {asset.model}
            </p>
            <p className="text-[11px] font-mono text-slate-500">
              S/N: {asset.serial_number}
            </p>

            <div className="w-full border-t border-slate-100 pt-1.5 mt-2 flex items-center justify-between text-[9px] text-slate-400">
              <span>{asset.category}</span>
              <span>{asset.location}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
          <button
            onClick={onClose}
            className="text-xs font-semibold px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-200/70"
          >
            Cancelar
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Etiqueta</span>
          </button>
        </div>
      </div>
    </div>
  );
};
