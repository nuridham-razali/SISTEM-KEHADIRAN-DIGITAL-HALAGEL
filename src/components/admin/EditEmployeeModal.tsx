import React, { useState } from 'react';
import { User, Office } from '../../types';
import { api } from '../../services/api';
import { UserPlus, UserCheck, X } from 'lucide-react';

interface EditEmployeeModalProps {
  employee: User | null;
  offices: Office[];
  onClose: () => void;
  onSaved: () => void;
}

const DEPARTMENTS = [
  'Pengeluaran & Operasi Kilang',
  'Pemasaran & Jualan',
  'Sumber Manusia & Pentadbiran',
  'Kewangan & Perakaunan',
  'Logistik & Rantaian Bekalan',
  'Kawalan Kualiti (QC/QA)',
  'Penyelidikan & Pembangunan (R&D)',
  'Teknologi Maklumat (IT)',
];

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  employee,
  offices,
  onClose,
  onSaved,
}) => {
  const isCreate = !employee;

  const [employeeId, setEmployeeId] = useState(employee?.employeeId || '');
  const [name, setName] = useState(employee?.name || '');
  const [email, setEmail] = useState(employee?.email || '');
  const [department, setDepartment] = useState(employee?.department || DEPARTMENTS[0]);
  const [assignedOfficeId, setAssignedOfficeId] = useState(
    employee?.assignedOfficeId || offices[0]?.officeId || 'OFF-01'
  );
  const [role, setRole] = useState(employee?.role || 'employee');
  const [password, setPassword] = useState('Password123!');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (isCreate) {
        await api.createEmployee({
          employeeId: employeeId.trim().toUpperCase(),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          department,
          assignedOfficeId,
          role,
          password,
        });
      } else {
        await api.updateEmployee(employee.employeeId, {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          department,
          assignedOfficeId,
          role,
        });
      }
      setSaving(false);
      onSaved();
    } catch (err: any) {
      setSaving(false);
      setError(err.message || 'Gagal menyimpan maklumat staf');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#182234] border border-slate-700/80 rounded-3xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-4">
          <div className="flex items-center gap-2">
            {isCreate ? <UserPlus className="w-5 h-5 text-emerald-400" /> : <UserCheck className="w-5 h-5 text-emerald-400" />}
            <h3 className="text-base font-bold text-white">
              {isCreate ? 'Daftar Kakitangan Baharu' : 'Kemaskini Maklumat Kakitangan'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3.5 p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isCreate && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">ID Staf</label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                placeholder="cth: EMP104"
                className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Nama Penuh</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Nama pekerja"
              className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Alamat Emel</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="emel@halagel.com"
              className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Jabatan</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Pejabat Ditugaskan</label>
              <select
                value={assignedOfficeId}
                onChange={(e) => setAssignedOfficeId(e.target.value)}
                className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {offices.map((o) => (
                  <option key={o.officeId} value={o.officeId}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Peranan</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="employee">Kakitangan (Employee)</option>
                <option value="admin">Pentadbir (Admin)</option>
              </select>
            </div>

            {isCreate && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Kata Laluan Awal</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition"
            >
              {saving ? 'Menyimpan...' : 'Simpan Kakitangan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
