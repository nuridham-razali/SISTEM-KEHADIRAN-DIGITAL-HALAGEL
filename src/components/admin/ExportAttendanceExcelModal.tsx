import React, { useState, useMemo } from 'react';
import { api, ExportAttendanceExcelOptions } from '../../services/api';
import { AttendanceRecord } from '../../types';
import { HALAGEL_DEPARTMENTS } from '../../config/departments';
import {
  X,
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

interface ExportAttendanceExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  records?: AttendanceRecord[];
}

const MONTH_NAMES = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Mac' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Julai' },
  { value: 8, label: 'Ogos' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Disember' },
];

export const ExportAttendanceExcelModal: React.FC<ExportAttendanceExcelModalProps> = ({
  isOpen,
  onClose,
  records,
}) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const todayYMD = now.toISOString().slice(0, 10);

  // Filter mode state
  const [filterMode, setFilterMode] = useState<'SPECIFIC_DATE' | 'MONTH_YEAR' | 'YEAR_ONLY' | 'RANGE' | 'ALL'>('MONTH_YEAR');

  // Date selection state
  const [selectedDate, setSelectedDate] = useState<string>(todayYMD);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [startDate, setStartDate] = useState<string>(
    new Date(currentYear, currentMonth - 1, 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState<string>(todayYMD);

  // Department & format
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [formatType, setFormatType] = useState<'TRANSIT_TIME' | 'DETAILED'>('TRANSIT_TIME');

  // Status feedback
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // Compute available years (from 2023 to currentYear + 2)
  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear - 2; y <= currentYear + 2; y++) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  // Build options object
  const currentOptions: ExportAttendanceExcelOptions = useMemo(() => {
    return {
      records,
      filterMode,
      selectedDate: filterMode === 'SPECIFIC_DATE' ? selectedDate : undefined,
      selectedMonth: filterMode === 'MONTH_YEAR' ? selectedMonth : undefined,
      selectedYear:
        filterMode === 'MONTH_YEAR' || filterMode === 'YEAR_ONLY'
          ? selectedYear
          : undefined,
      startDate: filterMode === 'RANGE' ? startDate : undefined,
      endDate: filterMode === 'RANGE' ? endDate : undefined,
      department: selectedDepartment,
      formatType,
    };
  }, [
    records,
    filterMode,
    selectedDate,
    selectedMonth,
    selectedYear,
    startDate,
    endDate,
    selectedDepartment,
    formatType,
  ]);

  // Calculate matching records live preview
  const matchingRecords = useMemo(() => {
    return api.filterAttendanceRecords(currentOptions);
  }, [currentOptions]);

  // Calculate transit rows count
  const transitRowsCount = useMemo(() => {
    let count = 0;
    matchingRecords.forEach((r) => {
      if (r.clockInTimeKL && r.clockInTimeKL !== '-') count++;
      if (r.clockOutTimeKL && r.clockOutTimeKL !== '-' && r.clockOutTimeKL !== 'Belum Keluar') count++;
    });
    return count;
  }, [matchingRecords]);

  if (!isOpen) return null;

  const handleExport = () => {
    setIsExporting(true);
    setExportSuccessMsg(null);
    try {
      const result = api.exportAttendanceExcel(currentOptions);
      setExportSuccessMsg(
        `Berjaya memuat turun ${result.filename} (${
          formatType === 'TRANSIT_TIME' ? `${result.count} baris waktu transit` : `${result.count} rekod penuh`
        })!`
      );
      setTimeout(() => {
        setIsExporting(false);
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setIsExporting(false);
    }
  };

  const handleSetToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    setSelectedDate(today);
  };

  const handleSetYesterday = () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    setSelectedDate(yesterday);
  };

  const handleSetCurrentMonth = () => {
    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedYear(new Date().getFullYear());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl text-slate-800 border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#588517]">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Eksport Kehadiran ke Excel (.xlsx)
              </h2>
              <p className="text-xs text-slate-500">
                Pilih tarikh, bulan, tahun dan jabatan untuk memuat turun rekod rasmi Halagel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Pilihan Mod Tempoh */}
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5 text-[#588517]" />
              <span>Pilih Mod Tempoh Kehadiran</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'SPECIFIC_DATE', label: 'Tarikh Spesifik (Hari)' },
                { id: 'MONTH_YEAR', label: 'Bulan & Tahun' },
                { id: 'YEAR_ONLY', label: 'Tahun Penuh' },
                { id: 'RANGE', label: 'Julat Tarikh' },
                { id: 'ALL', label: 'Semua Rekod' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setFilterMode(m.id as any);
                    setExportSuccessMsg(null);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                    filterMode === m.id
                      ? 'bg-[#588517] text-white border-[#588517] shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Controls based on filterMode */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            {/* Mode 1: SPECIFIC_DATE */}
            {filterMode === 'SPECIFIC_DATE' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Pilih Tarikh:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSetToday}
                      className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={handleSetYesterday}
                      className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Semalam
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setExportSuccessMsg(null);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#588517] shadow-xs"
                />
              </div>
            )}

            {/* Mode 2: MONTH_YEAR */}
            {filterMode === 'MONTH_YEAR' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Pilih Bulan & Tahun:</span>
                  <button
                    type="button"
                    onClick={handleSetCurrentMonth}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Bulan Semasa
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Bulan
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(Number(e.target.value));
                        setExportSuccessMsg(null);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#588517] shadow-xs"
                    >
                      {MONTH_NAMES.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label} ({String(m.value).padStart(2, '0')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Tahun
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        setSelectedYear(Number(e.target.value));
                        setExportSuccessMsg(null);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#588517] shadow-xs"
                    >
                      {availableYears.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Mode 3: YEAR_ONLY */}
            {filterMode === 'YEAR_ONLY' && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Pilih Tahun Keseluruhan:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(Number(e.target.value));
                    setExportSuccessMsg(null);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#588517] shadow-xs"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      Tahun {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Mode 4: RANGE */}
            {filterMode === 'RANGE' && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Julat Tarikh:</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Dari (Mula)
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setExportSuccessMsg(null);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#588517] shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Hingga (Tamat)
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setExportSuccessMsg(null);
                      }}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#588517] shadow-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Mode 5: ALL */}
            {filterMode === 'ALL' && (
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Mengeksport semua rekod kehadiran dari mula tanpa sekatan tarikh.</span>
              </div>
            )}

            {/* Pilihan Jabatan */}
            <div className="pt-2 border-t border-slate-200">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <Filter className="w-3.5 h-3.5 text-[#588517]" />
                <span>Tapis Mengikut Jabatan</span>
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setExportSuccessMsg(null);
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#588517] shadow-xs"
              >
                <option value="ALL">Semua Jabatan ({HALAGEL_DEPARTMENTS.length} Jabatan)</option>
                {HALAGEL_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pilihan Format Fail Excel */}
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
              <Layers className="w-3.5 h-3.5 text-[#588517]" />
              <span>Format Lajur Excel</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                className={`p-3 rounded-2xl border cursor-pointer transition flex items-start gap-2.5 ${
                  formatType === 'TRANSIT_TIME'
                    ? 'border-[#588517] bg-emerald-50/50'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="formatType"
                  value="TRANSIT_TIME"
                  checked={formatType === 'TRANSIT_TIME'}
                  onChange={() => setFormatType('TRANSIT_TIME')}
                  className="mt-0.5 accent-[#588517]"
                />
                <div>
                  <span className="text-xs font-black text-slate-900 block">
                    Transit Time (Mesin Biometrik)
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                    3 Lajur: <code>Number ID</code>, <code>Name</code>, <code>Transit time</code>. Format rasmi mesin kedatangan Halagel.
                  </span>
                </div>
              </label>

              <label
                className={`p-3 rounded-2xl border cursor-pointer transition flex items-start gap-2.5 ${
                  formatType === 'DETAILED'
                    ? 'border-[#588517] bg-emerald-50/50'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="formatType"
                  value="DETAILED"
                  checked={formatType === 'DETAILED'}
                  onChange={() => setFormatType('DETAILED')}
                  className="mt-0.5 accent-[#588517]"
                />
                <div>
                  <span className="text-xs font-black text-slate-900 block">
                    Laporan Lengkap Terperinci
                  </span>
                  <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                    11 Lajur: Termasuk Jabatan, Waktu Masuk/Keluar, Jam Kerja, Status, dan Catatan penuh.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Live Matching Summary */}
          <div
            className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
              matchingRecords.length > 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {matchingRecords.length > 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <div>
                <span className="font-bold">
                  {matchingRecords.length > 0
                    ? `Dijumpai ${matchingRecords.length} rekod kehadiran`
                    : 'Tiada rekod kehadiran dijumpai'}
                </span>
                {formatType === 'TRANSIT_TIME' && matchingRecords.length > 0 && (
                  <span className="block text-[11px] opacity-80">
                    ({transitRowsCount} baris rekod waktu transit masuk/keluar)
                  </span>
                )}
                {matchingRecords.length === 0 && (
                  <span className="block text-[11px] opacity-80">
                    Cuba tukar tarikh, bulan atau jabatan yang dipilih.
                  </span>
                )}
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-500 text-right">
              .xlsx
            </div>
          </div>

          {/* Export Success Message */}
          {exportSuccessMsg && (
            <div className="p-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{exportSuccessMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            disabled={matchingRecords.length === 0 || isExporting}
            onClick={handleExport}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition cursor-pointer shadow-md ${
              matchingRecords.length > 0 && !isExporting
                ? 'bg-[#588517] hover:bg-[#4a7213] active:scale-98'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>
              {isExporting ? 'Sedang Memuat Turun...' : 'Muat Turun Fail Excel (.xlsx)'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
