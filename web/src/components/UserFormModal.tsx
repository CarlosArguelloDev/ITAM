import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, AlertCircle, Save } from 'lucide-react';
import { User, Department, LocationType } from '../types';
import { api } from '../api';

interface UserFormModalProps {
  onClose: () => void;
  onUserSaved: (user: User) => void;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({ onClose, onUserSaved }) => {
  const [employeeCode, setEmployeeCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('LOGISTICS');
  const [location, setLocation] = useState<LocationType>('OPM');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getDepartments()
      .then(res => {
        setDepartments(res);
        if (res.length > 0 && !res.some(d => d.name === department)) {
          setDepartment(res[0].name);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeCode.trim() || !fullName.trim()) {
      setError('El código de empleado y el nombre completo son obligatorios.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const newUser = await api.createUser({
        employee_code: employeeCode.trim().toUpperCase(),
        full_name: fullName.trim(),
        email: email.trim() || `${employeeCode.trim().toLowerCase()}@optibelt.com`,
        department: department.trim(),
        location,
        is_active: true,
      });

      onUserSaved(newUser);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el colaborador.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Alta de Nuevo Colaborador</h3>
              <p className="text-xs text-slate-500">Registra un empleado para asignación y custodia de hardware</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Código de Empleado / Nómina *
              </label>
              <input
                type="text"
                required
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="ej. EMP-OPM-1050"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="ej. Mariana Rivera Ríos"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Correo Electrónico Corporativo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ej. mariana.rivera@optibelt.com"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Departamento / Área *
              </label>
              {departments.length > 0 ? (
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="ej. LOGISTICS, PRODUCTION"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Sede / Locación *
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value as LocationType)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-sky-800 bg-sky-50/50 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="OPM">OPM (Planta OPM)</option>
                <option value="OMEX">OMEX (Oficinas OMEX)</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-100 font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold px-5 py-2 rounded-xl shadow-sm transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Guardando...' : 'Crear Colaborador'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
