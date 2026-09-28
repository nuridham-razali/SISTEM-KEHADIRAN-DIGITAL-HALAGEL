import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AttendanceRecord } from '../../types';
import { ArrowLeft, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface AttendanceHistoryProps {
  onBack: () => void;
}

export const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({ onBack }) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getMyHistory();
      setRecords(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filteredRecords = records.filter((r) => {
    if (filter === 'ALL') return true;
    if (filter === 'COMPLETED') return r.attendanceStatus === 'COMPLETED';
    if (filter === 'IN_PROGRESS') return r.attendanceStatus === 'IN_PROGRESS';
    if (filter === 'EXCEPTION') return r.attendanceStatus.startsWith('EXCEPTION_');
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Sejarah Kehadiran</h1>
          <p className="text-xs text-slate-400">Halagel (M) Sdn Bhd • Rekod Masuk & Keluar</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
        {[
          { id: 'ALL', label: 'Semua Rekod' },
          { id: 'COMPLETED', label: 'Selesai' },
          { id: 'IN_PROGRESS', label: 'Sedang Berjalan' },
          { id: 'EXCEPTION', label: 'Luar Biasa' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${filter === tab.id ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Records List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/60 rounded-2xl border border-slate-800 p-6">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400 font-medium">Tiada rekod kehadiran dijumpai.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((r) => (
            <div
              key={r.sessionId}
              className="p-4 rounded-2xl bg-[#182234] border border-slate-800 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  {r.workDate}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    r.attendanceStatus === 'COMPLETED'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : r.attendanceStatus === 'IN_PROGRESS'
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      : r.attendanceStatus === 'LAMBAT'
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : r.attendanceStatus === 'AWAL_KELUAR'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {r.attendanceStatus === 'COMPLETED'
                    ? 'Selesai (Cukup 8 Jam)'
                    : r.attendanceStatus === 'IN_PROGRESS'
                    ? 'Sedang Bekerja'
                    : r.attendanceStatus === 'LAMBAT'
                    ? 'Lambat'
                    : r.attendanceStatus === 'AWAL_KELUAR'
                    ? 'Awal Keluar'
                    : r.attendanceStatus}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs py-1 text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Masuk: <strong className="text-white">{r.clockInTimeKL?.split(',')[1] || r.clockInTimeKL}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Keluar: <strong className="text-white">{r.clockOutTimeKL ? (r.clockOutTimeKL.split(',')[1] || r.clockOutTimeKL) : 'Belum Keluar'}</strong></span>
                </div>
              </div>

              {r.exceptionNotes && (
                <div className="my-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-[10px] text-slate-300">
                  {r.exceptionNotes}
                </div>
              )}

              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Wajah: <strong className="text-emerald-400">{r.faceVerified}</strong></span>
                <span>Jarak Geofens: <strong className="text-white">{r.clockInDistanceMeters ?? 0}m</strong></span>
                <span>Jumlah: <strong className="text-white">{r.workedHours ? `${r.workedHours} jam` : '-'}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
