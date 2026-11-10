import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowLeftRight,
  Plus,
  Trash2,
} from 'lucide-react';
import { ResponsivaPayload, Asset } from '../types';
import { api } from '../api';

interface ResponsivaModalProps {
  userId: string;
  initialFormat?: 'ASIGNACION' | 'SWAP';
  onClose: () => void;
  onUploadSuccess?: () => void;
}

interface DeviceRow {
  device: string;
  serialNumber: string;
  condition: string;
  observations: string;
}

export const ResponsivaModal: React.FC<ResponsivaModalProps> = ({
  userId,
  initialFormat = 'ASIGNACION',
  onClose,
  onUploadSuccess,
}) => {
  const [formatType, setFormatType] = useState<'ASIGNACION' | 'SWAP'>(initialFormat);
  const [data, setData] = useState<ResponsivaPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Campos para formato de Asignación (Múltiples Equipos)
  const [deviceRows, setDeviceRows] = useState<DeviceRow[]>([]);
  const [jobTitle, setJobTitle] = useState('');

  // Campos para formato de Cambio (Swap)
  const [oldBrand, setOldBrand] = useState('Dell');
  const [oldModel, setOldModel] = useState('Latitude 5430');
  const [oldSerial, setOldSerial] = useState('');
  const [newBrand, setNewBrand] = useState('Dell');
  const [newModel, setNewModel] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [prevUser, setPrevUser] = useState('Stock de TI');

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

      setJobTitle(res.employee.department || 'Colaborador');

      // Construir tabla inicial de dispositivos asignados
      const rows: DeviceRow[] = [];
      if (res.primary_laptop) {
        rows.push({
          device: `${res.primary_laptop.brand} ${res.primary_laptop.model}`,
          serialNumber: res.primary_laptop.serial_number,
          condition: 'REFURBISHED',
          observations: typeof res.primary_laptop.specs === 'object' && res.primary_laptop.specs?.ram
            ? `${res.primary_laptop.specs.ram}, ${res.primary_laptop.specs.storage || ''}`
            : 'En buen estado operativo',
        });

        // Prefill swap
        setNewBrand(res.primary_laptop.brand);
        setNewModel(res.primary_laptop.model);
        setNewSerial(res.primary_laptop.serial_number);
      }

      res.attached_assets.forEach((ast) => {
        rows.push({
          device: `${ast.brand} ${ast.model} (${ast.category})`,
          serialNumber: ast.serial_number,
          condition: 'REFURBISHED',
          observations: ast.asset_tag,
        });
      });

      setDeviceRows(rows);
    } catch (err: any) {
      setError(err.message || 'Error al obtener datos de la responsiva');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDeviceRow = () => {
    setDeviceRows([
      ...deviceRows,
      { device: 'Dispositivo adicional', serialNumber: '', condition: 'REFURBISHED', observations: '' },
    ]);
  };

  const handleRemoveDeviceRow = (index: number) => {
    setDeviceRows(deviceRows.filter((_, i) => i !== index));
  };

  const handleDeviceChange = (index: number, field: keyof DeviceRow, value: string) => {
    const updated = [...deviceRows];
    updated[index][field] = value;
    setDeviceRows(updated);
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

  const today = new Date();
  const day = today.getDate();
  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const month = monthNames[today.getMonth()];
  const year = today.getFullYear();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[94vh] flex flex-col my-auto overflow-hidden animate-in fade-in duration-200">
        {/* Header Modal con Selector de Formato */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Formato de Responsiva — Optibelt de México S. de R.L. de C.V.
            </h3>
            <p className="text-xs text-slate-500">
              Colaborador: <strong>{data?.employee.full_name}</strong> ({data?.employee.employee_code})
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Formato */}
            <div className="flex bg-slate-200/70 p-1 rounded-xl">
              <button
                onClick={() => setFormatType('ASIGNACION')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  formatType === 'ASIGNACION'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Asignación de Equipos
              </button>
              <button
                onClick={() => setFormatType('SWAP')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  formatType === 'SWAP'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cambio de Laptop (Swap)
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading && (
            <div className="text-center py-12 text-slate-500 text-sm">
              Cargando datos del colaborador y equipos...
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {data && (
            <div id="printable-content" className="bg-white p-6 sm:p-8 border border-slate-200 rounded-xl font-serif text-slate-900 leading-relaxed shadow-sm text-sm space-y-6">
              {/* ============================================================== */}
              {/* FORMATO 1: RESPONSIVA DEL EQUIPO DE TRABAJO (ASIGNACIÓN)       */}
              {/* ============================================================== */}
              {formatType === 'ASIGNACION' ? (
                <>
                  <div className="text-right text-xs font-sans text-slate-600 mb-6">
                    San Juan del Río, Qro., a <strong>{day}</strong> de <strong>{month}</strong> del <strong>{year}</strong>
                  </div>

                  <div className="text-center font-bold text-base uppercase tracking-wider mb-6">
                    RESPONSIVA DEL EQUIPO DE TRABAJO
                  </div>

                  <p className="text-justify text-xs sm:text-sm">
                    Por medio de la presente confirmo la recepción del siguiente equipo de trabajo, reconociendo que en todo momento el mismo siempre formara parte del activo de <strong>Optibelt de México S. de R.L. de C.V.</strong>
                  </p>

                  {/* Tabla de Equipos Asignados */}
                  <div className="my-6 overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-slate-900 text-xs font-sans">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-900 font-bold uppercase text-[11px]">
                          <th className="border border-slate-900 p-2">DEVICE</th>
                          <th className="border border-slate-900 p-2">SERIAL NUMBER</th>
                          <th className="border border-slate-900 p-2">CONDITION</th>
                          <th className="border border-slate-900 p-2">OBSERVATIONS</th>
                          <th className="border border-slate-900 p-1 text-center print:hidden w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {deviceRows.map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-900">
                            <td className="border border-slate-900 p-2 font-medium">
                              <input
                                type="text"
                                value={row.device}
                                onChange={(e) => handleDeviceChange(idx, 'device', e.target.value)}
                                className="w-full bg-transparent border-0 focus:ring-1 focus:ring-sky-500 rounded p-1 font-sans text-xs"
                              />
                            </td>
                            <td className="border border-slate-900 p-2 font-mono">
                              <input
                                type="text"
                                value={row.serialNumber}
                                onChange={(e) => handleDeviceChange(idx, 'serialNumber', e.target.value)}
                                className="w-full bg-transparent border-0 focus:ring-1 focus:ring-sky-500 rounded p-1 font-mono text-xs"
                              />
                            </td>
                            <td className="border border-slate-900 p-2 uppercase">
                              <input
                                type="text"
                                value={row.condition}
                                onChange={(e) => handleDeviceChange(idx, 'condition', e.target.value)}
                                className="w-full bg-transparent border-0 focus:ring-1 focus:ring-sky-500 rounded p-1 font-sans text-xs font-semibold"
                              />
                            </td>
                            <td className="border border-slate-900 p-2 text-slate-600">
                              <input
                                type="text"
                                value={row.observations}
                                onChange={(e) => handleDeviceChange(idx, 'observations', e.target.value)}
                                placeholder="Notas opcionales"
                                className="w-full bg-transparent border-0 focus:ring-1 focus:ring-sky-500 rounded p-1 font-sans text-xs"
                              />
                            </td>
                            <td className="border border-slate-900 p-1 text-center print:hidden">
                              <button
                                onClick={() => handleRemoveDeviceRow(idx)}
                                className="text-slate-400 hover:text-red-600 p-1"
                                title="Eliminar fila"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="mt-2 text-right print:hidden">
                      <button
                        onClick={handleAddDeviceRow}
                        className="inline-flex items-center gap-1 text-xs text-sky-700 hover:text-sky-900 font-sans font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar otro dispositivo / accesorio</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-justify text-xs sm:text-sm mt-6">
                    Comprometiéndome a cuidarlo y a utilizarlo únicamente para las tareas relacionadas con mi puesto como{' '}
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="Puesto del colaborador"
                      className="border-b border-slate-900 px-1 font-bold text-center focus:outline-none font-sans text-xs sm:text-sm inline-block"
                    />
                    . En caso contrario, si esto resulta en algún daño al equipo, acepto pagar la reparación de la avería, así como reemplazar el equipo en caso de pérdida. Esta respuesta servirá como aceptación del pago, ya sea de forma directa o mediante deducción salarial en caso de separación del trabajo.
                  </p>

                  {/* Firma */}
                  <div className="pt-16 pb-4 text-center max-w-xs mx-auto">
                    <div className="border-b border-slate-900 mb-2"></div>
                    <p className="font-bold text-xs font-sans uppercase">{data.employee.full_name}</p>
                    <p className="text-xs font-sans text-slate-500">Nombre y Firma</p>
                    <p className="text-[11px] font-mono text-slate-400">ID: {data.employee.employee_code}</p>
                  </div>
                </>
              ) : (
                /* ============================================================== */
                /* FORMATO 2: CAMBIO Y ASIGNACIÓN DE LAPTOP (SWAP)                */
                /* ============================================================== */
                <>
                  <div className="text-right text-xs font-sans text-slate-600 mb-6">
                    San Juan del Rio, Qro. <strong>{day} de {month}</strong>, <strong>{year}</strong>
                  </div>

                  <div className="text-center font-bold text-base uppercase tracking-wider mb-6">
                    Cambio y Asignación de Laptop
                  </div>

                  <p className="text-justify text-xs sm:text-sm leading-relaxed">
                    Por medio de la presente, yo, <strong>{data.employee.full_name}</strong> en calidad de{' '}
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="Puesto / Departamento"
                      className="border-b border-slate-900 px-1 font-semibold text-center focus:outline-none font-sans text-xs sm:text-sm inline-block"
                    />
                    , entrego formalmente el equipo de marca{' '}
                    <input
                      type="text"
                      value={oldBrand}
                      onChange={(e) => setOldBrand(e.target.value)}
                      className="border-b border-slate-900 px-1 font-semibold text-center focus:outline-none font-sans text-xs sm:text-sm inline-block w-24"
                    />
                    , modelo{' '}
                    <input
                      type="text"
                      value={oldModel}
                      onChange={(e) => setOldModel(e.target.value)}
                      className="border-b border-slate-900 px-1 font-semibold text-center focus:outline-none font-sans text-xs sm:text-sm inline-block w-32"
                    />
                    , con el número de serie{' '}
                    <input
                      type="text"
                      value={oldSerial}
                      onChange={(e) => setOldSerial(e.target.value)}
                      placeholder="Serie del equipo anterior"
                      className="border-b border-slate-900 px-1 font-mono font-semibold text-center focus:outline-none text-xs sm:text-sm inline-block w-36"
                    />
                    , la cual ha sido propiedad de <strong>Optibelt de Mexico S. de R.L. de C.V.</strong> y se encuentra en buenas condiciones de funcionamiento.
                  </p>

                  <p className="text-justify text-xs sm:text-sm mt-4 font-semibold">
                    En correspondencia con este acto de entrega, solicito recibir en su lugar el siguiente equipo:
                  </p>

                  {/* Campos del nuevo equipo recibido */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-300 font-sans text-xs space-y-2 max-w-md mx-auto my-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Marca:</span>
                      <input
                        type="text"
                        value={newBrand}
                        onChange={(e) => setNewBrand(e.target.value)}
                        className="bg-white border border-slate-300 rounded px-2 py-1 font-semibold text-right"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Modelo:</span>
                      <input
                        type="text"
                        value={newModel}
                        onChange={(e) => setNewModel(e.target.value)}
                        className="bg-white border border-slate-300 rounded px-2 py-1 font-semibold text-right"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Número de serie:</span>
                      <input
                        type="text"
                        value={newSerial}
                        onChange={(e) => setNewSerial(e.target.value)}
                        className="bg-white border border-slate-300 rounded px-2 py-1 font-mono font-semibold text-right"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Previo Usuario:</span>
                      <input
                        type="text"
                        value={prevUser}
                        onChange={(e) => setPrevUser(e.target.value)}
                        placeholder="Ej. Stock de IT o Nombre previo"
                        className="bg-white border border-slate-300 rounded px-2 py-1 text-right"
                      />
                    </div>
                  </div>

                  <p className="text-justify text-xs sm:text-sm mt-4">
                    Esta solicitud de intercambio se realiza de acuerdo con los términos acordados previamente entre ambas partes y con el objetivo de mantener actualizado el inventario de activos tecnológicos de nuestra institución.
                  </p>

                  {/* Firmas duales */}
                  <div className="grid grid-cols-2 gap-8 pt-16 pb-4 font-sans text-center">
                    <div>
                      <div className="border-b border-slate-900 mb-2"></div>
                      <p className="text-xs font-bold text-slate-900">Nombre y Firma responsable de IT</p>
                      <p className="text-[10px] text-slate-400">Optibelt de México</p>
                    </div>
                    <div>
                      <div className="border-b border-slate-900 mb-2"></div>
                      <p className="text-xs font-bold text-slate-900">{data.employee.full_name}</p>
                      <p className="text-xs text-slate-500">Nombre y Firma de quien solicita</p>
                      <p className="text-[10px] font-mono text-slate-400">ID: {data.employee.employee_code}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Sección de Carga de Archivo Firmado */}
          <div className="mt-6 border-t border-slate-200 pt-5 print:hidden">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Upload className="w-4 h-4 text-sky-600" />
              <span>Adjuntar Carta Firmada (PDF o Imagen Escaneada)</span>
            </h4>

            {uploadSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="font-bold block">Documento firmado guardado correctamente.</span>
                    <span>El estatus se ha actualizado a SIGNED.</span>
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
                  <span>{uploading ? 'Guardando...' : 'Subir Documento Firmado'}</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <span className="text-xs text-slate-500">
            Formato oficial: <strong>{formatType === 'ASIGNACION' ? 'Responsiva de Asignación' : 'Cambio y Asignación de Laptop'}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={!data}
              className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold px-4 py-2 rounded-lg shadow-sm"
            >
              <Printer className="w-4 h-4 text-sky-600" />
              <span>Imprimir Formato</span>
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
