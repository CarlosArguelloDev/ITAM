import React from 'react';
import { X, Printer, CheckCircle2, AlertTriangle, XCircle, FileText, Building2, User, Calendar } from 'lucide-react';
import { AuditCampaign } from '../types';

interface AuditReportModalProps {
  campaign: AuditCampaign;
  onClose: () => void;
}

export const AuditReportModal: React.FC<AuditReportModalProps> = ({ campaign, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const matches = (campaign.scans || []).filter((s) => s.discrepancy_type === 'MATCH');
  const discrepancies = (campaign.scans || []).filter(
    (s) => s.discrepancy_type !== 'MATCH' && s.discrepancy_type !== 'MISSING'
  );
  const missing = (campaign.scans || []).filter((s) => s.discrepancy_type === 'MISSING');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header Toolbar (no imprimible) */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">Acta de Auditoría de Hardware</h3>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
              {campaign.id}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Acta</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body (Imprimible) */}
        <div className="p-8 overflow-y-auto space-y-6 text-slate-800 text-xs print:p-0 print:overflow-visible">
          {/* Encabezado Corporativo */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                Optibelt de México S. de R.L. de C.V.
              </h1>
              <p className="text-xs font-semibold text-slate-600">
                Departamento de Tecnologías de la Información (TI) • Control de Custodia
              </p>
              <p className="text-[11px] text-slate-500">
                Sede / Planta: San Juan del Río, Querétaro
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                FOLIO DE AUDITORÍA
              </span>
              <span className="font-mono text-base font-black text-slate-900">{campaign.id}</span>
              <span className={`block text-[10px] font-bold uppercase mt-1 px-2 py-0.5 rounded ${
                campaign.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {campaign.status === 'CLOSED' ? 'AUDITORÍA CONCLUIDA' : 'EN PROCESO'}
              </span>
            </div>
          </div>

          {/* Ficha de la Auditoría */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Objetivo Auditado</span>
              <span className="font-bold text-slate-900 text-xs">{campaign.target_name || campaign.name}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Tipo</span>
              <span className="font-semibold text-slate-800 text-xs">
                {campaign.target_type === 'USER' ? 'Colaborador / Personal' : 'Sede / Locación'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Fecha Inicio</span>
              <span className="font-mono text-slate-700 text-xs">
                {new Date(campaign.created_at).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Fecha Conclusión</span>
              <span className="font-mono text-slate-700 text-xs">
                {campaign.closed_at ? new Date(campaign.closed_at).toLocaleString() : 'En proceso'}
              </span>
            </div>
          </div>

          {/* Resumen Numérico de Resultados */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Esperados</span>
              <span className="text-xl font-black text-slate-900">{campaign.total_expected || 0}</span>
            </div>
            <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/40">
              <span className="text-[10px] text-emerald-700 font-bold uppercase block">Verificados (OK)</span>
              <span className="text-xl font-black text-emerald-700">{campaign.total_matches || matches.length}</span>
            </div>
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/40">
              <span className="text-[10px] text-amber-700 font-bold uppercase block">Discrepancias</span>
              <span className="text-xl font-black text-amber-700">{campaign.discrepancies_count || discrepancies.length}</span>
            </div>
            <div className="p-3 rounded-lg border border-red-200 bg-red-50/40">
              <span className="text-[10px] text-red-700 font-bold uppercase block">Faltantes</span>
              <span className="text-xl font-black text-red-700">{campaign.total_missing || missing.length}</span>
            </div>
          </div>

          {/* Tabla de Activos Auditados */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Detalle de Equipos Auditados
            </h4>
            <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                <tr>
                  <th className="py-2 px-3 border-b">Asset Tag</th>
                  <th className="py-2 px-3 border-b">Equipo / Modelo</th>
                  <th className="py-2 px-3 border-b">Número de Serie</th>
                  <th className="py-2 px-3 border-b">Resultado</th>
                  <th className="py-2 px-3 border-b">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {(campaign.scans || []).map((sc) => {
                  let badge = 'bg-slate-100 text-slate-700';
                  let icon = null;
                  if (sc.discrepancy_type === 'MATCH') {
                    badge = 'bg-emerald-100 text-emerald-800';
                    icon = <CheckCircle2 className="w-3 h-3 text-emerald-600 inline mr-1" />;
                  } else if (sc.discrepancy_type === 'MISSING') {
                    badge = 'bg-red-100 text-red-800';
                    icon = <XCircle className="w-3 h-3 text-red-600 inline mr-1" />;
                  } else {
                    badge = 'bg-amber-100 text-amber-800';
                    icon = <AlertTriangle className="w-3 h-3 text-amber-600 inline mr-1" />;
                  }

                  return (
                    <tr key={sc.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{sc.asset_tag}</td>
                      <td className="py-2 px-3">{sc.asset_brand} {sc.asset_model}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{sc.id ? sc.asset_id : '-'}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded ${badge}`}>
                          {icon}
                          {sc.discrepancy_type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{sc.notes || '-'}</td>
                    </tr>
                  );
                })}
                {(!campaign.scans || campaign.scans.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                      No hay registros de escaneo en esta sesión.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Notas Generales */}
          {campaign.notes && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Notas de la Auditoría:</span>
              <p className="text-slate-700">{campaign.notes}</p>
            </div>
          )}

          {/* Firmas de Conformidad */}
          <div className="pt-10 grid grid-cols-2 gap-12 text-center text-xs">
            <div>
              <div className="border-t border-slate-400 pt-2 font-bold text-slate-900">
                Auditor de TI / Sistemas
              </div>
              <p className="text-[10px] text-slate-500">Nombre, Firma y Fecha</p>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-2 font-bold text-slate-900">
                {campaign.target_type === 'USER' ? 'Colaborador Auditado' : 'Responsable de Sede'}
              </div>
              <p className="text-[10px] text-slate-500">{campaign.target_name || 'Nombre, Firma y Fecha'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
