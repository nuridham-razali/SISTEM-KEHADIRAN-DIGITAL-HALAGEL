import React, { useState, useEffect } from 'react';
import { googleSheetsDb, SpreadsheetInfo } from '../../services/googleSheetsDb';
import { api } from '../../services/api';
import {
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Link,
  ShieldCheck,
  Check,
  Copy,
  Zap,
  Globe,
  ArrowLeftRight,
} from 'lucide-react';

interface GoogleSheetsDbManagerProps {
  onDataChanged: () => void;
}

const APPS_SCRIPT_CODE = `// HALAGEL ATTENDANCE GOOGLE APPS SCRIPT DATABASE (TWO-WAY SYNC V2)
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var attSheet = ss.getSheetByName("Kehadiran");
  var attData = (attSheet && attSheet.getLastRow() > 1)
    ? attSheet.getRange(2, 1, attSheet.getLastRow() - 1, attSheet.getLastColumn()).getDisplayValues()
    : [];

  var empSheet = ss.getSheetByName("Kakitangan");
  var empData = (empSheet && empSheet.getLastRow() > 1)
    ? empSheet.getRange(2, 1, empSheet.getLastRow() - 1, empSheet.getLastColumn()).getDisplayValues()
    : [];

  var offSheet = ss.getSheetByName("Cawangan");
  var offData = (offSheet && offSheet.getLastRow() > 1)
    ? offSheet.getRange(2, 1, offSheet.getLastRow() - 1, offSheet.getLastColumn()).getDisplayValues()
    : [];

  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    version: 2,
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    spreadsheetUrl: ss.getUrl(),
    data: attData,
    records: attData,
    employees: empData,
    offices: offData
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var payload = JSON.parse(e.postData.contents);
  var action = payload.action;

  if (action === "SYNC_ALL") {
    var attSheet = getOrCreateSheet(ss, "Kehadiran");
    attSheet.clear();
    attSheet.appendRow([
      "Session ID", "ID Staf", "Nama Kakitangan", "Jabatan", "Tarikh",
      "Waktu Masuk", "Waktu Keluar", "Tujuan Masuk", "Catatan Masuk",
      "Tujuan Keluar", "Catatan Keluar", "Status Kehadiran", "Jumlah Jam",
      "Outstation", "Lokasi Outstation", "Jarak Geofens (m)",
      "Pengesahan Wajah", "Nota Pengecualian", "Cawangan", "Kemaskini"
    ]);
    if (payload.records && payload.records.length > 0) {
      payload.records.forEach(function(r) {
        attSheet.appendRow([
          r.sessionId, r.employeeId, r.employeeName, r.department, r.workDate,
          r.clockInTimeKL, r.clockOutTimeKL || "Belum Keluar",
          r.entryType || "Datang Bekerja", r.clockInRemarks || "-",
          r.exitType || "-", r.clockOutRemarks || "-",
          r.attendanceStatus, r.workedHours ? (r.workedHours + " jam") : "-",
          r.isOutstation ? "YA" : "TIDAK", r.outstationLocation || "-",
          r.clockInDistanceMeters || 0, r.faceVerified || "YES",
          r.exceptionNotes || "-", r.officeId || "OFF-01", new Date().toISOString()
        ]);
      });
    }

    var empSheet = getOrCreateSheet(ss, "Kakitangan");
    empSheet.clear();
    empSheet.appendRow(["ID Staf", "Nama", "Emel", "Jabatan", "ID Cawangan", "Peranan", "Status Wajah", "Tarikh Didaftar"]);
    if (payload.employees && payload.employees.length > 0) {
      payload.employees.forEach(function(e) {
        empSheet.appendRow([e.employeeId, e.name, e.email, e.department, e.assignedOfficeId, e.role, e.faceEnrolled ? "Didaftar" : "Belum", e.faceEnrolledAt || "-"]);
      });
    }

    var offSheet = getOrCreateSheet(ss, "Cawangan");
    offSheet.clear();
    offSheet.appendRow(["ID Cawangan", "Nama Cawangan", "Alamat", "Latitude", "Longitude", "Radius (m)", "Status"]);
    if (payload.offices && payload.offices.length > 0) {
      payload.offices.forEach(function(o) {
        offSheet.appendRow([o.officeId, o.name, o.address, o.latitude, o.longitude, o.radiusMeters, o.active ? "Aktif" : "Tidak Aktif"]);
      });
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "SAVE_ATTENDANCE") {
    var attSheet = getOrCreateSheet(ss, "Kehadiran");
    if (attSheet.getLastRow() === 0) {
      attSheet.appendRow([
        "Session ID", "ID Staf", "Nama Kakitangan", "Jabatan", "Tarikh",
        "Waktu Masuk", "Waktu Keluar", "Tujuan Masuk", "Catatan Masuk",
        "Tujuan Keluar", "Catatan Keluar", "Status Kehadiran", "Jumlah Jam",
        "Outstation", "Lokasi Outstation", "Jarak Geofens (m)",
        "Pengesahan Wajah", "Nota Pengecualian", "Cawangan", "Kemaskini"
      ]);
    }
    var r = payload.record;
    var data = attSheet.getDataRange().getValues();
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == r.sessionId) {
        rowIndex = i + 1;
        break;
      }
    }
    var rowValues = [
      r.sessionId, r.employeeId, r.employeeName, r.department, r.workDate,
      r.clockInTimeKL, r.clockOutTimeKL || "Belum Keluar",
      r.entryType || "Datang Bekerja", r.clockInRemarks || "-",
      r.exitType || "-", r.clockOutRemarks || "-",
      r.attendanceStatus, r.workedHours ? (r.workedHours + " jam") : "-",
      r.isOutstation ? "YA" : "TIDAK", r.outstationLocation || "-",
      r.clockInDistanceMeters || 0, r.faceVerified || "YES",
      r.exceptionNotes || "-", r.officeId || "OFF-01", new Date().toISOString()
    ];
    if (rowIndex !== -1) {
      attSheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      attSheet.appendRow(rowValues);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, name) {
  var s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
  }
  return s;
}`;

