import React, { useState } from 'react';
import { AttendanceRecord } from '../../types';
import { api } from '../../services/api';
import { X, ShieldAlert } from 'lucide-react';

interface CorrectionModalProps {
  record: AttendanceRecord;
  onClose: () => void;
  onSaved: () => void;
}

export const CorrectionModal: React.FC<CorrectionModalProps> = ({
  record,
  onClose,
  onSaved,
}) => {
  const [clockInTimeKL, setClockInTimeKL] = useState(record.clockInTimeKL || '');
  const [clockOutTimeKL, setClockOutTimeKL] = useState(record.clockOutTimeKL || '');
  const [attendanceStatus, setAttendanceStatus] = useState(record.attendanceStatus || 'COMPLETED');
  const [workedMinutes, setWorkedMinutes] = useState(record.workedMinutes?.toString() || '480');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || reason.trim().length < 5) {
      setError('Sila nyatakan sebab rasmi pelarasan kehadiran (minimum 5 aksara).');
      return;
    }
    setError(null);
    setSaving(true);

    try {
      await api.correctAttendance(record.sessionId, {
        clockInTimeKL,
        clockOutTimeKL,
        attendanceStatus,
        workedMinutes: parseInt(workedMinutes, 10) || 0,
        reason: reason.trim(),
      });
      setSaving(false);
      onSaved();
    } catch (err: any) {
      setSaving(false);
      setError(err.message || 'Gagal menyimpan pembetulan.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#182234] border border-slate-700/80 rounded-3xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Pelarasan Rekod Kehadiran</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <span className="text-slate-400">Pekerja:</span>
            <p className="font-semibold text-white">{record.employeeName} ({record.employeeId}) • {record.department}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1">Masa Masuk</label>
              <input
                type="text"
                value={clockInTimeKL}
                onChange={(e) => setClockInTimeKL(e.target.value)}
                className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Masa Keluar</label>
              <input
                type="text"
                value={clockOutTimeKL}
                onChange={(e) => setClockOutTimeKL(e.target.value)}
                className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1">Status Kehadiran</label>
              <select
                value={attendanceStatus}
                onChange={(e) => setAttendanceStatus(e.target.value)}
                className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-2.5 py-2 text-white"
              >
                <option value="COMPLETED">Selesai (COMPLETED)</option>
                <option value="IN_PROGRESS">Sedang Bekerja (IN_PROGRESS)</option>
                <option value="CORRECTED">Telah Dilaraskan (CORRECTED)</option>
                <option value="EXCEPTION_OUTSIDE_RADIUS">Pengecualian Luar Radius</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Jumlah Minit</label>
              <input
                type="number"
                value={workedMinutes}
                onChange={(e) => setWorkedMinutes(e.target.value)}
                className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Sebab Rasmi Pelarasan (Wajib)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={2}
              placeholder="cth: Tugas luar stesen atau masalah GPS peranti"
              className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3 py-2 text-white"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
            >
              {saving ? 'Menyimpan...' : 'Simpan Pelarasan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
