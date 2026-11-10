import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  QrCode,
  Edit2,
  Trash2,
  Laptop,
  Monitor,
  Cpu,
  Headphones,
  Box,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Asset, User, AssetCategory, AssetStatus } from '../types';
import { api } from '../api';
import { AssetFormModal } from '../components/AssetFormModal';
import { QRStickerModal } from '../components/QRStickerModal';

export const AssetsView: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');

  // Modales
  const [formOpen, setFormOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);
  const [qrModalAsset, setQrModalAsset] = useState<Asset | null>(null);

  useEffect(() => {
    loadData();
  }, [categoryFilter, statusFilter, locationFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allAssets, allUsers] = await Promise.all([
        api.getAssets({
          search: search || undefined,
          category: categoryFilter || undefined,
          status: statusFilter || undefined,
          location: locationFilter || undefined,
        }),
        api.getUsers(),
      ]);
      setAssets(allAssets);
      setUsers(allUsers);
    } catch (err) {
      console.error('Error cargando activos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleDelete = async (id: string, tag: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar o dar de baja el activo ${tag}?`)) {
      return;
    }
    try {
      await api.deleteAsset(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar activo');
    }
  };

  const getCategoryIcon = (cat: AssetCategory) => {
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

  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case 'ASSIGNED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            ASSIGNED
          </span>
        );
      case 'AVAILABLE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            AVAILABLE
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            MAINTENANCE
          </span>
        );
      case 'RETIRED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            RETIRED
          </span>
        );
      case 'LOST':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
            LOST
          </span>
        );
    }
  };

  const laptops = assets.filter((a) => a.category === 'LAPTOP');

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Barra de Acciones y Filtros */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Búsqueda */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por tag, número de serie, marca o modelo..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
          >
            Buscar
          </button>
        </form>

        {/* Filtros Selectores */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 rounded-xl px-3 py-2"
          >
            <option value="">Todas las Categorías</option>
            <option value="LAPTOP">Laptops</option>
            <option value="MONITOR">Monitores</option>
            <option value="DOCKING">Dockings</option>
            <option value="PERIPHERAL">Periféricos</option>
            <option value="OTHER">Otros</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 rounded-xl px-3 py-2"
          >
            <option value="">Todos los Estados</option>
            <option value="ASSIGNED">Asignado</option>
            <option value="AVAILABLE">Disponible (Stock)</option>
            <option value="MAINTENANCE">Mantenimiento</option>
            <option value="RETIRED">Retirado</option>
            <option value="LOST">Extraviado</option>
          </select>

          <button
            onClick={() => {
              setAssetToEdit(null);
              setFormOpen(true);
            }}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Activo</span>
          </button>
        </div>
      </div>

      {/* Tabla de Activos */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-6">Activo & Tag</th>
                <th className="py-3.5 px-4">Categoría</th>
                <th className="py-3.5 px-4">Número de Serie</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4">Custodia (Usuario)</th>
                <th className="py-3.5 px-4">Ubicación</th>
                <th className="py-3.5 px-4">Última Auditoría</th>
                <th className="py-3.5 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/80 transition">
                  {/* Tag y Modelo */}
                  <td className="py-3.5 px-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                        {getCategoryIcon(a.category)}
                      </div>
                      <div>
                        <span className="font-mono font-bold text-slate-900 block">{a.asset_tag}</span>
                        <span className="text-slate-500 text-[11px]">
                          {a.brand} {a.model}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Categoría */}
                  <td className="py-3.5 px-4 font-medium text-slate-600">{a.category}</td>

                  {/* Serial */}
                  <td className="py-3.5 px-4 font-mono text-slate-600 font-medium">
                    {a.serial_number}
                  </td>

                  {/* Estado */}
                  <td className="py-3.5 px-4">{getStatusBadge(a.status)}</td>

                  {/* Custodia */}
                  <td className="py-3.5 px-4">
                    {a.assigned_to_name ? (
                      <span className="font-semibold text-slate-800">{a.assigned_to_name}</span>
                    ) : (
                      <span className="text-slate-400 italic">En Stock Central</span>
                    )}
                  </td>

                  {/* Ubicación */}
                  <td className="py-3.5 px-4 text-slate-600">{a.location}</td>

                  {/* Última Auditoría */}
                  <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                    {a.last_audited_at ? (
                      new Date(a.last_audited_at).toLocaleDateString()
                    ) : (
                      <span className="text-amber-600 font-medium">Sin auditar</span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td className="py-3.5 px-6 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setQrModalAsset(a)}
                        className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                        title="Imprimir Etiqueta QR"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setAssetToEdit(a);
                          setFormOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                        title="Editar Activo"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id, a.asset_tag)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Baja o Eliminación"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {assets.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No se encontraron activos con los filtros especificados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Formulario Dinámico */}
      {formOpen && (
        <AssetFormModal
          assetToEdit={assetToEdit}
          users={users}
          availableLaptops={laptops}
          onClose={() => setFormOpen(false)}
          onSuccess={loadData}
        />
      )}

      {/* Modal Etiqueta QR Imprimible */}
      {qrModalAsset && (
        <QRStickerModal asset={qrModalAsset} onClose={() => setQrModalAsset(null)} />
      )}
    </div>
  );
};
