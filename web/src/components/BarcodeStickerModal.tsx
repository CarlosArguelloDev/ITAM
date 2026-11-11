import React, { useState } from 'react';
import { X, Printer, Barcode as BarcodeIcon, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Barcode } from './Barcode';
import { Asset } from '../types';
import { api } from '../api';

interface BarcodeStickerModalProps {
  asset: Asset;
  onClose: () => void;
}

export const BarcodeStickerModal: React.FC<BarcodeStickerModalProps> = ({ asset, onClose }) => {
  const [brotherPrinting, setBrotherPrinting] = useState(false);
  const [brotherSuccess, setBrotherSuccess] = useState<string | null>(null);
  const [brotherError, setBrotherError] = useState<string | null>(null);

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleBrotherPrint = async () => {
    try {
      setBrotherPrinting(true);
      setBrotherSuccess(null);
      setBrotherError(null);

      const res = await api.printBrotherLabel(asset.id);
      setBrotherSuccess(res.message || `Etiqueta enviada exitosamente a Brother PT-D410`);
      
      // Auto-cerrar o limpiar tras 4 segundos
      setTimeout(() => {
        setBrotherSuccess(null);
      }, 4000);
    } catch (err: any) {
      console.error('Error al imprimir en Brother:', err);
      setBrotherError(err.message || 'No se pudo comunicar con Brother PT-D410. Verifica la conexión USB.');
    } finally {
      setBrotherPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <BarcodeIcon className="w-5 h-5 text-sky-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Etiqueta de Activo</h3>
              <p className="text-[11px] text-slate-500 font-medium">Brother PT-D410 (TZe 18mm)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificaciones de Impresión Directa */}
        {brotherSuccess && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{brotherSuccess}</span>
          </div>
        )}

        {brotherError && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-800 font-semibold animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{brotherError}</span>
          </div>
        )}

        {/* Sticker Preview */}
        <div className="p-6 flex flex-col items-center">
          <p className="text-xs text-slate-500 mb-4 text-center">
            Vista previa con plantilla corporativa <strong>etiqueta.lbx</strong>
          </p>

          {/* Tarjeta de Etiqueta Imprimible */}
          <div
            id="printable-content"
            className="w-80 bg-white border-2 border-dashed border-slate-400 p-4 rounded-xl flex flex-col items-center shadow-sm text-center relative"
          >
            <div className="w-full flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
              <span className="text-[10px] font-bold tracking-wider uppercase text-sky-700">
                PROPIEDAD DE TI
              </span>
              <span className="text-[9px] font-mono text-slate-400">CONTROL TI</span>
            </div>

            {/* Código de Barras Code 128 */}
            <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-inner mb-2 w-full flex justify-center overflow-hidden">
              <Barcode
                value={asset.asset_tag}
                width={1.9}
                height={52}
                fontSize={12}
                margin={4}
                className="max-w-full"
              />
            </div>

            {/* Serial & Model */}
            <p className="text-xs font-semibold text-slate-700 mt-1">
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
        <div className="px-5 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50">
          <button
            onClick={handleBrowserPrint}
            className="text-xs font-medium px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-200/70 border border-slate-200"
            title="Abrir diálogo de impresión de Windows o PDF"
          >
            Impresión Navegador / PDF
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs font-semibold px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-200/70"
            >
              Cerrar
            </button>
            <button
              onClick={handleBrotherPrint}
              disabled={brotherPrinting}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {brotherPrinting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Imprimiendo en Brother...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Imprimir en Brother PT-D410</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
