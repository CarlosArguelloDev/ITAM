import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Asset, AssetCategory, AssetStatus, User, LocationType, Department } from '../types';
import { api } from '../api';

const CATEGORY_OPTIONS: { value: AssetCategory; label: string }[] = [
  { value: 'LAPTOP', label: 'Laptop / Portátil' },
  { value: 'MONITOR', label: 'Monitor' },
  { value: 'DOCKING', label: 'Docking Station' },
  { value: 'WORKSTATION', label: 'Workstation / Desktop' },
  { value: 'AUDIFONOS', label: 'Audífonos / Headset' },
  { value: 'TELEFONO', label: 'Teléfono Móvil' },
  { value: 'TELEFONO FIJO', label: 'Teléfono Fijo' },
  { value: 'SIM-CARD', label: 'SIM Card' },
  { value: 'IMPRESORA', label: 'Impresora' },
  { value: 'SCANNER', label: 'Escáner' },
  { value: 'IPAD', label: 'iPad / Tablet' },
  { value: 'FIREWALL', label: 'Firewall' },
  { value: 'SWITCH', label: 'Switch de Red' },
  { value: 'ACCESS POINT', label: 'Access Point' },
  { value: 'SERVER', label: 'Servidor' },
  { value: 'NVR', label: 'NVR' },
  { value: 'DVR', label: 'DVR' },
  { value: 'ROUTER', label: 'Router' },
  { value: 'NO-BREAK', label: 'No-Break / UPS' },
  { value: 'PDU', label: 'PDU' },
  { value: 'PROYECTOR', label: 'Proyector' },
  { value: 'TELEVISION', label: 'Televisión' },
  { value: 'TRITURADORA', label: 'Trituradora' },
  { value: 'CONTROL TV', label: 'Control Remoto TV' },
  { value: 'CONVERTIDOR DE MEDIOS', label: 'Convertidor de Medios' },
  { value: 'GOPRO', label: 'Cámara / GoPro' },
  { value: 'RACK MOUNT TRAY', label: 'Rack Mount Tray' },
  { value: 'ADAPTADOR DE RED', label: 'Adaptador de Red' },
  { value: 'BOCINA', label: 'Bocina' },
  { value: 'BATERIA', label: 'Batería' },
  { value: 'CARGADOR BATERIA', label: 'Cargador de Batería' },
  { value: 'QUEMADOR DE CD', label: 'Quemador de CD' },
  { value: 'PERIPHERAL', label: 'Periférico' },
  { value: 'OTHER', label: 'Otro' },
];

interface AssetFormModalProps {
  assetToEdit?: Asset | null;
  users: User[];
  availableLaptops: Asset[];
  onClose: () => void;
  onSuccess: () => void;
}

