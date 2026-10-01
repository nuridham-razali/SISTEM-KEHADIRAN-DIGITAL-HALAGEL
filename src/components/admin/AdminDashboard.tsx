import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Office, AttendanceRecord, User, AdminMetrics } from '../../types';
import { EditOfficeModal } from './EditOfficeModal';
import { EditEmployeeModal } from './EditEmployeeModal';
import { CorrectionModal } from './CorrectionModal';
import { ImportEmployeesModal } from './ImportEmployeesModal';
import { GoogleSheetsDbManager } from './GoogleSheetsDbManager';
import { googleSheetsDb } from '../../services/googleSheetsDb';
import { HALAGEL_LOGO } from '../../assets/logo';
import {
  Building2,
  Users,
  Calendar,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'OFFICES' | 'ATTENDANCE' | 'EMPLOYEES' | 'PAYROLL' | 'SHEETS'>('OFFICES');
  const [loading, setLoading] = useState(true);

  const [offices, setOffices] = useState<Office[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [editingOffice, setEditingOffice] = useState<Office | null | 'CREATE'>(null);
  const [editingEmployee, setEditingEmployee] = useState<User | null | 'CREATE'>(null);
  const [showImportEmployeesModal, setShowImportEmployeesModal] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [correctingRecord, setCorrectingRecord] = useState<AttendanceRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'OFFICE' | 'EMPLOYEE' | 'ATTENDANCE'; id: string; name: string } | null>(null);

  // Payroll
  const [payrollPreview, setPayrollPreview] = useState<any>(null);

  const loadData = async (forceSheetPull = false) => {
    setLoading(true);
    try {
      if (forceSheetPull) {
        await api.syncFromGoogleSheets(true);
      }
      const [offList, recList, empList, met] = await Promise.all([
        api.getOffices(),
        api.getAllAttendance(),
        api.getEmployees(),
        api.getAdminMetrics(),
      ]);
      setOffices(offList);
      setRecords(recList);
      setEmployees(empList);
      setMetrics(met);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
    const unsubscribe = api.subscribe(() => {
      loadData(false);
    });
    return unsubscribe;
  }, []);

  const loadPayroll = async () => {
    try {
      const p = await api.getPayrollPreview();
      setPayrollPreview(p);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'PAYROLL') {
      loadPayroll();
    }
  }, [activeTab, records]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'OFFICE') {
      await api.deleteOffice(deleteTarget.id);
    } else if (deleteTarget.type === 'EMPLOYEE') {
      await api.deleteEmployee(deleteTarget.id);
    } else if (deleteTarget.type === 'ATTENDANCE') {
      await api.deleteAttendance(deleteTarget.id);
    }
    setDeleteTarget(null);
    loadData(false);
  };

  const handleExportCsv = async () => {
    const csv = await api.exportPayrollCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Halagel_Kehadiran_Gaji_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportEmployeesCsv = async () => {
    const csv = await api.exportEmployeesCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Halagel_Senarai_Kakitangan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRecords = records.filter((r) => {
    const matchSearch =
      !searchQuery ||
      r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'COMPLETED' && r.attendanceStatus === 'COMPLETED') ||
      (statusFilter === 'IN_PROGRESS' && r.attendanceStatus === 'IN_PROGRESS') ||
      (statusFilter === 'URUSAN_LUAR' && (r.attendanceStatus === 'URUSAN_LUAR' || (r.exitType && r.exitType.includes('Urusan')))) ||
      (statusFilter === 'REHAT' && (r.attendanceStatus === 'REHAT' || (r.exitType && r.exitType.includes('Rehat')))) ||
      (statusFilter === 'OUTSTATION' && (r.isOutstation || r.attendanceStatus === 'OUTSTATION')) ||
      (statusFilter === 'EXCEPTION' && (r.attendanceStatus.startsWith('EXCEPTION_') || r.attendanceStatus === 'LAMBAT'));

    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col max-w-5xl mx-auto p-4 sm:p-6 pb-24">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3.5">
          <img
            src={HALAGEL_LOGO}
            alt="Halagel Logo"
            className="h-12 w-auto object-contain shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                PORTAL PENTADBIR
              </span>
              <span className="text-xs text-slate-400">Halagel (M) Sdn Bhd</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Pengurusan Kehadiran & Geofens
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => loadData(true)}
            title="Segerak & Muat Semula dari Google Sheets"
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold flex items-center gap-1.5 border border-emerald-500/30 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Segerak Sheet</span>
          </button>
          <button
            onClick={logout}
            className="px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-bold border border-red-500/30 flex items-center gap-1.5 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Keluar</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
          <div className="p-3.5 rounded-2xl bg-[#182234] border border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium">Jumlah Staf</span>
            <div className="text-xl font-bold text-white mt-0.5">{metrics.totalEmployees}</div>
            <span className="text-[10px] text-emerald-400">{metrics.activeEmployees} aktif</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#182234] border border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium">Cawangan / Kilang</span>
            <div className="text-xl font-bold text-white mt-0.5">{metrics.totalOffices}</div>
            <span className="text-[10px] text-blue-400">Zon Geofens Aktif</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#182234] border border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium">Sedang Bertugas</span>
            <div className="text-xl font-bold text-amber-400 mt-0.5">{metrics.activeSessionsNow}</div>
            <span className="text-[10px] text-slate-400">Sesi Terbuka</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#182234] border border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium">Selesai Hari Ini</span>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">{metrics.todayCompletedSessions}</div>
            <span className="text-[10px] text-slate-400">Rekod Lengkap</span>
          </div>
        </div>
      )}

      {/* Official Schedule Policy Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-[#182234] border border-slate-700/80 mb-5 text-xs shadow-md space-y-1.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold text-white">Dasar Waktu Bekerja Rasmi Halagel:</span>
            <span className="text-slate-300">Ahad–Rabu (8:30 AM–6:00 PM) • <strong className="text-amber-300">Khamis (8:00 AM–6:00 PM, masuk hingga 8:30 AM tidak lambat)</strong></span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-slate-400">Rehat: <strong className="text-amber-400">12:45 PM – 1:45 PM</strong></span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
              Syarat 8 Jam / Half-Day
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-0.5 border-t border-slate-800/80">
          <span className="text-purple-300 font-semibold">Separuh Hari (Half-Day):</span>
          <span>Sesi Pagi: <strong className="text-white">8:00 AM – 1:15 PM</strong></span>
          <span>Sesi Petang: <strong className="text-white">1:15 PM – 6:00 PM</strong></span>
          <span className="text-slate-400">*Diiktiraf hadir penuh separuh hari tanpa penalti lambat.</span>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-3 mb-5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('OFFICES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeTab === 'OFFICES' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'bg-slate-800/80 text-slate-400 hover:text-white'}`}
        >
          <Building2 className="w-4 h-4" />
          <span>Cawangan & Geofens</span>
        </button>

        <button
          onClick={() => setActiveTab('ATTENDANCE')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeTab === 'ATTENDANCE' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'bg-slate-800/80 text-slate-400 hover:text-white'}`}
        >
          <Calendar className="w-4 h-4" />
          <span>Rekod Kehadiran ({records.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('EMPLOYEES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeTab === 'EMPLOYEES' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'bg-slate-800/80 text-slate-400 hover:text-white'}`}
        >
          <Users className="w-4 h-4" />
          <span>Kakitangan ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PAYROLL')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeTab === 'PAYROLL' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'bg-slate-800/80 text-slate-400 hover:text-white'}`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Eksport Gaji</span>
        </button>

        <button
          onClick={() => setActiveTab('SHEETS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeTab === 'SHEETS' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'bg-slate-800/80 text-slate-400 hover:text-white'}`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Pangkalan Data Google Sheets</span>
          {googleSheetsDb.getSavedSpreadsheetId() && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          )}
        </button>
      </div>

      {/* TAB 1: OFFICES */}
      {activeTab === 'OFFICES' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-white">Senarai Lokasi Geofens Halagel</h2>
            <button
              onClick={() => setEditingOffice('CREATE')}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Cawangan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {offices.map((off) => (
              <div
                key={off.officeId}
                className="p-4 rounded-2xl bg-[#182234] border border-slate-800 hover:border-slate-700 flex flex-col justify-between transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                      {off.officeId}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-400">
                      Radius: {off.radiusMeters}m
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-white">{off.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{off.address}</p>
                  <div className="mt-3 text-[11px] text-slate-500 font-mono">
                    GPS: {off.latitude.toFixed(4)}, {off.longitude.toFixed(4)}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 mt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => setEditingOffice(off)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1 transition"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Sunting</span>
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ type: 'OFFICE', id: off.officeId, name: off.name })}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE */}
      {activeTab === 'ATTENDANCE' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Cari nama, ID staf, atau jabatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#182234] border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {[
                { id: 'ALL', label: 'Semua' },
                { id: 'COMPLETED', label: 'Selesai' },
                { id: 'IN_PROGRESS', label: 'Sedang Berjalan' },
                { id: 'URUSAN_LUAR', label: 'Urusan Luar / Beli Barang' },
                { id: 'REHAT', label: 'Rehat' },
                { id: 'OUTSTATION', label: 'Outstation' },
                { id: 'EXCEPTION', label: 'Luar Biasa / Lambat' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStatusFilter(s.id)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                    statusFilter === s.id ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-10 bg-slate-900/60 rounded-2xl border border-slate-800 p-6 text-slate-400 text-xs">
                Tiada rekod kehadiran sepadan.
              </div>
            ) : (
              filteredRecords.map((r) => (
                <div
                  key={r.sessionId}
                  className="p-3.5 rounded-2xl bg-[#182234] border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-xs">{r.employeeName}</span>
                      <span className="text-[10px] text-slate-400">({r.employeeId})</span>
                      <span className="text-[10px] text-slate-400">• {r.department}</span>
                      {r.isOutstation && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          🚗 Outstation {r.outstationLocation ? `(${r.outstationLocation})` : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-300">
                      <span>Tarikh: <strong>{r.workDate}</strong></span>
                      <span>Masuk: <strong className="text-emerald-300">{r.clockInTimeKL}</strong></span>
                      <span>Keluar: <strong className="text-amber-300">{r.clockOutTimeKL || 'Belum Keluar'}</strong></span>
                      <span>Geofens: <strong>{r.isOutstation ? 'Outstation' : `${r.clockInDistanceMeters ?? 0}m`}</strong></span>
                      {r.workedHours && (
                        <span>Jumlah: <strong className="text-emerald-400">{r.workedHours} jam</strong></span>
                      )}
                    </div>

                    {/* Entry and Exit Remarks Display */}
                    {(r.entryType || r.exitType || r.clockInRemarks || r.clockOutRemarks) && (
                      <div className="flex flex-wrap items-center gap-2 text-[10px] pt-0.5">
                        {r.entryType && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            Masuk: <strong>{r.entryType}</strong> {r.clockInRemarks ? `("${r.clockInRemarks}")` : ''}
                          </span>
                        )}
                        {r.exitType && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            Keluar: <strong>{r.exitType}</strong> {r.clockOutRemarks ? `("${r.clockOutRemarks}")` : ''}
                          </span>
                        )}
                      </div>
                    )}

                    {r.exceptionNotes && !r.entryType && !r.exitType && (
                      <div className="mt-1 text-[10px] text-amber-300/90 bg-amber-500/10 px-2 py-0.5 rounded-md inline-block">
                        {r.exceptionNotes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
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
                        ? 'Tepat Masa (Cukup 8 Jam)'
                        : r.attendanceStatus === 'IN_PROGRESS'
                        ? 'Sedang Bekerja'
                        : r.attendanceStatus === 'URUSAN_LUAR'
                        ? 'Urusan Luar / Beli Barang'
                        : r.attendanceStatus === 'REHAT'
                        ? 'Keluar Rehat'
                        : r.attendanceStatus === 'OUTSTATION'
                        ? 'Luar Kawasan (Outstation)'
                        : r.attendanceStatus === 'LAMBAT'
                        ? 'Lambat'
                        : r.attendanceStatus === 'AWAL_KELUAR'
                        ? 'Awal Keluar'
                        : r.attendanceStatus}
                    </span>
                    <button
                      onClick={() => setCorrectingRecord(r)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Laras</span>
                    </button>
                    <button
                      onClick={() =>
                        setDeleteTarget({
                          type: 'ATTENDANCE',
                          id: r.sessionId,
                          name: `${r.employeeName} (${r.workDate})`,
                        })
                      }
                      title="Padam Rekod Kehadiran"
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: EMPLOYEES */}
      {activeTab === 'EMPLOYEES' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">Senarai Kakitangan Berdaftar ({employees.length})</h2>
              <p className="text-xs text-slate-400">Pengurusan profil staf, templat biometrik wajah & penempatan cawangan</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleExportEmployeesCsv}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Eksport Staf (CSV)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowImportEmployeesModal(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer border border-emerald-500/30"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Staf (CSV)</span>
              </button>
              <button
                type="button"
                onClick={() => setEditingEmployee('CREATE')}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Daftar Kakitangan</span>
              </button>
            </div>
          </div>

          {importFeedback && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{importFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setImportFeedback(null)}
                className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5"
              >
                ✕
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {employees.map((emp) => (
              <div
                key={emp.employeeId}
                className="p-4 rounded-2xl bg-[#182234] border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-white">{emp.employeeId}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${emp.role === 'admin' ? 'bg-amber-500/15 text-amber-400' : 'bg-blue-500/15 text-blue-400'}`}>
                      {emp.role === 'admin' ? 'PENTADBIR' : 'KAKITANGAN'}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white">{emp.name}</h4>
                  <p className="text-xs text-emerald-400 font-medium">{emp.department}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {offices.find(o => o.officeId === emp.assignedOfficeId)?.name || 'Cawangan Rasmi'}
                  </p>
                  <div className="mt-2 text-[10px] text-slate-500">
                    Wajah: {emp.faceEnrolled ? '✓ Didaftar' : '✗ Belum Daftar'}
                  </div>
                </div>

                <div className="flex gap-2 pt-3 mt-3 border-t border-slate-800">
                  <button
                    onClick={() => setEditingEmployee(emp)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                  >
                    Sunting
                  </button>
                  {emp.employeeId !== 'ADMIN' && (
                    <button
                      onClick={() => setDeleteTarget({ type: 'EMPLOYEE', id: emp.employeeId, name: emp.name })}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PAYROLL */}
      {activeTab === 'PAYROLL' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-white">Ringkasan Jam Kerja & Penggajian</h2>
              <p className="text-xs text-slate-400">Berdasarkan rekod waktu masuk & keluar sah Halagel</p>
            </div>
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Eksport CSV Gaji</span>
            </button>
          </div>

          {payrollPreview && (
            <div className="bg-[#182234] border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">ID Staf</th>
                    <th className="p-3">Nama Pekerja</th>
                    <th className="p-3">Jabatan</th>
                    <th className="p-3 text-right">Hari Hadir</th>
                    <th className="p-3 text-right">Jumlah Jam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {payrollPreview.employees.map((p: any) => (
                    <tr key={p.employeeId} className="hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-white">{p.employeeId}</td>
                      <td className="p-3 font-semibold text-white">{p.name}</td>
                      <td className="p-3 text-slate-400">{p.department}</td>
                      <td className="p-3 text-right font-medium text-emerald-400">{p.daysWorked} hari</td>
                      <td className="p-3 text-right font-bold text-white">{p.totalHours.toFixed(1)} jam</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: GOOGLE SHEETS DATABASE */}
      {activeTab === 'SHEETS' && (
        <GoogleSheetsDbManager onDataChanged={loadData} />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#182234] border border-red-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Sahkan Pemadaman</h3>
                <p className="text-xs text-slate-400">
                  {deleteTarget.type === 'OFFICE'
                    ? 'Padam Lokasi Cawangan'
                    : deleteTarget.type === 'EMPLOYEE'
                    ? 'Padam Akaun Kakitangan'
                    : 'Padam Rekod Kehadiran'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Adakah anda pasti ingin memadam{' '}
              {deleteTarget.type === 'OFFICE'
                ? 'cawangan'
                : deleteTarget.type === 'EMPLOYEE'
                ? 'kakitangan'
                : 'rekod kehadiran'}{' '}
              <strong className="text-white">{deleteTarget.name}</strong> ({deleteTarget.id})? Ia juga akan dipadam terus dari Google Sheets.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs transition"
              >
                Ya, Padam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {editingOffice && (
        <EditOfficeModal
          office={editingOffice === 'CREATE' ? null : editingOffice}
          onClose={() => setEditingOffice(null)}
          onSaved={() => {
            setEditingOffice(null);
            loadData();
          }}
        />
      )}

      {editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee === 'CREATE' ? null : editingEmployee}
          offices={offices}
          onClose={() => setEditingEmployee(null)}
          onSaved={() => {
            setEditingEmployee(null);
            loadData();
          }}
        />
      )}

      {correctingRecord && (
        <CorrectionModal
          record={correctingRecord}
          onClose={() => setCorrectingRecord(null)}
          onSaved={() => {
            setCorrectingRecord(null);
            loadData();
          }}
        />
      )}

      {showImportEmployeesModal && (
        <ImportEmployeesModal
          onClose={() => setShowImportEmployeesModal(false)}
          onSuccess={({ added, updated }) => {
            setImportFeedback(`Import selesai: ${added} kakitangan baharu ditambah, ${updated} dikemas kini.`);
            loadData();
          }}
        />
      )}
    </div>
  );
};
