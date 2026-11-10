import React, { useState, useEffect } from 'react';
import { X, Printer, Upload, CheckCircle2, AlertCircle, FileText, Laptop, Shield, User } from 'lucide-react';
import { ResponsivaPayload } from '../types';
import { api } from '../api';

interface ResponsivaModalProps {
  userId: string;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

export const ResponsivaModal: React.FC<ResponsivaModalProps> = ({
  userId,
  onClose,
  onUploadSuccess,
}) => {
  const [data, setData] = useState<ResponsivaPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de subida
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    loadResponsivaData();
  }, [userId]);

  const loadResponsivaData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getResponsivaData(userId);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Error al obtener datos de la responsiva');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', userId);
      if (data?.pending_history_id) {
        formData.append('history_id', data.pending_history_id);
      }

      await api.uploadResponsiva(formData);
      setUploadSuccess(true);
      if (onUploadSuccess) onUploadSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al subir documento firmado');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in duration-200">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Carta de Responsiva de Equipo de Cómputo
              </h3>
              <p className="text-xs text-slate-500">
                Previsualización estructurada (Motor PDF desacoplado para Fase posterior)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading && (
            <div className="text-center py-12 text-slate-500 text-sm">
              Generando datos de responsiva...
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {data && (
            <div id="printable-content" className="space-y-6 bg-white p-2">
              {/* Encabezado Formal del Documento */}
              <div className="border border-slate-200 rounded-xl p-5 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      Documento Oficial de Asignación
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 mt-1">
                      Acta de Entrega-Recepción de Activos de TI
                    </h4>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-medium">Folio de Control:</p>
                    <p className="text-sm font-mono font-bold text-slate-900">{data.folio}</p>
                    <p className="text-[11px] text-slate-400">
                      Fecha: {new Date(data.generated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Datos del Colaborador */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Empleado:</span>
                    <span className="font-semibold text-slate-800">{data.employee.full_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Código:</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {data.employee.employee_code}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Departamento:</span>
                    <span className="font-semibold text-slate-800">{data.employee.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Ubicación / Sede:</span>
                    <span className="font-semibold text-slate-800">{data.employee.location}</span>
                  </div>
                </div>
              </div>

              {/* Equipo Primario (Laptop) */}
              {data.primary_laptop && (
                <div className="border border-sky-200 rounded-xl p-4 bg-sky-50/40">
                  <div className="flex items-center gap-2 mb-3">
                    <Laptop className="w-4 h-4 text-sky-700" />
                    <h5 className="text-xs font-bold text-sky-900 uppercase tracking-wide">
                      Equipo Primario Principal
                    </h5>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-sky-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Asset Tag:</span>
                      <span className="font-mono font-bold text-sky-800">
                        {data.primary_laptop.asset_tag}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Marca y Modelo:</span>
                      <span className="font-medium text-slate-800">
                        {data.primary_laptop.brand} {data.primary_laptop.model}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Número de Serie:</span>
                      <span className="font-mono text-slate-700">
                        {data.primary_laptop.serial_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Especificaciones:</span>
                      <span className="text-[11px] text-slate-600 truncate block">
                        {typeof data.primary_laptop.specs === 'object'
                          ? Object.entries(data.primary_laptop.specs)
                              .map(([k, v]) => `${k}: ${v}`)
                              .slice(0, 2)
                              .join(' | ')
                          : String(data.primary_laptop.specs)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Periféricos y Equipos Satélites */}
              <div className="border border-slate-200 rounded-xl p-4">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">
                  Equipos Satélites, Monitores y Periféricos Vinculados ({data.attached_assets.length})
                </h5>
                {data.attached_assets.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    No cuenta con periféricos ni dockings asignados actualmente.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-medium">
                          <th className="pb-2">Categoría</th>
                          <th className="pb-2">Asset Tag</th>
                          <th className="pb-2">Marca / Modelo</th>
                          <th className="pb-2">Número de Serie</th>
                          <th className="pb-2">Detalles / Specs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.attached_assets.map((ast) => (
                          <tr key={ast.id} className="hover:bg-slate-50">
                            <td className="py-2.5 font-medium text-slate-700">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                {ast.category}
                              </span>
                            </td>
                            <td className="py-2.5 font-mono font-semibold text-slate-900">
                              {ast.asset_tag}
                            </td>
                            <td className="py-2.5 text-slate-800">
                              {ast.brand} {ast.model}
                            </td>
                            <td className="py-2.5 font-mono text-slate-600">
                              {ast.serial_number}
                            </td>
                            <td className="py-2.5 text-slate-500 text-[11px] max-w-xs truncate">
                              {typeof ast.specs === 'object'
                                ? Object.entries(ast.specs)
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(', ')
                                : String(ast.specs)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Cláusulas y Términos */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-[11px] text-slate-600 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
                  <Shield className="w-3.5 h-3.5 text-sky-700" />
                  <span>Cláusulas de Custodia y Responsabilidad</span>
                </div>
                <p className="leading-relaxed">{data.terms_and_conditions}</p>
              </div>

              {/* Firmas de Conformidad */}
              <div className="grid grid-cols-2 gap-8 pt-8 pb-4">
                <div className="text-center">
                  <div className="border-b border-slate-400 pb-1 mb-2"></div>
                  <p className="text-xs font-semibold text-slate-800">{data.employee.full_name}</p>
                  <p className="text-[11px] text-slate-500">Firma del Colaborador (Receptor)</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    ID: {data.employee.employee_code}
                  </p>
                </div>
                <div className="text-center">
                  <div className="border-b border-slate-400 pb-1 mb-2"></div>
                  <p className="text-xs font-semibold text-slate-800">
                    Departamento de Tecnologías de la Información
                  </p>
                  <p className="text-[11px] text-slate-500">Firma de Entrega / Custodia TI</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Autorización Corporativa
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sección de Carga de Responsiva Firmada */}
          <div className="mt-6 border-t border-slate-200 pt-5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Upload className="w-4 h-4 text-sky-600" />
              <span>Adjuntar Carta Firmada (PDF o Escaneo)</span>
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Sube el archivo escaneado o firmado digitalmente para almacenar en{' '}
              <code className="text-sky-700 font-mono bg-sky-50 px-1 py-0.5 rounded">
                /app/data/uploads/
              </code>{' '}
              y cambiar el estado de la responsiva a <span className="font-semibold text-emerald-700">SIGNED</span>.
            </p>

            {uploadSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="font-bold block">¡Documento firmado registrado con éxito!</span>
                    <span>El estatus se ha actualizado a SIGNED en el historial inmutable.</span>
                  </div>
                </div>
                <button
                  onClick={() => setUploadSuccess(false)}
                  className="text-xs text-emerald-700 font-semibold underline"
                >
                  Subir otro
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpload} className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer w-full sm:w-auto"
                />
                <button
                  type="submit"
                  disabled={!file || uploading}
                  className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading ? 'Guardando en servidor...' : 'Subir y Marcar como SIGNED'}</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <span className="text-xs text-slate-500">
            Total activos incluidos: <strong>{data?.total_items || 0}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={!data}
              className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold px-4 py-2 rounded-lg shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Vista Previa</span>
            </button>
            <button
              onClick={onClose}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold px-4 py-2 rounded-lg"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
