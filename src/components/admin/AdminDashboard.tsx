import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Office, AttendanceRecord, User, AdminMetrics } from '../../types';
import { EditOfficeModal } from './EditOfficeModal';
import { EditEmployeeModal } from './EditEmployeeModal';
import { CorrectionModal } from './CorrectionModal';
import { ImportEmployeesModal } from './ImportEmployeesModal';
import { GoogleSheetsDbManager } from './GoogleSheetsDbManager';
import { BackgroundSettingModal } from './BackgroundSettingModal';
import { googleSheetsDb } from '../../services/googleSheetsDb';
import { HALAGEL_LOGO } from '../../assets/logo';
import { getHalagelBackground } from '../../assets/background';
import { formatWorkedDuration, formatDateToDMY, formatDateTimeToDMY } from '../../utils/workingHours';
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
  Image as ImageIcon,
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
  const [bgImage, setBgImage] = useState<string>(getHalagelBackground());
  const [showBgModal, setShowBgModal] = useState(false);

  useEffect(() => {
    setBgImage(getHalagelBackground());
  }, []);

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

  const handleExportAttendanceExcel = () => {
    api.exportAttendanceExcel(filteredRecords.length > 0 ? filteredRecords : records);
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
    <div
      className="min-h-screen relative bg-cover bg-center bg-no-repeat bg-fixed text-slate-800 font-sans"
      style={{
        backgroundImage: `url("${bgImage}")`,
        backgroundColor: '#F8FAFC',
      }}
    >
      {/* Light frosted overlay for crisp administrative clarity */}
      <div className="absolute inset-0 bg-slate-50/90 backdrop-blur-[3px] pointer-events-none" />

      <div className="relative z-10 flex flex-col max-w-5xl mx-auto p-4 sm:p-6 pb-24">
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-slate-200/90 gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src={HALAGEL_LOGO}
              alt="Halagel Logo"
              className="h-12 w-auto object-contain shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                  PORTAL PENTADBIR
                </span>
                <span className="text-xs text-slate-500 font-medium">Halagel (M) Sdn Bhd</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Pengurusan Kehadiran & Geofens
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => setShowBgModal(true)}
              title="Tetapan Imej Latar Belakang (Base64)"
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-300 shadow-xs transition cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Latar Base64</span>
            </button>
            <button
              onClick={() => loadData(true)}
              title="Segerak & Muat Semula dari Google Sheets"
              className="px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1.5 border border-emerald-300 shadow-xs transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Segerak Sheet</span>
            </button>
            <button
              onClick={logout}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-red-50 text-red-600 text-xs font-bold border border-red-200 shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Keluar</span>
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-sm transition">
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Jumlah Staf</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{metrics.totalEmployees}</div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                {metrics.activeEmployees} aktif
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-sm transition">
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Cawangan / Kilang</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{metrics.totalOffices}</div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-1">
                Zon Geofens Aktif
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-sm transition">
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Sedang Bertugas</span>
              <div className="text-2xl font-black text-amber-700 mt-1">{metrics.activeSessionsNow}</div>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full inline-block mt-1">
                Sesi Terbuka
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-sm transition">
              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Selesai Hari Ini</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">{metrics.todayCompletedSessions}</div>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1">
                Rekod Lengkap
              </span>
            </div>
          </div>
        )}

        {/* Official Schedule Policy Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border border-emerald-200 mb-5 text-xs shadow-xs space-y-1.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="font-bold text-emerald-950">Dasar Waktu Bekerja Rasmi Halagel:</span>
              <span className="text-slate-700">Ahad–Rabu (8:30 AM–6:00 PM) • <strong className="text-amber-900 bg-amber-100/90 px-1.5 py-0.5 rounded">Khamis (8:00 AM–6:00 PM, masuk hingga 8:30 AM tidak lambat)</strong></span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-slate-600">Rehat: <strong className="text-amber-800">12:45 PM – 1:45 PM</strong></span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#588517] text-white font-bold shadow-xs">
                Syarat 8 Jam / Half-Day
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 pt-1 border-t border-emerald-200/70">
            <span className="text-purple-700 font-bold">Separuh Hari (Half-Day):</span>
            <span>Sesi Pagi: <strong className="text-slate-900">8:00 AM – 1:15 PM</strong></span>
            <span>Sesi Petang: <strong className="text-slate-900">1:15 PM – 6:00 PM</strong></span>
            <span className="text-slate-500">*Diiktiraf hadir penuh separuh hari tanpa penalti lambat.</span>
          </div>
        </div>

        {/* Nav Tabs */}
        <div className="flex gap-2 border-b border-slate-200 pb-3 mb-5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('OFFICES')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'OFFICES'
                ? 'bg-[#588517] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-xs'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Cawangan & Geofens</span>
          </button>

          <button
            onClick={() => setActiveTab('ATTENDANCE')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'ATTENDANCE'
                ? 'bg-[#588517] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-xs'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Rekod Kehadiran ({records.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('EMPLOYEES')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'EMPLOYEES'
                ? 'bg-[#588517] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-xs'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Kakitangan ({employees.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('PAYROLL')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'PAYROLL'
                ? 'bg-[#588517] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-xs'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Eksport Gaji</span>
          </button>

          <button
            onClick={() => setActiveTab('SHEETS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'SHEETS'
                ? 'bg-[#588517] text-white shadow-sm'
                : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-xs'
            }`}
          >
            <FileSpreadsheet className={`w-4 h-4 ${activeTab === 'SHEETS' ? 'text-white' : 'text-emerald-600'}`} />
            <span>Pangkalan Data Google Sheets</span>
            {googleSheetsDb.getSavedSpreadsheetId() && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            )}
          </button>
        </div>

      {/* TAB 1: OFFICES */}
      {activeTab === 'OFFICES' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-900">Senarai Lokasi Geofens Halagel</h2>
            <button
              onClick={() => setEditingOffice('CREATE')}
              className="px-3.5 py-2 rounded-xl bg-[#588517] hover:bg-[#4c7512] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Cawangan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {offices.map((off) => (
              <div
                key={off.officeId}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm flex flex-col justify-between transition text-slate-800"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                      {off.officeId}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700">
                      Radius: {off.radiusMeters}m
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">{off.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{off.address}</p>
                  <div className="mt-3 text-[11px] text-slate-400 font-mono">
                    GPS: {off.latitude.toFixed(4)}, {off.longitude.toFixed(4)}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 mt-3 border-t border-slate-100">
                  <button
                    onClick={() => setEditingOffice(off)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Sunting</span>
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ type: 'OFFICE', id: off.officeId, name: off.name })}
                    className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer border border-red-100"
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
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama, ID staf, atau jabatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 shadow-xs"
                />
              </div>
              <button
                type="button"
                onClick={handleExportAttendanceExcel}
                className="px-3.5 py-2 rounded-xl bg-[#588517] hover:bg-[#4c7512] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Eksport ke Excel (.xlsx)</span>
              </button>
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
                    statusFilter === s.id
                      ? 'bg-[#588517] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-slate-200 p-6 text-slate-500 text-xs shadow-xs">
                Tiada rekod kehadiran sepadan.
              </div>
            ) : (
              filteredRecords.map((r) => (
                <div
                  key={r.sessionId}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-300 hover:shadow-sm transition"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-xs">{r.employeeName}</span>
                      <span className="text-[10px] text-slate-500">({r.employeeId})</span>
                      <span className="text-[10px] text-slate-500">• {r.department}</span>
                      {r.isOutstation && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          🚗 Outstation {r.outstationLocation ? `(${r.outstationLocation})` : ''}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
                      <span>Tarikh: <strong className="text-slate-900">{formatDateToDMY(r.workDate)}</strong></span>
                      <span>Masuk: <strong className="text-emerald-700">{formatDateTimeToDMY(r.clockInTimeKL, r.workDate)}</strong></span>
                      <span>Keluar: <strong className="text-amber-700">{r.clockOutTimeKL ? formatDateTimeToDMY(r.clockOutTimeKL, r.workDate) : 'Belum Keluar'}</strong></span>
                      <span>Geofens: <strong className="text-slate-800">{r.isOutstation ? 'Outstation' : `${r.clockInDistanceMeters ?? 0}m`}</strong></span>
                      {(r.workedHours != null || r.workedMinutes != null || r.clockOutTimeKL) && (
                        <span>Jumlah: <strong className="text-emerald-700">{formatWorkedDuration(r.workedHours, r.workedMinutes, r.clockInTimeKL, r.clockOutTimeKL, r.workDate)}</strong></span>
                      )}
                    </div>

                    {/* Entry and Exit Remarks Display */}
                    {(r.entryType || r.exitType || r.clockInRemarks || r.clockOutRemarks) && (
                      <div className="flex flex-wrap items-center gap-2 text-[10px] pt-0.5">
                        {r.entryType && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Masuk: <strong>{r.entryType}</strong> {r.clockInRemarks ? `("${r.clockInRemarks}")` : ''}
                          </span>
                        )}
                        {r.exitType && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                            Keluar: <strong>{r.exitType}</strong> {r.clockOutRemarks ? `("${r.clockOutRemarks}")` : ''}
                          </span>
                        )}
                      </div>
                    )}

                    {r.exceptionNotes && !r.entryType && !r.exitType && (
                      <div className="mt-1 text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md inline-block border border-amber-200">
                        {r.exceptionNotes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        r.attendanceStatus === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : r.attendanceStatus === 'IN_PROGRESS'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : r.attendanceStatus === 'URUSAN_LUAR'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : r.attendanceStatus === 'REHAT'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : r.attendanceStatus === 'OUTSTATION'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : r.attendanceStatus === 'LAMBAT'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
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
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer border border-slate-200"
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
                      className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer border border-red-200"
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
              <h2 className="text-sm font-bold text-slate-900">Senarai Kakitangan Berdaftar ({employees.length})</h2>
              <p className="text-xs text-slate-500">Pengurusan profil staf, templat biometrik wajah & penempatan cawangan</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleExportEmployeesCsv}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer border border-slate-300 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Eksport Staf (CSV)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowImportEmployeesModal(true)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer border border-emerald-300 shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Staf (CSV)</span>
              </button>
              <button
                type="button"
                onClick={() => setEditingEmployee('CREATE')}
                className="px-3.5 py-1.5 rounded-xl bg-[#588517] hover:bg-[#4c7512] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Daftar Kakitangan</span>
              </button>
            </div>
          </div>

          {importFeedback && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{importFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setImportFeedback(null)}
                className="text-slate-400 hover:text-slate-600 text-xs px-1.5 py-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {employees.map((emp) => (
              <div
                key={emp.employeeId}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition flex flex-col justify-between text-slate-800"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-slate-900">{emp.employeeId}</span>
                      {emp.attdId && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Attd ID: {emp.attdId}
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${emp.role === 'admin' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                      {emp.role === 'admin' ? 'PENTADBIR' : 'KAKITANGAN'}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">{emp.name}</h4>
                  <p className="text-xs text-[#588517] font-semibold">{emp.department}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {offices.find(o => o.officeId === emp.assignedOfficeId)?.name || 'Cawangan Rasmi'}
                  </p>
                  <div className="mt-2 text-[10px] text-slate-400">
                    Wajah: {emp.faceEnrolled ? '✓ Didaftar' : '✗ Belum Daftar'}
                  </div>
                </div>

                <div className="flex gap-2 pt-3 mt-3 border-t border-slate-100">
                  <button
                    onClick={() => setEditingEmployee(emp)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
                  >
                    Sunting
                  </button>
                  {emp.employeeId !== 'ADMIN' && (
                    <button
                      onClick={() => setDeleteTarget({ type: 'EMPLOYEE', id: emp.employeeId, name: emp.name })}
                      className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer border border-red-100"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Ringkasan Jam Kerja & Penggajian</h2>
              <p className="text-xs text-slate-500">Berdasarkan rekod waktu masuk & keluar sah Halagel</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExportAttendanceExcel}
                className="px-3.5 py-2 rounded-xl bg-[#588517] hover:bg-[#4c7512] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Eksport Excel Kehadiran (Transit Time)</span>
              </button>
              <button
                onClick={handleExportCsv}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Eksport CSV Ringkasan Jam</span>
              </button>
            </div>
          </div>

          {payrollPreview && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">ID Staf</th>
                    <th className="p-3">Nama Pekerja</th>
                    <th className="p-3">Jabatan</th>
                    <th className="p-3 text-right">Hari Hadir</th>
                    <th className="p-3 text-right">Jumlah Jam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {payrollPreview.employees.map((p: any) => (
                    <tr key={p.employeeId} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-bold text-slate-900">{p.employeeId}</td>
                      <td className="p-3 font-semibold text-slate-900">{p.name}</td>
                      <td className="p-3 text-slate-500">{p.department}</td>
                      <td className="p-3 text-right font-medium text-emerald-700">{p.daysWorked} hari</td>
                      <td className="p-3 text-right font-bold text-slate-900">{p.totalHours.toFixed(1)} jam</td>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sahkan Pemadaman</h3>
                <p className="text-xs text-slate-500">
                  {deleteTarget.type === 'OFFICE'
                    ? 'Padam Lokasi Cawangan'
                    : deleteTarget.type === 'EMPLOYEE'
                    ? 'Padam Akaun Kakitangan'
                    : 'Padam Rekod Kehadiran'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Adakah anda pasti ingin memadam{' '}
              {deleteTarget.type === 'OFFICE'
                ? 'cawangan'
                : deleteTarget.type === 'EMPLOYEE'
                ? 'kakitangan'
                : 'rekod kehadiran'}{' '}
              <strong className="text-slate-900">{deleteTarget.name}</strong> ({deleteTarget.id})? Ia juga akan dipadam terus dari Google Sheets.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
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

      {showBgModal && (
        <BackgroundSettingModal
          onClose={() => setShowBgModal(false)}
          onBackgroundChange={(newBg) => setBgImage(newBg)}
        />
      )}
      </div>
    </div>
  );
};
