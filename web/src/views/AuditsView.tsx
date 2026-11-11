import React, { useState, useEffect, useRef } from 'react';
import {
  ClipboardCheck,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  History,
  Barcode,
  Camera,
  RefreshCw,
  Search,
  Eye,
  ShieldCheck,
  Check,
  Clock,
  ArrowRight,
  Laptop,
  Monitor,
  Cpu,
  Headphones,
  Box,
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { AuditCampaign, Asset } from '../types';
import { api } from '../api';
import { AuditReportModal } from '../components/AuditReportModal';

type AuditSubTab = 'HISTORY' | 'SITE_SCAN';

interface ScannedItemRecord {
  asset: Asset;
  discrepancyType: 'MATCH' | 'WRONG_LOCATION' | 'UNASSIGNED_LOCATION';
  message: string;
  scannedAt: Date;
}

export const AuditsView: React.FC = () => {
  const [subTab, setSubTab] = useState<AuditSubTab>('HISTORY');
  const [campaigns, setCampaigns] = useState<AuditCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReportCampaign, setSelectedReportCampaign] = useState<AuditCampaign | null>(null);

  // Estados para auditar por Sede / Site
  const [locations, setLocations] = useState<string[]>(['Site 1 TI', 'San Juan del Río', 'CDMX Central', 'Bodega de Sistemas']);
  const [selectedLocation, setSelectedLocation] = useState<string>('Site 1 TI');
  const [expectedSiteAssets, setExpectedSiteAssets] = useState<Asset[]>([]);
  const [siteCampaignId, setSiteCampaignId] = useState<string | null>(null);
  const [scannedRecords, setScannedRecords] = useState<ScannedItemRecord[]>([]);

  // Escáner
  const [inputTag, setInputTag] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'warn' | 'error'; text: string } | null>(null);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    loadCampaigns();
    loadLocations();
  }, []);

  useEffect(() => {
    if (subTab === 'SITE_SCAN') {
      loadExpectedSiteAssets();
    }
  }, [selectedLocation, subTab]);

  useEffect(() => {
    if (cameraActive && subTab === 'SITE_SCAN') {
      const scanner = new Html5QrcodeScanner(
        'site-audit-camera-container',
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
          processSiteScan(tag);
        },
        () => {}
      );

      scannerRef.current = scanner;

      return () => {
        scanner.clear().catch(() => {});
      };
    }
  }, [cameraActive, subTab, selectedLocation]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const data = await api.getCampaigns();
      setCampaigns(data);
    } catch (err) {
      console.error('Error cargando historial de auditorías:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const stats = await api.getStats().catch(() => null);
      if (stats?.location_counts) {
        const locs = Object.keys(stats.location_counts);
        if (!locs.includes('Site 1 TI')) locs.unshift('Site 1 TI');
        setLocations(locs);
      }
    } catch (err) {
      console.error('Error cargando ubicaciones:', err);
    }
  };

  const loadExpectedSiteAssets = async () => {
    setScannedRecords([]);
    setNotification(null);
    setSiteCampaignId(null);

    try {
      const assets = await api.getTargetExpectedAssets('LOCATION', selectedLocation);
      setExpectedSiteAssets(assets);
    } catch (err) {
      console.error('Error cargando equipos esperados en sede:', err);
      setExpectedSiteAssets([]);
    }
  };

  const processSiteScan = async (tag: string) => {
    const cleanTag = tag.trim();
    if (!cleanTag) return;

    try {
      setScanning(true);
      setNotification(null);

      const res = await api.scanTargetAsset({
        campaign_id: siteCampaignId || undefined,
        target_type: 'LOCATION',
        target_id: selectedLocation,
        target_name: selectedLocation,
        asset_tag: cleanTag,
      });

      if (res.campaign_id) {
        setSiteCampaignId(res.campaign_id);
      }

      const rec: ScannedItemRecord = {
        asset: res.asset,
        discrepancyType: res.discrepancy_type as any,
        message: res.message,
        scannedAt: new Date(res.scanned_at),
      };

      setScannedRecords((prev) => {
        const filtered = prev.filter((r) => r.asset.id !== res.asset.id);
        return [rec, ...filtered];
      });

      if (res.discrepancy_type === 'MATCH') {
        setNotification({
          type: 'success',
          text: `¡Correcto! ${res.asset.asset_tag} (${res.asset.model}) verificado en ${selectedLocation}.`,
        });
      } else {
        setNotification({
          type: 'warn',
          text: res.message,
        });
      }

      setInputTag('');
    } catch (err: any) {
      setNotification({
        type: 'error',
        text: err.message || 'Error al escanear activo',
      });
    } finally {
      setScanning(false);
    }
  };

  const handleFinishSiteAudit = async () => {
    if (!siteCampaignId && scannedRecords.length === 0) {
      alert('Debes escanear al menos un equipo antes de guardar la auditoría.');
      return;
    }

    const verifiedCount = scannedRecords.filter((r) => r.discrepancyType === 'MATCH').length;
    const missingCount = expectedSiteAssets.length - verifiedCount;
    const confirmMsg = `¿Deseas finalizar y guardar la auditoría de la sede "${selectedLocation}"?\n\n` +
      `• Verificados presentes: ${verifiedCount}\n` +
      `• Faltantes: ${missingCount}\n\n` +
      `Se registrará formalmente en el historial inmutable de auditorías.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setFinishing(true);
      const camp = await api.finishTargetAudit({
        campaign_id: siteCampaignId!,
        notes: `Auditoría física en sede ${selectedLocation}. Verificados: ${verifiedCount}, Faltantes: ${missingCount}`,
      });

      await loadCampaigns();
      setSelectedReportCampaign(camp);
      setSiteCampaignId(null);
      setScannedRecords([]);
      await loadExpectedSiteAssets();
    } catch (err: any) {
      alert(err.message || 'Error al finalizar auditoría');
    } finally {
      setFinishing(false);
    }
  };

  const handleViewReport = async (campaignId: string) => {
    try {
      const camp = await api.getCampaign(campaignId);
      setSelectedReportCampaign(camp);
    } catch (err: any) {
      alert(err.message || 'Error al obtener acta');
    }
  };

  // KPIs
  const totalAudits = campaigns.length;
  const closedAudits = campaigns.filter((c) => c.status === 'CLOSED').length;
  const inProgressAudits = campaigns.filter((c) => c.status === 'OPEN').length;

  const verifiedSiteAssetIds = scannedRecords
    .filter((r) => r.discrepancyType === 'MATCH')
    .map((r) => r.asset.id);
  const unexpectedSiteRecords = scannedRecords.filter((r) => r.discrepancyType !== 'MATCH');

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Cabecera Principal y Selector de Sub-pestañas */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Campañas e Historial de Auditorías
          </h2>
          <p className="text-xs text-slate-500">
            Registro formal e inmutable de auditorías físicas realizadas a colaboradores y sedes
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setSubTab('HISTORY')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              subTab === 'HISTORY'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 text-sky-600" />
            <span>Historial de Auditorías ({campaigns.length})</span>
          </button>

          <button
            onClick={() => setSubTab('SITE_SCAN')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              subTab === 'SITE_SCAN'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>Auditar por Sede / Site</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI de Auditoría */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Auditorías</span>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalAudits}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase">Concluidas / Cerradas</span>
          <p className="text-2xl font-bold text-emerald-700 mt-0.5">{closedAudits}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20">
          <span className="text-[11px] font-semibold text-amber-700 uppercase">En Proceso</span>
          <p className="text-2xl font-bold text-amber-700 mt-0.5">{inProgressAudits}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-sky-200 bg-sky-50/20">
          <span className="text-[11px] font-semibold text-sky-700 uppercase">Ubicaciones / Sedes</span>
          <p className="text-2xl font-bold text-sky-700 mt-0.5">{locations.length}</p>
        </div>
      </div>

      {subTab === 'HISTORY' ? (
        /* PESTAÑA 1: TABLA DE HISTORIAL DE AUDITORÍAS */
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Historial Inmutable de Auditorías Físicas ({campaigns.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Consulta los resultados, discrepancias detectadas y actas firmadas
              </p>
            </div>
            <button
              onClick={loadCampaigns}
              className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg"
              title="Recargar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-6">Folio / Campaña</th>
                  <th className="py-3 px-4">Objetivo Auditado</th>
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-3 text-center">Esperados</th>
                  <th className="py-3 px-3 text-center">Verificados</th>
                  <th className="py-3 px-3 text-center">Discrepancias</th>
                  <th className="py-3 px-3 text-center">Faltantes</th>
                  <th className="py-3 px-4 text-center">Estatus</th>
                  <th className="py-3 px-6 text-right">Acta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-900">
                      {c.id}
                      <span className="block font-sans font-normal text-[11px] text-slate-500">
                        {c.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {c.target_name || c.target_location}
                      <span className="block font-normal text-[10px] text-slate-400 uppercase">
                        {c.target_type === 'USER' ? 'Colaborador' : 'Sede'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-slate-800">
                      {c.total_expected || 0}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-emerald-700">
                      {c.total_matches || (c.total_scanned - c.discrepancies_count)}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-amber-700">
                      {c.discrepancies_count}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-red-700">
                      {c.total_missing || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center">
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
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => handleViewReport(c.id)}
                        className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-[11px] px-3 py-1.5 rounded-lg shadow-xs transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-600" />
                        <span>Ver Acta</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {campaigns.length === 0 && (
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
      ) : (
        /* PESTAÑA 2: AUDITAR POR SEDE / SITE */
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Barrido Físico de Sede / Site</h3>
                <p className="text-xs text-slate-500">
                  Selecciona la sede física para auditar todos los equipos que se encuentran en ella
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-700">Sede:</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleFinishSiteAudit}
                  disabled={finishing || (!siteCampaignId && scannedRecords.length === 0)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{finishing ? 'Guardando...' : 'Finalizar y Guardar Auditoría'}</span>
                </button>
              </div>
            </div>

            {/* Input Escáner */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Escanear activo presente en <strong>{selectedLocation}</strong>
                </span>
                <button
                  onClick={() => setCameraActive(!cameraActive)}
                  className="text-xs text-slate-600 hover:text-slate-900 border border-slate-300 px-3 py-1 rounded-lg flex items-center gap-1"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{cameraActive ? 'Cerrar Cámara' : 'Usar Cámara'}</span>
                </button>
              </div>

              {cameraActive && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center">
                  <div id="site-audit-camera-container" className="w-full max-w-xs rounded-lg overflow-hidden bg-black" />
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  processSiteScan(inputTag);
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Barcode className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={inputTag}
                    onChange={(e) => setInputTag(e.target.value)}
                    placeholder="Dispara con lector láser o escribe el Asset Tag..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
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

              {notification && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium border flex items-center justify-between ${
                    notification.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  <span>{notification.text}</span>
                  <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Checklist de Equipos de la Sede */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Inventario Esperado en {selectedLocation} ({expectedSiteAssets.length})
              </h4>
              <span className="text-xs text-slate-500 font-semibold">
                Verificados: <strong className="text-emerald-700">{verifiedSiteAssetIds.length}</strong> de {expectedSiteAssets.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 font-semibold text-[10px] uppercase">
                    <th className="py-2.5 px-6">Activo</th>
                    <th className="py-2.5 px-4">Número de Serie</th>
                    <th className="py-2.5 px-4">Custodio Actual</th>
                    <th className="py-2.5 px-4 text-center">Estatus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expectedSiteAssets.map((ast) => {
                    const isVerified = verifiedSiteAssetIds.includes(ast.id);
                    return (
                      <tr key={ast.id} className={isVerified ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}>
                        <td className="py-3 px-6">
                          <span className="font-mono font-bold text-slate-900 block">{ast.asset_tag}</span>
                          <span className="text-[11px] text-slate-500">{ast.brand} {ast.model}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{ast.serial_number}</td>
                        <td className="py-3 px-4 text-slate-700">{ast.assigned_to_name || 'En stock'}</td>
                        <td className="py-3 px-4 text-center">
                          {isVerified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <Check className="w-3 h-3" /> PRESENTE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                              <Clock className="w-3 h-3" /> PENDIENTE
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {expectedSiteAssets.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 text-xs italic">
                        No hay equipos asignados a esta sede.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Acta de Auditoría */}
      {selectedReportCampaign && (
        <AuditReportModal
          campaign={selectedReportCampaign}
          onClose={() => setSelectedReportCampaign(null)}
        />
      )}
    </div>
  );
};