export const GoogleSheetsDbManager: React.FC<GoogleSheetsDbManagerProps> = ({ onDataChanged }) => {
  const [webhookUrlInput, setWebhookUrlInput] = useState(googleSheetsDb.getSavedWebhookUrl() || '');
  const [sheetUrlInput, setSheetUrlInput] = useState(
    googleSheetsDb.getSavedSpreadsheetInfo()?.spreadsheetUrl || googleSheetsDb.getSavedSpreadsheetId() || ''
  );
  const [sheetInfo, setSheetInfo] = useState<SpreadsheetInfo | null>(() => googleSheetsDb.getSavedSpreadsheetInfo());
  const [isCopied, setIsCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showConfirmSyncModal, setShowConfirmSyncModal] = useState(false);
  const [syncOperation, setSyncOperation] = useState<'PUSH' | 'PULL' | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(api.getLastSyncTime());

  useEffect(() => {
    const unsub = api.subscribe(() => {
      setLastSyncTime(api.getLastSyncTime());
      setSheetInfo(googleSheetsDb.getSavedSpreadsheetInfo());
    });
    return unsub;
  }, []);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleSaveConfig = async () => {
    if (!webhookUrlInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Sila masukkan URL Web App Google Apps Script.' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);
    try {
      googleSheetsDb.setSavedWebhookUrl(webhookUrlInput.trim());
      if (sheetUrlInput.trim()) {
        googleSheetsDb.setSavedSpreadsheetId(sheetUrlInput.trim());
        setSheetInfo(googleSheetsDb.getSavedSpreadsheetInfo());
      }

      // First pull from Google Sheets so we respect any deletions/rows in the sheet
      const pulled = await api.syncFromGoogleSheets(true);
      setLastSyncTime(api.getLastSyncTime());
      setSheetInfo(googleSheetsDb.getSavedSpreadsheetInfo());
      onDataChanged();

      if (pulled) {
        const currentRecs = await api.getAllAttendance();
        setStatusMessage({
          type: 'success',
          text: `Pangkalan data Google Sheets berjaya disambungkan & disegerakkan dua hala! (${currentRecs.length} rekod kehadiran aktif dari Google Sheet).`,
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: 'URL Google Apps Script telah disimpan! Anda boleh klik "Muat Turun Dari Sheet" atau "Muat Naik Ke Sheet".',
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal menyambungkan Google Sheets.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSheetLink = async () => {
    if (!sheetUrlInput.trim()) {
      googleSheetsDb.clearSavedSpreadsheetId();
      setSheetInfo(null);
      setStatusMessage({ type: 'info', text: 'Pautan Google Sheet telah dikosongkan.' });
      return;
    }
    googleSheetsDb.setSavedSpreadsheetId(sheetUrlInput.trim());
    setSheetInfo(googleSheetsDb.getSavedSpreadsheetInfo());
    setLoading(true);
    await api.syncFromGoogleSheets(true);
    setLastSyncTime(api.getLastSyncTime());
    setLoading(false);
    onDataChanged();
    setStatusMessage({
      type: 'success',
      text: 'Pautan Google Sheet disimpan & disegerakkan dengan aplikasi!',
    });
  };

  const handleRemoveWebhook = () => {
    googleSheetsDb.clearSavedWebhookUrl();
    setWebhookUrlInput('');
    setStatusMessage({ type: 'info', text: 'Sambungan Webhook tersuai telah dipadam.' });
  };

  const handleTestWebhook = async () => {
    const url = webhookUrlInput.trim() || googleSheetsDb.getSavedWebhookUrl();
    if (!url) {
      setStatusMessage({ type: 'error', text: 'Sila masukkan Web App URL Google Apps Script untuk diuji.' });
      return;
    }
    setTestingWebhook(true);
    setStatusMessage(null);
    try {
      const res = await googleSheetsDb.testWebhook(url);
      if (res.success) {
        await api.syncFromGoogleSheets(true);
        setLastSyncTime(api.getLastSyncTime());
        onDataChanged();
        setStatusMessage({ type: 'success', text: res.message });
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Ralat semasa menguji sambungan Google Sheets.' });
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleResetToDefaultWebhook = async () => {
    const def = googleSheetsDb.resetToDefaultWebhookUrl();
    setWebhookUrlInput(def || '');
    await api.syncFromGoogleSheets(true);
    setLastSyncTime(api.getLastSyncTime());
    setStatusMessage({
      type: 'info',
      text: def
        ? 'Tetapan dikembalikan kepada URL Google Apps Script lalai (src/config/database.ts) & disegerakkan.'
        : 'Tetapan tempatan telah dipadam.',
    });
    onDataChanged();
  };

  const executeImmediateSync = async (op: 'PUSH' | 'PULL') => {
    setLoading(true);
    setStatusMessage(null);

    try {
      if (op === 'PULL') {
        const ok = await api.syncFromGoogleSheets(true);
        setLastSyncTime(api.getLastSyncTime());
        onDataChanged();
        if (ok) {
          const recs = await api.getAllAttendance();
          setStatusMessage({
            type: 'success',
            text: `Disegerakkan secara automatik dari Google Sheets! (${recs.length} rekod kehadiran aktif).`,
          });
        } else {
          throw new Error('Gagal memuat turun data dari Google Sheets. Sila pastikan Web App URL sah.');
        }
      } else if (op === 'PUSH') {
        await api.pushAllToGoogleSheets();
        setLastSyncTime(api.getLastSyncTime());
        const [records, employees, offices] = await Promise.all([
          api.getAllAttendance(),
          api.getEmployees(),
          api.getOffices(),
        ]);
        setStatusMessage({
          type: 'success',
          text: `Semua data aplikasi (${records.length} rekod kehadiran, ${employees.length} staf, ${offices.length} cawangan) telah disegerakkan ke Google Sheets!`,
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Operasi penyegerakan gagal.' });
    } finally {
      setLoading(false);
    }
  };

  const isWebhookActive = Boolean(googleSheetsDb.getSavedWebhookUrl());

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">Pangkalan Data Google Sheets (Auto-Sync Dua Hala)</h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isWebhookActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {isWebhookActive ? '✓ Auto-Sync 100% Aktif' : 'Belum Bersambung'}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Penyegerakan dua hala berjalan secara automatik sepenuhnya (Setiap perubahan di Google Sheets terus dikemas kini ke aplikasi, dan sebaliknya).
              </p>
              {lastSyncTime && (
                <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                  ⟳ Penyegerakan automatik terakhir: {lastSyncTime} (Auto-segerak setiap 4 saat)
                </p>
              )}
            </div>
          </div>

          {/* Instant Refresh Indicator / Button */}
          {isWebhookActive && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={loading}
                onClick={() => executeImmediateSync('PULL')}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Menyegerak...' : 'Auto-Sync Aktif (Semak Sekarang)'}</span>
              </button>
            </div>
          )}
        </div>

        {statusMessage && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-center justify-between ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : statusMessage.type === 'error'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-700 px-2 cursor-pointer">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Main Google Sheets Config Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-start gap-3 bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-2xl">
          <ArrowLeftRight className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 space-y-1">
            <strong className="text-emerald-900 font-bold block text-sm">
              Penyegerakan Dua Hala (Two-Way Sync) Google Sheets ↔ Aplikasi
            </strong>
            <p>
              Aplikasi ini menyemak perubahan di Google Sheets secara automatik setiap <strong>8 saat</strong> dan setiap kali anda membuka aplikasi. Jika anda <strong>memadam baris di Google Sheets</strong>, rekod tersebut akan turut terpadam di dalam aplikasi secara automatik!
            </p>
          </div>
        </div>

        {/* Webhook URL Input */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <label className="block text-xs font-bold text-slate-900">
              1. Web App URL Google Apps Script (Wajib untuk Baca & Tulis):
            </label>
            {googleSheetsDb.getDefaultWebhookUrl() && (
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1 self-start sm:self-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                {googleSheetsDb.isUsingDefaultWebhook()
                  ? '✓ Menggunakan URL Kod Asal (src/config/database.ts)'
                  : 'Tetapan Diubah Suai Tempatan'}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Link className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                value={webhookUrlInput}
                onChange={(e) => setWebhookUrlInput(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 shadow-xs"
              />
            </div>

            <button
              type="button"
              disabled={loading || !webhookUrlInput.trim()}
              onClick={handleSaveConfig}
              className="px-4 py-2 rounded-xl bg-[#588517] hover:bg-[#4c7512] disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Menyambung...' : 'Simpan & Segerak'}</span>
            </button>

            <button
              type="button"
              disabled={testingWebhook || !webhookUrlInput.trim()}
              onClick={handleTestWebhook}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 border border-slate-300 shadow-xs"
            >
              {testingWebhook ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span>{testingWebhook ? 'Menguji...' : 'Uji Sambungan'}</span>
            </button>

            {googleSheetsDb.getDefaultWebhookUrl() && !googleSheetsDb.isUsingDefaultWebhook() && (
              <button
                type="button"
                onClick={handleResetToDefaultWebhook}
                className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-amber-800 border border-amber-300 text-xs font-semibold transition cursor-pointer shrink-0"
              >
                Guna URL Asal
              </button>
            )}

            {!googleSheetsDb.isUsingDefaultWebhook() && isWebhookActive && (
              <button
                type="button"
                onClick={handleRemoveWebhook}
                className="px-3 py-2 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-semibold transition cursor-pointer shrink-0"
              >
                Reset
              </button>
            )}
          </div>

          {/* Optional Direct Google Sheet Link / ID */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-900">
                2. Pautan / ID Google Sheet Anda (Pilihan untuk Butang Buka Terus & Bacaan Pantas):
              </label>
              {sheetInfo && (
                <a
                  href={sheetInfo.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                >
                  <span>Buka Google Sheet</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                value={sheetUrlInput}
                onChange={(e) => setSheetUrlInput(e.target.value)}
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 shadow-xs"
              />
              <button
                type="button"
                onClick={handleSaveSheetLink}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-bold transition cursor-pointer shrink-0 shadow-xs"
              >
                Simpan Pautan Sheet
              </button>
            </div>
          </div>

          {isWebhookActive && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold pt-1">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>
                Pangkalan data Google Sheets aktif! Setiap Clock In / Out, penambahan/pemadaman staf, atau pemadaman terus di Google Sheets diselaraskan secara automatik.
              </span>
            </div>
          )}
        </div>

        {/* 3 Step Guide & Apps Script V2 Code */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <span>Panduan Kod Google Apps Script (Sokongan Penuh Dua Hala):</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#588517] text-white font-bold flex items-center justify-center text-[11px]">
                  1
                </span>
                <strong className="text-slate-900">Buka Google Sheets</strong>
              </div>
              <p className="text-slate-600 text-[11px]">
                Buka fail Google Sheet pangkalan data kehadiran Halagel anda.
              </p>
              <a
                href={sheetInfo?.spreadsheetUrl || 'https://sheets.new'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline pt-1"
              >
                {sheetInfo ? 'Buka Google Sheet Anda' : 'Buka Google Sheet Baharu'} <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#588517] text-white font-bold flex items-center justify-center text-[11px]">
                  2
                </span>
                <strong className="text-slate-900">Tampal Kod Apps Script V2</strong>
              </div>
              <p className="text-slate-600 text-[11px]">
                Di Google Sheets, klik <strong>Extensions &gt; Apps Script</strong> dan tampal kod skrip Dua Hala di bawah:
              </p>
              <button
                type="button"
                onClick={handleCopyScript}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 text-[10px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Copy className="w-3 h-3" />
                <span>{isCopied ? '✓ Disalin ke Papan Keratan!' : 'Salin Kod Apps Script V2'}</span>
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#588517] text-white font-bold flex items-center justify-center text-[11px]">
                  3
                </span>
                <strong className="text-slate-900">Deploy Web App</strong>
              </div>
              <p className="text-slate-600 text-[11px]">
                Klik <strong>Deploy &gt; New deployment &gt; Web app</strong> (Who has access: <em>Anyone</em>). Salin Web app URL ke kotak di atas.
              </p>
            </div>
          </div>

          {/* Leading Zero (0) Staff ID Guide */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
            <div className="font-bold text-amber-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Penyelesaian Isu ID Staf Bermula Dengan Angka "0" (Contoh: 0123 / 0045) Di Google Sheets</span>
            </div>
            <ul className="list-disc list-inside text-[11px] text-amber-900 space-y-1 leading-relaxed">
              <li>
                <strong>Automatik Dari Aplikasi:</strong> Setiap kali ID Staf bermula dengan <code>0</code> disimpan dari aplikasi ini, sistem secara automatik menghantar awalan teks (<code>'0123</code>) dan menetapkan format <code>Plain Text (@)</code> supaya Google Sheets tidak membuang angka <code>0</code>.
              </li>
              <li>
                <strong>Jika Menaip Terus Di Dalam Google Sheets:</strong> Taip tanda koma atas tunggal (<code>'</code>) sebelum nombor seperti <code>'0123</code> (tanda <code>'</code> akan disembunyikan secara automatik), <strong>ATAU</strong> pilih lajur <em>ID Staf</em> di Google Sheets dan klik menu <strong>Format &gt; Number &gt; Plain text</strong>.
              </li>
            </ul>
          </div>

          {/* Vercel Multi-Device Guide */}
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-2">
            <div className="font-bold text-blue-950 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Konfigurasi Kekal Merentasi Semua Peranti (Tanpa Firebase)</span>
            </div>
            <p className="text-[11px] text-blue-900 leading-relaxed">
              URL Google Apps Script disimpan terus dalam <code>src/config/database.ts</code> atau pembolehubah persekitaran <code>VITE_GOOGLE_APPS_SCRIPT_URL</code> supaya semua peranti kakitangan membaca dan menulis terus ke Google Sheet yang sama.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
