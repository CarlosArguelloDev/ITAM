import React, { useEffect, useState, useRef } from 'react';
import { X, Camera, Keyboard, CheckCircle, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { api } from '../api';
import { AuditCampaign, AuditScan, User } from '../types';

interface ScannerModalProps {
  campaigns: AuditCampaign[];
  users: User[];
  onClose: () => void;
  onScanCompleted?: (scan: AuditScan) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  campaigns,
  users,
  onClose,
  onScanCompleted,
}) => {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    campaigns.find((c) => c.status === 'OPEN')?.id || campaigns[0]?.id || ''
  );
  const [foundWithUserId, setFoundWithUserId] = useState<string>('');
  const [foundLocation, setFoundLocation] = useState<string>('');
  const [manualTag, setManualTag] = useState<string>('');
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<AuditScan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const currentCamp = campaigns.find((c) => c.id === selectedCampaignId);
    if (currentCamp) {
      setFoundLocation(currentCamp.target_location);
    }
  }, [selectedCampaignId, campaigns]);

  useEffect(() => {
    if (mode === 'camera' && !scanResult) {
      const scanner = new Html5QrcodeScanner(
        'qr-reader-container',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          // Si el decodedText es una URL ej. /audit/scan/IT-LAP-0010
          let tag = decodedText.trim();
          if (tag.includes('/audit/scan/')) {
            const parts = tag.split('/audit/scan/');
            tag = parts[parts.length - 1];
          }
          handleProcessScan(tag);
        },
        (scanError) => {
          // Ignorar frames sin código QR
        }
      );

      scannerRef.current = scanner;

      return () => {
        scanner.clear().catch(() => {});
      };
    }
  }, [mode, scanResult]);

  const handleProcessScan = async (tag: string) => {
    if (!selectedCampaignId) {
      setError('Selecciona una campaña de auditoría abierta.');
      return;
    }

    try {
      setScanning(true);
      setError(null);
      const res = await api.scanAsset(selectedCampaignId, {
        asset_tag: tag,
        found_with_user_id: foundWithUserId ? foundWithUserId : undefined,
        found_location: foundLocation,
      });

      setScanResult(res);
      if (onScanCompleted) onScanCompleted(res);

      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    } catch (err: any) {
      setError(err.message || 'Error al procesar escaneo de activo');
    } finally {
      setScanning(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTag.trim()) return;
    handleProcessScan(manualTag.trim());
  };

  const resetScanner = () => {
    setScanResult(null);
    setManualTag('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Auditoría con Escáner QR</h3>
              <p className="text-[11px] text-slate-500">Lectura y verificación de código de activo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Campaign & Context Settings */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-3 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Campaña de Auditoría Destino:
            </label>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.target_location}) - [{c.status}]
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-slate-600 block mb-1">
                Custodia Física Hallada:
              </label>
              <select
                value={foundWithUserId}
                onChange={(e) => setFoundWithUserId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="">(Sin asignar o no verificado)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.employee_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-medium text-slate-600 block mb-1">
                Ubicación Física Actual:
              </label>
              <input
                type="text"
                value={foundLocation}
                onChange={(e) => setFoundLocation(e.target.value)}
                placeholder="Ej. CDMX Central"
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Tab Selector Mode */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => {
              setMode('camera');
              resetScanner();
            }}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              mode === 'camera'
                ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Cámara Web / Celular</span>
          </button>
          <button
            onClick={() => {
              setMode('manual');
              resetScanner();
            }}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              mode === 'manual'
                ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Pistola / Teclado Rápido</span>
          </button>
        </div>

        {/* Scanner View Area */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {scanResult ? (
            /* Resultado de la comparación física vs lógica */
            <div className="p-4 rounded-xl border space-y-3 bg-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Resultado de Lectura:</span>
                {scanResult.discrepancy_type === 'MATCH' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle className="w-3.5 h-3.5" />
                    MATCH FÍSICO Y LÓGICO
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    DISCREPANCIA: {scanResult.discrepancy_type}
                  </span>
                )}
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Activo:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {scanResult.asset_tag} ({scanResult.asset_brand} {scanResult.asset_model})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Custodia en Sistema (Lógica):</span>
                  <span className="font-medium text-slate-800">
                    {scanResult.expected_user_name || 'Sin Asignar (Stock)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Custodia Física Hallada:</span>
                  <span className="font-semibold text-sky-800">
                    {scanResult.found_with_user_name || 'Sin Asignar'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ubicación Lógica / Física:</span>
                  <span className="text-slate-700">
                    {scanResult.expected_location} ➔ {scanResult.found_location}
                  </span>
                </div>
              </div>

              <button
                onClick={resetScanner}
                className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Escanear Siguiente Activo</span>
              </button>
            </div>
          ) : mode === 'camera' ? (
            /* Modo Cámara html5-qrcode */
            <div>
              <div
                id="qr-reader-container"
                className="overflow-hidden rounded-xl border border-slate-200 bg-black min-h-[260px]"
              />
              <p className="text-[11px] text-slate-400 text-center mt-3">
                Apunta la cámara al código QR impreso en la etiqueta del equipo.
              </p>
            </div>
          ) : (
            /* Modo Teclado / Pistola USB */
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tag de Inventario o Número de Serie:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualTag}
                    onChange={(e) => setManualTag(e.target.value)}
                    placeholder="Ej. IT-LAP-0010 o 8G7H9X3"
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                  />
                  <Zap className="w-4 h-4 text-sky-500 absolute right-3.5 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={!manualTag.trim() || scanning}
                className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold text-xs py-2.5 rounded-xl shadow-sm transition-all"
              >
                {scanning ? 'Verificando inventario...' : 'Conciliar Activo'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