export const AssetFormModal: React.FC<AssetFormModalProps> = ({
  assetToEdit,
  users,
  availableLaptops,
  onClose,
  onSuccess,
}) => {
  const [category, setCategory] = useState<AssetCategory>('LAPTOP');
  const [assetTag, setAssetTag] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [brand, setBrand] = useState('Dell');
  const [model, setModel] = useState('');
  const [status, setStatus] = useState<AssetStatus>('AVAILABLE');
  const [location, setLocation] = useState<LocationType>('OPM');
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [assignedToUserId, setAssignedToUserId] = useState('');
  const [parentAssetId, setParentAssetId] = useState('');
  const [warrantyExpiry, setWarrantyExpiry] = useState('');

  // Specs dinámicas según categoría
  // Laptop specs
  const [laptopRam, setLaptopRam] = useState('16GB DDR5');
  const [laptopCpu, setLaptopCpu] = useState('Intel Core i7-1365U');
  const [laptopStorage, setLaptopStorage] = useState('512GB NVMe');
  const [laptopHostname, setLaptopHostname] = useState('');
  const [laptopOs, setLaptopOs] = useState('Windows 11 Pro');

  // Monitor specs
  const [monitorInches, setMonitorInches] = useState('27');
  const [monitorResolution, setMonitorResolution] = useState('3840x2160 (4K UHD)');
  const [monitorPanel, setMonitorPanel] = useState('IPS');
  const [monitorPorts, setMonitorPorts] = useState('HDMI, DisplayPort, USB-C 90W PD');

  // Docking specs
  const [dockingWatts, setDockingWatts] = useState('130W');
  const [dockingPorts, setDockingPorts] = useState('Dual DisplayPort 1.4, HDMI 2.0b, USB-C');

  // Peripheral specs
  const [peripheralType, setPeripheralType] = useState('Combo Teclado + Ratón');
  const [peripheralConnector, setPeripheralConnector] = useState('Bluetooth / USB Receptor');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getDepartments().then(setDepartments).catch(() => {});
  }, []);

  useEffect(() => {
    if (assetToEdit) {
      setCategory(assetToEdit.category);
      setAssetTag(assetToEdit.asset_tag);
      setSerialNumber(assetToEdit.serial_number);
      setBrand(assetToEdit.brand);
      setModel(assetToEdit.model);
      setStatus(assetToEdit.status);
      setLocation((assetToEdit.location as LocationType) || 'OPM');
      setDepartment(assetToEdit.department || '');
      setAssignedToUserId(assetToEdit.assigned_to_user_id || '');
      setParentAssetId(assetToEdit.parent_asset_id || '');
      setWarrantyExpiry(assetToEdit.warranty_expiry || '');

      const s = assetToEdit.specs || {};
      if (assetToEdit.category === 'LAPTOP') {
        setLaptopRam(s.ram || '');
        setLaptopCpu(s.cpu || '');
        setLaptopStorage(s.storage || '');
        setLaptopHostname(s.hostname || '');
        setLaptopOs(s.os || '');
      } else if (assetToEdit.category === 'MONITOR') {
        setMonitorInches(String(s.inches || ''));
        setMonitorResolution(s.resolution || '');
        setMonitorPanel(s.panel || '');
        setMonitorPorts(s.inputs || s.ports || '');
      } else if (assetToEdit.category === 'DOCKING') {
        setDockingWatts(String(s.power_watts || s.watts || ''));
        setDockingPorts(s.ports || '');
      } else if (assetToEdit.category === 'PERIPHERAL') {
        setPeripheralType(s.type || '');
        setPeripheralConnector(s.connector || '');
      }
    } else {
      // Default tag suggestion
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      setAssetTag(`IT-AST-${randomNum}`);
    }
  }, [assetToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetTag.trim() || !serialNumber.trim() || !model.trim()) {
      setError('Asset Tag, Número de Serie y Modelo son obligatorios.');
      return;
    }

    let specs: Record<string, any> = {};
    if (category === 'LAPTOP') {
      specs = {
        ram: laptopRam,
        cpu: laptopCpu,
        storage: laptopStorage,
        hostname: laptopHostname,
        os: laptopOs,
      };
    } else if (category === 'MONITOR') {
      specs = {
        inches: Number(monitorInches) || monitorInches,
        resolution: monitorResolution,
        panel: monitorPanel,
        ports: monitorPorts,
      };
    } else if (category === 'DOCKING') {
      specs = {
        power_watts: dockingWatts,
        ports: dockingPorts,
      };
    } else if (category === 'PERIPHERAL') {
      specs = {
        type: peripheralType,
        connector: peripheralConnector,
      };
    }

    try {
      setSaving(true);
      setError(null);

      const payload: Partial<Asset> = {
        asset_tag: assetTag.trim(),
        serial_number: serialNumber.trim(),
        category,
        brand,
        model,
        status,
        location,
        department: department.trim(),
        assigned_to_user_id: assignedToUserId ? assignedToUserId : undefined,
        parent_asset_id: parentAssetId ? parentAssetId : undefined,
        specs,
        warranty_expiry: warrantyExpiry || undefined,
      };

      if (assetToEdit) {
        await api.updateAsset(assetToEdit.id, payload);
      } else {
        await api.createAsset(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar activo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {assetToEdit ? 'Editar Activo de TI' : 'Alta de Nuevo Activo'}
            </h3>
            <p className="text-xs text-slate-500">
              Ingresa los datos generales y especificaciones del equipo
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Categoría y Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Categoría:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AssetCategory)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 font-medium text-slate-800"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Asset Tag (Único):</label>
              <input
                type="text"
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value)}
                placeholder="Ej. IT-LAP-0042"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 font-mono font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Número de Serie:</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Ej. 8G7H9X3"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 font-mono text-slate-800"
              />
            </div>
          </div>

          {/* Marca y Modelo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Marca:</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ej. Dell, Lenovo, Apple"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Modelo:</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ej. Latitude 5440, WD19S"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 font-medium"
              />
            </div>
          </div>

          {/* Estado, Ubicación, Departamento y Garantía */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Estado:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AssetStatus)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 font-medium text-slate-800"
              >
                <option value="AVAILABLE">AVAILABLE (Stock)</option>
                <option value="ASSIGNED">ASSIGNED (Asignado)</option>
                <option value="MAINTENANCE">MAINTENANCE (Taller)</option>
                <option value="RETIRED">RETIRED (Baja)</option>
                <option value="LOST">LOST (Extraviado)</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Ubicación / Sede *:</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value as LocationType)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 font-bold text-sky-800"
              >
                <option value="OPM">OPM (Planta OPM)</option>
                <option value="OMEX">OMEX (Oficinas OMEX)</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Departamento:</label>
              {departments.length > 0 ? (
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 font-medium"
                >
                  <option value="">(Sin asignar)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Ej. LOGISTICS"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800"
                />
              )}
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Vencimiento Garantía:</label>
              <input
                type="date"
                value={warrantyExpiry}
                onChange={(e) => setWarrantyExpiry(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800"
              />
            </div>
          </div>

          {/* Asignación Primaria y Vinculación Satélite */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Asignado a Colaborador:
              </label>
              <select
                value={assignedToUserId}
                onChange={(e) => setAssignedToUserId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
              >
                <option value="">(Sin asignar - En Stock)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.employee_code}) - {u.department}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Equipo Padre (Vinculado a Laptop):
              </label>
              <select
                value={parentAssetId}
                onChange={(e) => setParentAssetId(e.target.value)}
                disabled={category === 'LAPTOP'}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 disabled:opacity-50"
              >
                <option value="">(Ninguno - Activo Independiente)</option>
                {availableLaptops.map((lap) => (
                  <option key={lap.id} value={lap.id}>
                    {lap.asset_tag} - {lap.brand} {lap.model}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ESPECIFICACIONES DINÁMICAS SEGÚN CATEGORÍA */}
          <div className="border border-sky-100 bg-sky-50/50 p-4 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-sky-900 uppercase tracking-wide">
              Atributos Técnicos Específicos ({category})
            </h4>

            {category === 'LAPTOP' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Memoria RAM:</label>
                  <input
                    type="text"
                    value={laptopRam}
                    onChange={(e) => setLaptopRam(e.target.value)}
                    placeholder="Ej. 32GB DDR5"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Procesador (CPU):</label>
                  <input
                    type="text"
                    value={laptopCpu}
                    onChange={(e) => setLaptopCpu(e.target.value)}
                    placeholder="Ej. Intel Core i7-1365U"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Disco / Almacenamiento:</label>
                  <input
                    type="text"
                    value={laptopStorage}
                    onChange={(e) => setLaptopStorage(e.target.value)}
                    placeholder="Ej. 1TB NVMe"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Hostname TI:</label>
                  <input
                    type="text"
                    value={laptopHostname}
                    onChange={(e) => setLaptopHostname(e.target.value)}
                    placeholder="Ej. MEX-NB-0042"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-slate-600 block mb-1 font-medium">Sistema Operativo:</label>
                  <input
                    type="text"
                    value={laptopOs}
                    onChange={(e) => setLaptopOs(e.target.value)}
                    placeholder="Ej. Windows 11 Pro / Ubuntu 24.04"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
              </div>
            )}

            {category === 'MONITOR' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Pulgadas:</label>
                  <input
                    type="text"
                    value={monitorInches}
                    onChange={(e) => setMonitorInches(e.target.value)}
                    placeholder="Ej. 27"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Resolución:</label>
                  <input
                    type="text"
                    value={monitorResolution}
                    onChange={(e) => setMonitorResolution(e.target.value)}
                    placeholder="Ej. 3840x2160 (4K)"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Tipo Panel:</label>
                  <input
                    type="text"
                    value={monitorPanel}
                    onChange={(e) => setMonitorPanel(e.target.value)}
                    placeholder="Ej. IPS Black"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Entradas / Puertos:</label>
                  <input
                    type="text"
                    value={monitorPorts}
                    onChange={(e) => setMonitorPorts(e.target.value)}
                    placeholder="Ej. HDMI, DP, USB-C"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
              </div>
            )}

            {category === 'DOCKING' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Potencia (Watts):</label>
                  <input
                    type="text"
                    value={dockingWatts}
                    onChange={(e) => setDockingWatts(e.target.value)}
                    placeholder="Ej. 130W / 180W"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Puertos y Conectores:</label>
                  <input
                    type="text"
                    value={dockingPorts}
                    onChange={(e) => setDockingPorts(e.target.value)}
                    placeholder="Ej. Dual DisplayPort, HDMI, 3x USB 3.1"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
              </div>
            )}

            {category === 'PERIPHERAL' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Tipo de Accesorio:</label>
                  <input
                    type="text"
                    value={peripheralType}
                    onChange={(e) => setPeripheralType(e.target.value)}
                    placeholder="Ej. Teclado Mecánico / Auriculares ANC"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1 font-medium">Conectividad:</label>
                  <input
                    type="text"
                    value={peripheralConnector}
                    onChange={(e) => setPeripheralConnector(e.target.value)}
                    placeholder="Ej. Bluetooth + USB Dongle"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-slate-700 bg-slate-100 hover:bg-slate-200 font-semibold px-4 py-2 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : assetToEdit ? 'Actualizar Activo' : 'Crear Activo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
