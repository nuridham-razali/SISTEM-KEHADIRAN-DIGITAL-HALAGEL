import React, { useState } from 'react';
import { AttendanceRecord } from '../../types';
import { api } from '../../services/api';
import { computeDurationFromKLTimes, formatWorkedDuration, formatDateTimeToDMY } from '../../utils/workingHours';
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
  const initialComputed = computeDurationFromKLTimes(
    record.clockInTimeKL,
    record.clockOutTimeKL,
    record.workDate
  );
  const [clockInTimeKL, setClockInTimeKL] = useState(
    formatDateTimeToDMY(record.clockInTimeKL, record.workDate)
  );
  const [clockOutTimeKL, setClockOutTimeKL] = useState(
    formatDateTimeToDMY(record.clockOutTimeKL, record.workDate)
  );
  const [attendanceStatus, setAttendanceStatus] = useState(record.attendanceStatus || 'COMPLETED');
  const [workedMinutes, setWorkedMinutes] = useState(
    initialComputed
      ? String(initialComputed.workedMinutes)
      : (record.workedMinutes?.toString() || '480')
  );
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recalculateMinutesFromTimes = (newIn: string, newOut: string) => {
    const computed = computeDurationFromKLTimes(newIn, newOut, record.workDate);
    if (computed) {
      setWorkedMinutes(String(computed.workedMinutes));
    }
  };

  const handleClockInChange = (val: string) => {
    setClockInTimeKL(val);
    recalculateMinutesFromTimes(val, clockOutTimeKL);
  };

  const handleClockOutChange = (val: string) => {
    setClockOutTimeKL(val);
    recalculateMinutesFromTimes(clockInTimeKL, val);
  };

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-slate-900">Pelarasan Rekod Kehadiran</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-700 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500">Pekerja:</span>
            <p className="font-bold text-slate-900 text-sm mt-0.5">{record.employeeName} ({record.employeeId}) • {record.department}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Masa Masuk</label>
              <input
                type="text"
                value={clockInTimeKL}
                onChange={(e) => handleClockInChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 shadow-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Masa Keluar</label>
              <input
                type="text"
                value={clockOutTimeKL}
                onChange={(e) => handleClockOutChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 shadow-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Status Kehadiran</label>
              <select
                value={attendanceStatus}
                onChange={(e) => setAttendanceStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 shadow-xs"
              >
                <option value="COMPLETED">Selesai (COMPLETED)</option>
                <option value="IN_PROGRESS">Sedang Bekerja (IN_PROGRESS)</option>
                <option value="CORRECTED">Telah Dilaraskan (CORRECTED)</option>
                <option value="EXCEPTION_OUTSIDE_RADIUS">Pengecualian Luar Radius</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Jumlah Minit</label>
              <input
                type="number"
                value={workedMinutes}
                onChange={(e) => setWorkedMinutes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 shadow-xs"
              />
              <span className="block text-[10px] text-emerald-700 font-bold mt-1">
                ≈ {formatWorkedDuration(undefined, parseInt(workedMinutes, 10) || 0)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Sebab Rasmi Pelarasan (Wajib)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={2}
              placeholder="cth: Tugas luar stesen atau masalah GPS peranti"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 shadow-xs"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition cursor-pointer shadow-xs"
            >
              {saving ? 'Menyimpan...' : 'Simpan Pelarasan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
