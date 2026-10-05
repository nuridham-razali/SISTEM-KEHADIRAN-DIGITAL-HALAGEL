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
  const [attdId, setAttdId] = useState(employee?.attdId || '');
  const [name, setName] = useState(employee?.name || '');
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
      const cleanEmpId = employeeId.replace(/^'+/, '').trim().toUpperCase();
      const cleanAttdId = attdId.replace(/^'+/, '').trim();
      if (isCreate) {
        await api.createEmployee({
          employeeId: cleanEmpId,
          attdId: cleanAttdId,
          name: name.trim(),
          email: `${cleanEmpId.toLowerCase()}@halagel.com`,
          department,
          assignedOfficeId,
          role,
          password,
        });
      } else {
        await api.updateEmployee(employee.employeeId, {
          employeeId: cleanEmpId,
          attdId: cleanAttdId,
          name: name.trim(),
          email: employee.email || `${cleanEmpId.toLowerCase()}@halagel.com`,
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            {isCreate ? <UserPlus className="w-5 h-5 text-emerald-600" /> : <UserCheck className="w-5 h-5 text-emerald-600" />}
            <h3 className="text-base font-bold text-slate-900">
              {isCreate ? 'Daftar Kakitangan Baharu' : 'Kemaskini Maklumat Kakitangan'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-700 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ID Staf <span className="text-emerald-700 text-[10px] font-normal">(Log Masuk)</span>
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                placeholder="cth: 0123 atau EMP104"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Attd ID <span className="text-amber-800 text-[10px] font-normal">(Eksport Excel)</span>
              </label>
              <input
                type="text"
                value={attdId}
                onChange={(e) => setAttdId(e.target.value)}
                placeholder="cth: 020001 / 004164"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 shadow-xs"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 -mt-2">
            💡 <strong>Attd ID</strong> digunakan khusus sebagai lajur <code>Number ID</code> apabila mengeksport fail Excel kehadiran (menyokong angka <code>0</code> di hadapan seperti <code>020001</code>).
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Penuh</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Nama pekerja"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 shadow-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jabatan</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 shadow-xs"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pejabat Ditugaskan</label>
              <select
                value={assignedOfficeId}
                onChange={(e) => setAssignedOfficeId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 shadow-xs"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Peranan</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 shadow-xs"
              >
                <option value="employee">Kakitangan (Employee)</option>
                <option value="admin">Pentadbir (Admin)</option>
              </select>
            </div>

            {isCreate && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kata Laluan Awal</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 shadow-xs"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-[#588517] hover:bg-[#4c7512] text-white font-bold text-xs transition cursor-pointer shadow-xs"
            >
              {saving ? 'Menyimpan...' : 'Simpan Kakitangan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
