import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Barcode,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Laptop,
  Monitor,
  Cpu,
  Headphones,
  Box,
  ShieldCheck,
  Check,
  ArrowRight,
  Zap,
  Clock,
  Printer,
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { User, Asset, AuditCampaign } from '../types';
import { api } from '../api';
import { AuditReportModal } from './AuditReportModal';

interface QuickUserAuditModalProps {
  user: User;
  onClose: () => void;
  onAuditFinished?: () => void;
}

interface ScannedRecord {
  assetId: string;
  assetTag: string;
  serialNumber: string;
  brand: string;
  model: string;
  category: string;
  discrepancyType: 'MATCH' | 'WRONG_USER' | 'WRONG_LOCATION' | 'UNASSIGNED';
  message: string;
  scannedAt: Date;
}

export const QuickUserAuditModal: React.FC<QuickUserAuditModalProps> = ({
  user,
  onClose,
  onAuditFinished,
}) => {
  const [expectedAssets, setExpectedAssets] = useState<Asset[]>([]);
  const [loadingExpected, setLoadingExpected] = useState(true);

  // Sesión de campaña activa en SQLite
  const [campaignId, setCampaignId] = useState<string | null>(null);

  // Escaneos realizados en esta sesión rápida
  const [scannedRecords, setScannedRecords] = useState<ScannedRecord[]>([]);

  // Input y cámara
  const [inputTag, setInputTag] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [flashMessage, setFlashMessage] = useState<{ type: 'success' | 'warn' | 'error'; text: string } | null>(null);

  // Guardado final
  const [finishing, setFinishing] = useState(false);
  const [savedReport, setSavedReport] = useState<AuditCampaign | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    loadExpected();
  }, [user.id]);

  // Mantener foco en el input para pistolas lectoras
  useEffect(() => {
    if (!cameraActive && !savedReport) {
      inputRef.current?.focus();
    }
  }, [cameraActive, savedReport]);

  useEffect(() => {
    if (cameraActive) {
      const scanner = new Html5QrcodeScanner(
        'quick-audit-camera-container',
        { fps: 10, qrbox: { width: 280, height: 120 }, aspectRatio: 1.77 },
        false
      );

      scanner.render(
        (decodedText) => {
          let tag = decodedText.trim();
          if (tag.includes('/audit/scan/')) {
            const parts = tag.split('/audit/scan/');
            tag = parts[parts.length - 1];
          }
          processScan(tag);
        },
        () => {}
      );

      scannerRef.current = scanner;

      return () => {
        scanner.clear().catch(() => {});
      };
    }
  }, [cameraActive]);

  const loadExpected = async () => {
    try {
      setLoadingExpected(true);
      const assets = await api.getTargetExpectedAssets('USER', user.id);
      setExpectedAssets(assets);
    } catch (err) {
      console.error('Error cargando activos esperados del colaborador:', err);
    } finally {
      setLoadingExpected(false);
    }
  };

  const processScan = async (tagToScan: string) => {
    const cleanTag = tagToScan.trim();
    if (!cleanTag) return;

    try {
      setScanning(true);
      setFlashMessage(null);

      const res = await api.scanTargetAsset({
        campaign_id: campaignId || undefined,
        target_type: 'USER',
        target_id: user.id,
        target_name: user.full_name,
        asset_tag: cleanTag,
      });

      if (res.campaign_id) {
        setCampaignId(res.campaign_id);
      }

      const record: ScannedRecord = {
        assetId: res.asset.id,
        assetTag: res.asset.asset_tag,
        serialNumber: res.asset.serial_number,
        brand: res.asset.brand,
        model: res.asset.model,
        category: res.asset.category,
        discrepancyType: res.discrepancy_type as any,
        message: res.message,
        scannedAt: new Date(res.scanned_at),
      };

      setScannedRecords((prev) => {
        const filtered = prev.filter((r) => r.assetId !== res.asset.id);
        return [record, ...filtered];
      });

      if (res.discrepancy_type === 'MATCH') {
        setFlashMessage({
          type: 'success',
          text: `¡Correcto! ${res.asset.asset_tag} (${res.asset.model}) verificado como PRESENTE.`,
        });
      } else {
        setFlashMessage({
          type: 'warn',
          text: `Atención: ${res.message}`,
        });
      }

      setInputTag('');
    } catch (err: any) {
      setFlashMessage({
        type: 'error',
        text: err.message || 'Error al escanear activo',
      });
    } finally {
      setScanning(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processScan(inputTag);
  };

  // Reconciliar discrepancia
  const handleReconcile = async (assetId: string, action: 'ASSIGN_TO_TARGET' | 'MARK_LOST') => {
    try {
      await api.reconcileTargetAsset({
        campaign_id: campaignId || undefined,
        action,
        asset_id: assetId,
        target_type: 'USER',
        target_id: user.id,
        notes: action === 'ASSIGN_TO_TARGET' ? `Asignado a ${user.full_name} en auditoría física rápida` : 'Marcado como LOST',
      });

      await loadExpected();
      setFlashMessage({
        type: 'success',
        text: action === 'ASSIGN_TO_TARGET' ? 'Activo reasignado a este colaborador.' : 'Activo marcado como extraviado.',
      });
    } catch (err: any) {
      alert(err.message || 'Error al reconciliar activo');
    }
  };

  // Finalizar y Guardar Auditoría
  const handleFinish = async () => {
    if (!campaignId && scannedRecords.length === 0) {
      alert('Debes escanear al menos un equipo para registrar la auditoría.');
      return;
    }

    const verifiedCount = scannedRecords.filter((r) => r.discrepancyType === 'MATCH').length;
    const missingCount = expectedAssets.length - verifiedCount;
    const confirmMsg = `¿Guardar y cerrar la auditoría de ${user.full_name}?\n\n` +
      `• Equipos presentes verificados: ${verifiedCount}\n` +
      `• Equipos faltantes: ${missingCount}\n\n` +
      `Los datos quedarán guardados permanentemente en la base de datos de auditorías.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setFinishing(true);
      const camp = await api.finishTargetAudit({
        campaign_id: campaignId!,
        notes: `Auditoría física rápida para ${user.full_name} (${user.employee_code}). Presentes: ${verifiedCount}, Faltantes: ${missingCount}`,
      });

      setSavedReport(camp);
      if (onAuditFinished) onAuditFinished();
    } catch (err: any) {
      alert(err.message || 'Error cerrando auditoría');
    } finally {
      setFinishing(false);
    }
  };

  // Cálculos en vivo
  const verifiedAssetIds = scannedRecords
    .filter((r) => r.discrepancyType === 'MATCH')
    .map((r) => r.assetId);

  const unexpectedRecords = scannedRecords.filter((r) => r.discrepancyType !== 'MATCH');
  const totalExpected = expectedAssets.length;
  const verifiedCount = verifiedAssetIds.length;
  const percentComplete = totalExpected > 0 ? Math.round((verifiedCount / totalExpected) * 100) : 100;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'LAPTOP':
        return <Laptop className="w-4 h-4 text-sky-600" />;
      case 'DOCKING':
        return <Cpu className="w-4 h-4 text-teal-600" />;
      case 'MONITOR':
        return <Monitor className="w-4 h-4 text-indigo-600" />;
      case 'PERIPHERAL':
        return <Headphones className="w-4 h-4 text-amber-600" />;
      default:
        return <Box className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Cabecera del Modal */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Auditoría Física en Vivo: {user.full_name}
                </h3>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                  {user.employee_code}
                </span>
                {campaignId && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    Folio: {campaignId}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {user.department} • Sede: <strong>{user.location}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Progreso y Acciones */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex-1 max-w-md">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700">
                Equipos Verificados: <strong>{verifiedCount}</strong> de <strong>{totalExpected}</strong>
              </span>
              <span className="font-bold text-sky-700">{percentComplete}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-2.5 transition-all duration-300 rounded-full"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCameraActive(!cameraActive)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                cameraActive
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{cameraActive ? 'Cerrar Cámara' : 'Usar Cámara'}</span>
            </button>

            <button
              onClick={handleFinish}
              disabled={finishing || (!campaignId && scannedRecords.length === 0)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{finishing ? 'Guardando...' : 'Finalizar y Guardar Auditoría'}</span>
            </button>
          </div>
        </div>

        {/* Input de Escaneo Ultra Rápido (En Foco Automático) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0 space-y-2">
          {cameraActive && (
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col items-center mb-3">
              <div id="quick-audit-camera-container" className="w-full max-w-xs rounded-lg overflow-hidden bg-black" />
              <p className="text-[11px] text-slate-500 mt-2">Apunta la cámara al código de barras del activo.</p>
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                ref={inputRef}
                type="text"
                value={inputTag}
                onChange={(e) => setInputTag(e.target.value)}
                placeholder="Escanea con pistola lectora o escribe el Asset Tag (ej. IT-LAP-0010, S/N) y presiona Enter..."
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={!inputTag.trim() || scanning}
              className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition"
            >
              {scanning ? 'Verificando...' : 'Escanear'}
            </button>
          </form>

          {flashMessage && (
            <div
              className={`p-2.5 rounded-xl text-xs font-medium flex items-center justify-between border animate-in fade-in ${
                flashMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : flashMessage.type === 'warn'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {flashMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                )}
                <span>{flashMessage.text}</span>
              </div>
              <button
                onClick={() => setFlashMessage(null)}
                className="text-slate-400 hover:text-slate-600 ml-2 text-xs"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Lista de Equipos: Checklist Inmediato "Cuál Sí y Cuál No" */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Checklist de Equipos del Colaborador ({expectedAssets.length})
            </h4>
            <span className="text-[11px] text-slate-400">
              Escanea el código de cada equipo físico para confirmarlo
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {expectedAssets.map((ast) => {
              const isVerified = verifiedAssetIds.includes(ast.id);
              const verifiedRecord = scannedRecords.find((r) => r.assetId === ast.id && r.discrepancyType === 'MATCH');

              return (
                <div
                  key={ast.id}
                  className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                    isVerified
                      ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {getCategoryIcon(ast.category)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {ast.asset_tag}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {ast.category}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-700 mt-0.5">
                        {ast.brand} {ast.model}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400">
                        S/N: {ast.serial_number}
                      </p>
                    </div>
                  </div>

                  {/* Indicador de Presencia */}
                  <div className="flex items-center gap-3">
                    {isVerified ? (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
                          <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
                          <span>PRESENTE</span>
                        </span>
                        {verifiedRecord && (
                          <span className="block text-[10px] font-mono text-emerald-700 mt-1">
                            {verifiedRecord.scannedAt.toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          <Clock className="w-3.5 h-3.5" />
                          <span>NO ESCANEADO</span>
                        </span>

                        <button
                          onClick={() => processScan(ast.asset_tag)}
                          className="text-[11px] font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-2.5 py-1.5 rounded-lg border border-sky-200 transition"
                          title="Marcar manualmente si la etiqueta está ilegible"
                        >
                          Confirmar Manual
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {expectedAssets.length === 0 && !loadingExpected && (
              <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-slate-200">
                Este colaborador no tiene equipos asignados en el sistema lógico.
              </div>
            )}
          </div>

          {/* Discrepancias / Equipos Ajenos Escaneados */}
          {unexpectedRecords.length > 0 && (
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase">
                <AlertTriangle className="w-4 h-4" />
                <span>Equipos Adicionales o Ajenos Detectados ({unexpectedRecords.length})</span>
              </div>

              <div className="space-y-2">
                {unexpectedRecords.map((rec) => (
                  <div
                    key={rec.assetId}
                    className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{rec.assetTag}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                          {rec.discrepancyType}
                        </span>
                      </div>
                      <p className="text-slate-700 text-xs mt-0.5">
                        {rec.brand} {rec.model} (S/N: {rec.serialNumber})
                      </p>
                      <p className="text-amber-900 text-[11px] font-medium">{rec.message}</p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleReconcile(rec.assetId, 'ASSIGN_TO_TARGET')}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-xs transition"
                      >
                        <span>Asignar a {user.full_name.split(' ')[0]}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal del Acta de Auditoría Guardada */}
      {savedReport && (
        <AuditReportModal
          campaign={savedReport}
          onClose={() => {
            setSavedReport(null);
            onClose();
          }}
        />
      )}
    </div>
  );
};
