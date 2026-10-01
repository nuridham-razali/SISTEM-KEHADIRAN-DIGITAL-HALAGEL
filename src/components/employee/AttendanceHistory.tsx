import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AttendanceRecord } from '../../types';
import { formatWorkedDuration, formatDateToDMY } from '../../utils/workingHours';
import { ArrowLeft, Calendar, Clock, Car, Briefcase, Coffee, Home, CheckCircle2 } from 'lucide-react';

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
    const unsubscribe = api.subscribe(() => {
      loadHistory();
    });
    return unsubscribe;
  }, []);

  const filteredRecords = records.filter((r) => {
    if (filter === 'ALL') return true;
    if (filter === 'COMPLETED') return r.attendanceStatus === 'COMPLETED';
    if (filter === 'IN_PROGRESS') return r.attendanceStatus === 'IN_PROGRESS';
    if (filter === 'URUSAN_LUAR') return r.attendanceStatus === 'URUSAN_LUAR' || (r.exitType && r.exitType.includes('Urusan'));
    if (filter === 'REHAT') return r.attendanceStatus === 'REHAT' || (r.exitType && r.exitType.includes('Rehat'));
    if (filter === 'OUTSTATION') return r.isOutstation || r.attendanceStatus === 'OUTSTATION';
    if (filter === 'EXCEPTION') return r.attendanceStatus.startsWith('EXCEPTION_') || r.attendanceStatus === 'LAMBAT';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Sejarah Kehadiran</h1>
          <p className="text-xs text-slate-400">Halagel (M) Sdn Bhd • Rekod Pergerakan Keluar & Masuk</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
        {[
          { id: 'ALL', label: 'Semua Rekod' },
          { id: 'COMPLETED', label: 'Selesai' },
          { id: 'IN_PROGRESS', label: 'Sedang Berjalan' },
          { id: 'URUSAN_LUAR', label: 'Urusan Luar / Beli Barang' },
          { id: 'REHAT', label: 'Rehat' },
          { id: 'OUTSTATION', label: 'Luar Kawasan (Outstation)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              filter === tab.id
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
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
              className="p-4 rounded-2xl bg-[#182234] border border-slate-800 hover:border-slate-700 transition space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  {formatDateToDMY(r.workDate)}
                </span>

                <div className="flex items-center gap-1.5">
                  {r.isOutstation && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      <span>Outstation</span>
                    </span>
                  )}

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      r.attendanceStatus === 'COMPLETED'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : r.attendanceStatus === 'IN_PROGRESS'
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : r.attendanceStatus === 'URUSAN_LUAR'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : r.attendanceStatus === 'REHAT'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : r.attendanceStatus === 'OUTSTATION'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : r.attendanceStatus === 'LAMBAT'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {r.attendanceStatus === 'COMPLETED'
                      ? 'Selesai'
                      : r.attendanceStatus === 'IN_PROGRESS'
                      ? 'Sedang Bekerja'
                      : r.attendanceStatus === 'URUSAN_LUAR'
                      ? 'Urusan Luar / Beli Barang'
                      : r.attendanceStatus === 'REHAT'
                      ? 'Keluar Rehat'
                      : r.attendanceStatus === 'OUTSTATION'
                      ? 'Luar Kawasan'
                      : r.attendanceStatus === 'LAMBAT'
                      ? 'Lambat'
                      : r.attendanceStatus}
                  </span>
                </div>
              </div>

              {/* Movement Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs py-1 text-slate-300">
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    <span>Masuk:</span>
                  </div>
                  <div className="font-bold text-white text-xs mt-0.5">
                    {r.clockInTimeKL?.split(',')[1] || r.clockInTimeKL}
                  </div>
                  <div className="text-[10px] text-emerald-300 truncate mt-0.5">
                    {r.entryType || 'Datang Bekerja'}
                  </div>
                  {r.clockInRemarks && (
                    <div className="text-[9px] text-slate-400 italic truncate mt-0.5">
                      "{r.clockInRemarks}"
                    </div>
                  )}
                </div>

                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Keluar:</span>
                  </div>
                  <div className="font-bold text-white text-xs mt-0.5">
                    {r.clockOutTimeKL ? (r.clockOutTimeKL.split(',')[1] || r.clockOutTimeKL) : (
                      <span className="text-blue-400 font-semibold">Belum Keluar</span>
                    )}
                  </div>
                  <div className="text-[10px] text-amber-300 truncate mt-0.5">
                    {r.clockOutTimeKL ? (r.exitType || 'Keluar') : '-'}
                  </div>
                  {r.clockOutRemarks && (
                    <div className="text-[9px] text-slate-400 italic truncate mt-0.5">
                      "{r.clockOutRemarks}"
                    </div>
                  )}
                </div>
              </div>

              {/* Outstation Location if applicable */}
              {r.isOutstation && r.outstationLocation && (
                <div className="text-[10px] text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 flex items-center gap-1.5">
                  <Car className="w-3 h-3 text-purple-400 shrink-0" />
                  <span>Lokasi Outstation: <strong>{r.outstationLocation}</strong></span>
                </div>
              )}

              {/* Exception Notes if any */}
              {r.exceptionNotes && !r.exceptionNotes.startsWith('Masuk:') && (
                <div className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-[10px] text-slate-300">
                  {r.exceptionNotes}
                </div>
              )}

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Wajah: <strong className="text-emerald-400">✓ {r.faceVerified}</strong></span>
                <span>Zon: <strong className="text-white">{r.isOutstation ? 'Outstation' : `${r.clockInDistanceMeters ?? 0}m`}</strong></span>
                <span>Tempoh: <strong className="text-white">{formatWorkedDuration(r.workedHours, r.workedMinutes, r.clockInTimeKL, r.clockOutTimeKL, r.workDate)}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
