import React, { useState, useEffect, useRef } from 'react';
import {
  User as UserIcon,
  MapPin,
  QrCode,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Laptop,
  Monitor,
  Cpu,
  Headphones,
  Box,
  RefreshCw,
  Check,
  ArrowRight,
  ShieldCheck,
  Zap,
  History,
  FileText,
  Printer,
  Eye,
  CheckCheck,
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { User, Asset, AuditCampaign } from '../types';
import { api } from '../api';
import { AuditReportModal } from '../components/AuditReportModal';

type AuditMode = 'USER' | 'LOCATION';
type SubTab = 'ACTIVE' | 'HISTORY';

interface ScannedItemRecord {
  asset: Asset;
  discrepancyType: 'MATCH' | 'WRONG_USER' | 'WRONG_LOCATION' | 'UNASSIGNED' | 'UNASSIGNED_LOCATION';
  message: string;
  scannedAt: Date;
}

export const DiscrepanciesView: React.FC<{ onOpenScanner?: () => void }> = () => {
  const [subTab, setSubTab] = useState<SubTab>('ACTIVE');
  const [mode, setMode] = useState<AuditMode>('USER');

  // Datos de apoyo
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  // Objetivo seleccionado
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('Site 1 TI');

  // Campaña / Sesión activa en base de datos
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  // Inventario esperado y escaneado
  const [expectedAssets, setExpectedAssets] = useState<Asset[]>([]);
  const [scannedRecords, setScannedRecords] = useState<ScannedItemRecord[]>([]);

  // Escáner en vivo
  const [inputTag, setInputTag] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [lastNotification, setLastNotification] = useState<{ type: 'success' | 'warn' | 'error'; message: string } | null>(null);

  // Historial de auditorías pasadas
  const [campaignsHistory, setCampaignsHistory] = useState<AuditCampaign[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedReportCampaign, setSelectedReportCampaign] = useState<AuditCampaign | null>(null);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    loadInitialData();
    loadHistory();
  }, []);

  useEffect(() => {
    loadExpected();
  }, [mode, selectedUserId, selectedLocation]);

  useEffect(() => {
    if (cameraActive && subTab === 'ACTIVE') {
      const scanner = new Html5QrcodeScanner(
        'target-camera-container',
        { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
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
  }, [cameraActive, mode, selectedUserId, selectedLocation, subTab]);

  const loadInitialData = async () => {
    try {
      const [allUsers, stats] = await Promise.all([
        api.getUsers({ active: true }),
        api.getStats().catch(() => null),
      ]);
      setUsers(allUsers);
      if (allUsers.length > 0) {
        setSelectedUserId(allUsers[0].id);
      }

      if (stats?.location_counts) {
        const locs = Object.keys(stats.location_counts);
        if (!locs.includes('Site 1 TI')) locs.unshift('Site 1 TI');
        setLocations(locs);
      } else {
        setLocations(['Site 1 TI', 'CDMX Central', 'Monterrey Hub', 'Bodega de Sistemas']);
      }
    } catch (err) {
      console.error('Error cargando datos de auditoría:', err);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await api.getCampaigns();
      setCampaignsHistory(data);
    } catch (err) {
      console.error('Error cargando historial de auditorías:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadExpected = async () => {
    setScannedRecords([]);
    setLastNotification(null);
    setActiveCampaignId(null);

    const target = mode === 'USER' ? selectedUserId : selectedLocation;
    if (!target) {
      setExpectedAssets([]);
      return;
    }

    try {
      const assets = await api.getTargetExpectedAssets(mode, target);
      setExpectedAssets(assets);
    } catch (err) {
      console.error('Error cargando inventario esperado:', err);
      setExpectedAssets([]);
    }
  };

  const getTargetName = () => {
    if (mode === 'USER') {
      const u = users.find((user) => user.id === selectedUserId);
      return u ? `${u.full_name} (${u.employee_code})` : 'Colaborador';
    }
    return selectedLocation;
  };

  const processScan = async (tagToScan: string) => {
    const cleanTag = tagToScan.trim();
    if (!cleanTag) return;

    const targetId = mode === 'USER' ? selectedUserId : selectedLocation;
    const targetName = getTargetName();

    try {
      setScanning(true);
      setLastNotification(null);

      const res = await api.scanTargetAsset({
        campaign_id: activeCampaignId || undefined,
        target_type: mode,
        target_id: targetId,
        target_name: targetName,
        asset_tag: cleanTag,
      });

      // Guardar el campaign_id activo asignado por el backend
      if (res.campaign_id) {
        setActiveCampaignId(res.campaign_id);
      }

      const newRecord: ScannedItemRecord = {
        asset: res.asset,
        discrepancyType: res.discrepancy_type,
        message: res.message,
        scannedAt: new Date(res.scanned_at),
      };

      setScannedRecords((prev) => {
        const filtered = prev.filter((r) => r.asset.id !== res.asset.id);
        return [newRecord, ...filtered];
      });

      if (res.discrepancy_type === 'MATCH') {
        setLastNotification({
          type: 'success',
          message: `¡Verificado en base de datos! ${res.asset.asset_tag} (${res.asset.model}) coincide correctamente.`,
        });
      } else {
        setLastNotification({
          type: 'warn',
          message: `Discrepancia registrada: ${res.message}`,
        });
      }

      setInputTag('');
    } catch (err: any) {
      setLastNotification({
        type: 'error',
        message: err.message || 'Error al escanear activo',
      });
    } finally {
      setScanning(false);
    }
  };

  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    processScan(inputTag);
  };

  // Reconciliación en 1 clic
  const handleReconcile = async (assetId: string, action: 'ASSIGN_TO_TARGET' | 'MARK_LOST') => {
    const targetId = mode === 'USER' ? selectedUserId : selectedLocation;
    try {
      await api.reconcileTargetAsset({
        campaign_id: activeCampaignId || undefined,
        action,
        asset_id: assetId,
        target_type: mode,
        target_id: targetId,
        notes: action === 'ASSIGN_TO_TARGET' ? `Asignado a ${getTargetName()} en auditoría física` : 'Marcado como LOST en auditoría',
      });

      await loadExpected();
      setLastNotification({
        type: 'success',
        message: action === 'ASSIGN_TO_TARGET' ? 'Activo reasignado a este objetivo exitosamente.' : 'Activo marcado como LOST.',
      });
    } catch (err: any) {
      alert(err.message || 'Error al reconciliar activo');
    }
  };

  // Finalizar y Guardar Auditoría en SQLite de forma inmutable
  const handleFinishAudit = async () => {
    if (!activeCampaignId && scannedRecords.length === 0) {
      alert('Debes escanear al menos un equipo antes de cerrar la auditoría.');
      return;
    }

    const missingCount = expectedAssets.length - verifiedAssetIds.length;
    const confirmMsg = `¿Deseas cerrar y guardar formalmente esta auditoría de ${getTargetName()}?\n\n` +
      `• Equipos verificados: ${verifiedAssetIds.length}\n` +
      `• Equipos faltantes: ${missingCount}\n` +
      `• Discrepancias encontradas: ${unexpectedScannedRecords.length}\n\n` +
      `Los resultados se guardarán permanentemente en la base de datos SQLite y en el historial de cada equipo.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setFinishing(true);
      const finishedCampaign = await api.finishTargetAudit({
        campaign_id: activeCampaignId!,
        notes: `Auditoría física completada para ${getTargetName()}. Verificados: ${verifiedAssetIds.length}, Faltantes: ${missingCount}`,
      });

      // Recargar historial y mostrar acta
      await loadHistory();
      setSelectedReportCampaign(finishedCampaign);

      // Limpiar sesión activa
      setActiveCampaignId(null);
      setScannedRecords([]);
      await loadExpected();
    } catch (err: any) {
      alert(err.message || 'Error al finalizar auditoría');
    } finally {
      setFinishing(false);
    }
  };

  // Ver acta histórica
  const handleViewHistoricalReport = async (campaignId: string) => {
    try {
      const camp = await api.getCampaign(campaignId);
      setSelectedReportCampaign(camp);
    } catch (err: any) {
      alert(err.message || 'Error al consultar acta de auditoría');
    }
  };

  // Conteos
  const verifiedAssetIds = scannedRecords
    .filter((r) => r.discrepancyType === 'MATCH')
    .map((r) => r.asset.id);

  const missingExpectedAssets = expectedAssets.filter((a) => !verifiedAssetIds.includes(a.id));
  const unexpectedScannedRecords = scannedRecords.filter((r) => r.discrepancyType !== 'MATCH');

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'LAPTOP':
        return <Laptop className="w-4 h-4 text-sky-600" />;
      case 'MONITOR':
        return <Monitor className="w-4 h-4 text-indigo-600" />;
      case 'DOCKING':
        return <Cpu className="w-4 h-4 text-teal-600" />;
      case 'PERIPHERAL':
        return <Headphones className="w-4 h-4 text-amber-600" />;
      default:
        return <Box className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Selector de Sub-pestañas: Auditoría Activa vs Historial Guardado */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Control de Auditorías Físicas</h2>
          <p className="text-xs text-slate-500">
            Barrido físico de hardware, detección de discrepancias y actas guardadas en base de datos
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setSubTab('ACTIVE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              subTab === 'ACTIVE'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4 text-sky-600" />
            <span>Auditar en Vivo</span>
          </button>
          <button
            onClick={() => {
              setSubTab('HISTORY');
              loadHistory();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              subTab === 'HISTORY'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 text-emerald-600" />
            <span>Historial Guardado ({campaignsHistory.length})</span>
          </button>
        </div>
      </div>

      {subTab === 'ACTIVE' ? (
        <div className="space-y-6">
          {/* 1. Selector Principal: Auditar por Colaborador o por Sede/Site */}
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Seleccionar Objetivo a Auditar</h3>
                <p className="text-xs text-slate-500">
                  Indica si auditarás los equipos asignados a un <strong>Colaborador</strong> o los presentes en una <strong>Sede / Locación</strong>.
                </p>
              </div>

              {/* Toggle Modo */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => {
                    setMode('USER');
                    setCameraActive(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    mode === 'USER'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserIcon className="w-4 h-4 text-sky-600" />
                  <span>Por Colaborador</span>
                </button>
                <button
                  onClick={() => {
                    setMode('LOCATION');
                    setCameraActive(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    mode === 'LOCATION'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>Por Sede / Site</span>
                </button>
              </div>
            </div>

            {/* Selector del Objetivo Específico */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {mode === 'USER' ? (
                <div className="flex-1 flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-700 shrink-0">Colaborador:</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.employee_code}) — {u.department} ({u.location})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-700 shrink-0">Sede / Site:</label>
                  <div className="flex-1 flex gap-2">
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      {locations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="O ingresa nuevo Site..."
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          setSelectedLocation(e.target.value.trim());
                        }
                      }}
                      className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={loadExpected}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl border border-slate-200"
                title="Recargar inventario"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. Barra de Métricas y Notificaciones */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Esperados</span>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{expectedAssets.length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase">Verificados (Match)</span>
              <p className="text-2xl font-bold text-emerald-700 mt-0.5">{verifiedAssetIds.length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20">
              <span className="text-[11px] font-semibold text-amber-700 uppercase">Pendientes</span>
              <p className="text-2xl font-bold text-amber-700 mt-0.5">{missingExpectedAssets.length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-red-200 bg-red-50/20">
              <span className="text-[11px] font-semibold text-red-700 uppercase">Discrepancias / Hallados</span>
              <p className="text-2xl font-bold text-red-700 mt-0.5">{unexpectedScannedRecords.length}</p>
            </div>
          </div>

          {lastNotification && (
            <div
              className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between border ${
                lastNotification.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : lastNotification.type === 'warn'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {lastNotification.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{lastNotification.message}</span>
              </div>
              <button onClick={() => setLastNotification(null)} className="text-slate-400 hover:text-slate-600">
                ×
              </button>
            </div>
          )}

          {/* 3. Panel de Escaneo Activo y Botón de Finalizar Auditoría */}
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Escanear Activo en {getTargetName()}
                </h3>
                {activeCampaignId && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    Folio: {activeCampaignId}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setCameraActive(!cameraActive)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    cameraActive
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{cameraActive ? 'Ocultar Cámara' : 'Usar Cámara'}</span>
                </button>

                {/* BOTÓN PRINCIPAL DE GUARDAR AUDITORÍA */}
                <button
                  onClick={handleFinishAudit}
                  disabled={finishing || (!activeCampaignId && scannedRecords.length === 0)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
                  title="Cierra y guarda la auditoría en base de datos"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{finishing ? 'Guardando...' : 'Guardar y Finalizar Auditoría'}</span>
                </button>
              </div>
            </div>

            {cameraActive && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center">
                <div id="target-camera-container" className="w-full max-w-sm rounded-lg overflow-hidden bg-black" />
                <p className="text-[11px] text-slate-500 mt-2">Apunta la cámara al código QR de la etiqueta.</p>
              </div>
            )}

            <form onSubmit={handleManualScan} className="flex gap-2">
              <div className="relative flex-1">
                <QrCode className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={inputTag}
                  onChange={(e) => setInputTag(e.target.value)}
                  placeholder="Escribe o dispara con lector láser el Asset Tag (ej. IT-LAP-0010) o Número de Serie..."
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={!inputTag.trim() || scanning}
                className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition"
              >
                {scanning ? 'Verificando...' : 'Escanear'}
              </button>
            </form>
          </div>

          {/* 4. Tablas: Inventario Esperado + Discrepancias Halladas */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Inventario Esperado */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Inventario Esperado ({expectedAssets.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Equipos que según el sistema deben encontrarse aquí
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 font-medium text-[10px] uppercase">
                      <th className="py-2.5 px-4">Activo</th>
                      <th className="py-2.5 px-3">Serie</th>
                      <th className="py-2.5 px-3">Estatus Auditoría</th>
                      <th className="py-2.5 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expectedAssets.map((ast) => {
                      const isVerified = verifiedAssetIds.includes(ast.id);
                      return (
                        <tr key={ast.id} className={isVerified ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {getCategoryIcon(ast.category)}
                              <div>
                                <span className="font-mono font-bold text-slate-900 block">{ast.asset_tag}</span>
                                <span className="text-[11px] text-slate-500">{ast.brand} {ast.model}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600">{ast.serial_number}</td>
                          <td className="py-3 px-3">
                            {isVerified ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <Check className="w-3 h-3" /> PRESENTE
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                Pendiente
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {!isVerified && (
                              <button
                                onClick={() => handleReconcile(ast.id, 'MARK_LOST')}
                                className="text-[10px] font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded"
                                title="Marcar como no localizado / extraviado"
                              >
                                Marcar LOST
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {expectedAssets.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                          No hay equipos registrados lógicamente para este objetivo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Equipos Inesperados / Discrepancias Halladas */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Discrepancias Halladas ({unexpectedScannedRecords.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Equipos escaneados que no pertenecían a este objetivo
                  </p>
                </div>
              </div>

              <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                {unexpectedScannedRecords.map((rec) => (
                  <div
                    key={rec.asset.id}
                    className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-mono font-bold text-slate-900">{rec.asset.asset_tag}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        {rec.discrepancyType}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-700">{rec.asset.brand} {rec.asset.model} (S/N: {rec.asset.serial_number})</p>
                    <p className="text-[11px] text-amber-900 font-medium">{rec.message}</p>

                    <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {rec.scannedAt.toLocaleTimeString()}
                      </span>
                      <button
                        onClick={() => handleReconcile(rec.asset.id, 'ASSIGN_TO_TARGET')}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm"
                      >
                        <span>Asignar a {mode === 'USER' ? 'Colaborador' : 'Site'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {unexpectedScannedRecords.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    No se han detectado equipos ajenos o sin asignar en esta sesión.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* HISTORIAL DE AUDITORÍAS GUARDADAS */
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Historial Inmutable de Auditorías Físicas ({campaignsHistory.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Registro persistente de todas las campañas y barridos realizados
              </p>
            </div>
            <button
              onClick={loadHistory}
              className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg"
              title="Recargar historial"
            >
              <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 font-medium text-[10px] uppercase">
                  <th className="py-3 px-6">Folio / Campaña</th>
                  <th className="py-3 px-4">Objetivo Auditado</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-3 text-center">Esperados</th>
                  <th className="py-3 px-3 text-center">Verificados</th>
                  <th className="py-3 px-3 text-center">Discrepancias</th>
                  <th className="py-3 px-3 text-center">Faltantes</th>
                  <th className="py-3 px-4">Estatus</th>
                  <th className="py-3 px-6 text-right">Acta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaignsHistory.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3 px-6 font-mono font-bold text-slate-900">
                      {c.id}
                      <span className="block font-sans font-normal text-[11px] text-slate-500">
                        {c.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {c.target_name || c.target_location}
                      <span className="block font-normal text-[10px] text-slate-500 uppercase">
                        {c.target_type === 'USER' ? 'Colaborador' : 'Sede'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800">
                      {c.total_expected || 0}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700">
                      {c.total_matches || c.total_scanned - c.discrepancies_count}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-amber-700">
                      {c.discrepancies_count}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-red-700">
                      {c.total_missing || 0}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          c.status === 'CLOSED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {c.status === 'CLOSED' ? 'CERRADA' : 'EN PROCESO'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <button
                        onClick={() => handleViewHistoricalReport(c.id)}
                        className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-[11px] px-3 py-1.5 rounded-lg shadow-sm ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-600" />
                        <span>Ver Acta</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {campaignsHistory.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 text-xs italic">
                      Aún no hay auditorías registradas en la base de datos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal del Acta de Auditoría Guardada */}
      {selectedReportCampaign && (
        <AuditReportModal
          campaign={selectedReportCampaign}
          onClose={() => setSelectedReportCampaign(null)}
        />
      )}
    </div>
  );
};
