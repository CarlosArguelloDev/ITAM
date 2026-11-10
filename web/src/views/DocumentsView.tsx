import React, { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  Upload,
  Download,
  Eye,
  RefreshCw,
  Search,
  ExternalLink,
} from 'lucide-react';
import { PendingResponsivaItem } from '../types';
import { api } from '../api';
import { ResponsivaModal } from '../components/ResponsivaModal';

export const DocumentsView: React.FC = () => {
  const [pending, setPending] = useState<PendingResponsivaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserIdForModal, setSelectedUserIdForModal] = useState<string | null>(null);

  // Subida directa
  const [uploadModalHistoryId, setUploadModalHistoryId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    try {
      setLoading(true);
      const data = await api.getPendingResponsivas();
      setPending(data);
    } catch (err) {
      console.error('Error cargando responsivas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadModalHistoryId) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('history_id', uploadModalHistoryId);

      await api.uploadResponsiva(formData);
      setUploadModalHistoryId(null);
      setUploadFile(null);
      loadPending();
    } catch (err: any) {
      alert(err.message || 'Error al subir responsiva firmada');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Control de Cartas de Responsiva de TI
          </h2>
          <p className="text-xs text-slate-500">
            Gestión de actas de entrega-recepción de hardware pendientes de firma y resguardo digital
          </p>
        </div>

        <button
          onClick={loadPending}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl border border-slate-200"
          title="Recargar"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Lista de Responsivas Pendientes de Firma */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Documentos Pendientes de Firma ({pending.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Estado de auditoría: <strong>PENDING</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-6">Colaborador / Empleado</th>
                <th className="py-3 px-4">Activo Asignado</th>
                <th className="py-3 px-4">Movimiento</th>
                <th className="py-3 px-4">Fecha de Asignación</th>
                <th className="py-3 px-4">Observaciones</th>
                <th className="py-3 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pending.map((p) => (
                <tr key={p.history_id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-6">
                    <span className="font-bold text-slate-900 block">
                      {p.user_name || 'Sin Asignar'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {p.employee_code || '-'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-mono font-bold text-sky-800 block">{p.asset_tag}</span>
                    <span className="text-[11px] text-slate-500">{p.asset_model}</span>
                  </td>

                  <td className="py-3.5 px-4 font-semibold text-slate-700">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px]">
                      {p.action_type}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-slate-500">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>

                  <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{p.notes}</td>

                  <td className="py-3.5 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {p.user_id && (
                        <button
                          onClick={() => setSelectedUserIdForModal(p.user_id!)}
                          className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-[11px] px-3 py-1.5 rounded-lg shadow-sm"
                          title="Previsualizar e imprimir responsiva"
                        >
                          <Eye className="w-3.5 h-3.5 text-sky-600" />
                          <span>Vista Previa</span>
                        </button>
                      )}

                      <button
                        onClick={() => setUploadModalHistoryId(p.history_id)}
                        className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] px-3 py-1.5 rounded-lg shadow-sm"
                        title="Subir archivo firmado"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Subir Firma</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {pending.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    ¡Excelente! No hay cartas de responsiva pendientes. Todo el hardware asignado está debidamente firmado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Responsiva Completa */}
      {selectedUserIdForModal && (
        <ResponsivaModal
          userId={selectedUserIdForModal}
          onClose={() => setSelectedUserIdForModal(null)}
          onUploadSuccess={loadPending}
        />
      )}

      {/* Modal Subida de Archivo Rápida */}
      {uploadModalHistoryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Adjuntar Documento Firmado</h3>
            <p className="text-xs text-slate-500">
              Selecciona el archivo digital (PDF o imagen escaneada con la firma del empleado) para guardar en servidor.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadModalHistoryId(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || uploading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg disabled:opacity-50"
                >
                  {uploading ? 'Guardando...' : 'Confirmar y Marcar SIGNED'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
