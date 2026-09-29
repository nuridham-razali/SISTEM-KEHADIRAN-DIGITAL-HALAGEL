import React, { useState, useEffect } from 'react';
import { googleSignIn, getAccessToken, logoutGoogle, initGoogleAuth } from '../../services/googleAuth';
import { googleSheetsDb, SpreadsheetInfo } from '../../services/googleSheetsDb';
import { cloudConfigService } from '../../services/cloudConfig';
import { api } from '../../services/api';
import {
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  PlusCircle,
  AlertTriangle,
  Link,
  ShieldCheck,
  Check,
  X,
  Copy,
  Zap,
  HelpCircle,
  Code,
  Globe,
} from 'lucide-react';

interface GoogleSheetsDbManagerProps {
  onDataChanged: () => void;
}

const APPS_SCRIPT_CODE = `// HALAGEL ATTENDANCE GOOGLE APPS SCRIPT WEBHOOK
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Kehadiran");
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ status: "ok", data: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify({ status: "ok", data: data.slice(1) }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var payload = JSON.parse(e.postData.contents);
  var action = payload.action;

  if (action === "SYNC_ALL") {
    var attSheet = getOrCreateSheet(ss, "Kehadiran");
    attSheet.clear();
    attSheet.appendRow(["Session ID", "ID Staf", "Nama Kakitangan", "Jabatan", "Tarikh", "Waktu Masuk", "Waktu Keluar", "Status Kehadiran", "Jumlah Jam", "Jarak Geofens (m)", "Pengesahan Wajah", "Nota Pengecualian", "Cawangan", "Kemaskini"]);
    if (payload.records && payload.records.length > 0) {
      payload.records.forEach(function(r) {
        attSheet.appendRow([
          r.sessionId, r.employeeId, r.employeeName, r.department, r.workDate,
          r.clockInTimeKL, r.clockOutTimeKL || "Belum Keluar", r.attendanceStatus,
          r.workedHours ? (r.workedHours + " jam") : "-", r.clockInDistanceMeters || 0,
          r.faceVerified, r.exceptionNotes || "-", r.officeId, new Date().toLocaleString()
        ]);
      });
    }

    var empSheet = getOrCreateSheet(ss, "Kakitangan");
    empSheet.clear();
    empSheet.appendRow(["ID Staf", "Nama", "Emel", "Jabatan", "ID Cawangan", "Peranan", "Status Wajah", "Tarikh Didaftar"]);
    if (payload.employees) {
      payload.employees.forEach(function(e) {
        empSheet.appendRow([e.employeeId, e.name, e.email, e.department, e.assignedOfficeId, e.role, e.faceEnrolled ? "Didaftar" : "Belum", e.faceEnrolledAt || "-"]);
      });
    }

    var offSheet = getOrCreateSheet(ss, "Cawangan");
    offSheet.clear();
    offSheet.appendRow(["ID Cawangan", "Nama Cawangan", "Alamat", "Latitude", "Longitude", "Radius (m)", "Status"]);
    if (payload.offices) {
      payload.offices.forEach(function(o) {
        offSheet.appendRow([o.officeId, o.name, o.address, o.latitude, o.longitude, o.radiusMeters, o.active ? "Aktif" : "Tidak Aktif"]);
      });
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "SAVE_ATTENDANCE") {
    var attSheet = getOrCreateSheet(ss, "Kehadiran");
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
      r.clockInTimeKL, r.clockOutTimeKL || "Belum Keluar", r.attendanceStatus,
      r.workedHours ? (r.workedHours + " jam") : "-", r.clockInDistanceMeters || 0,
      r.faceVerified, r.exceptionNotes || "-", r.officeId, new Date().toLocaleString()
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
  const [activeSubTab, setActiveSubTab] = useState<'WEBHOOK' | 'OAUTH'>(() => {
    return googleSheetsDb.getSavedSpreadsheetId() ? 'OAUTH' : 'WEBHOOK';
  });
  const [webhookUrlInput, setWebhookUrlInput] = useState(googleSheetsDb.getSavedWebhookUrl() || '');
  const [isCopied, setIsCopied] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(googleSheetsDb.getSavedSpreadsheetId());
  const [sheetInfo, setSheetInfo] = useState<SpreadsheetInfo | null>(() => googleSheetsDb.getSavedSpreadsheetInfo());
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [customSheetInput, setCustomSheetInput] = useState('');
  const [showConfirmSyncModal, setShowConfirmSyncModal] = useState(false);
  const [syncOperation, setSyncOperation] = useState<'PUSH' | 'PULL' | null>(null);

  useEffect(() => {
    // 1. Initial fetch of shared database config from Firestore
    cloudConfigService.fetchConfigFromCloud().then((cfg) => {
      if (cfg) {
        if (cfg.spreadsheetId) setSpreadsheetId(cfg.spreadsheetId);
        if (cfg.spreadsheetTitle && cfg.spreadsheetId && cfg.spreadsheetUrl) {
          setSheetInfo({
            spreadsheetId: cfg.spreadsheetId,
            title: cfg.spreadsheetTitle,
            spreadsheetUrl: cfg.spreadsheetUrl,
          });
        }
        if (cfg.webhookUrl) {
          setWebhookUrlInput(cfg.webhookUrl);
        }
      }
    });

    // 2. Real-time subscription so other devices stay in sync
    const unsubscribeCloud = cloudConfigService.subscribeToCloudConfig((cfg) => {
      if (cfg) {
        if (cfg.spreadsheetId) setSpreadsheetId(cfg.spreadsheetId);
        if (cfg.spreadsheetTitle && cfg.spreadsheetId && cfg.spreadsheetUrl) {
          setSheetInfo({
            spreadsheetId: cfg.spreadsheetId,
            title: cfg.spreadsheetTitle,
            spreadsheetUrl: cfg.spreadsheetUrl,
          });
        }
        if (cfg.webhookUrl) {
          setWebhookUrlInput(cfg.webhookUrl);
        }
      }
    });

    // 3. Google OAuth state listener
    const unsubscribeAuth = initGoogleAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
        const currentId = spreadsheetId || googleSheetsDb.getSavedSpreadsheetId();
        if (currentId && token) {
          loadSheetMetadata(token, currentId);
        }
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );

    return () => {
      unsubscribeCloud();
      unsubscribeAuth();
    };
  }, [spreadsheetId]);

  const loadSheetMetadata = async (token: string, id: string) => {
    try {
      const info = await googleSheetsDb.getSpreadsheetMetadata(token, id);
      setSheetInfo(info);
      googleSheetsDb.setSavedSpreadsheetInfo(info);
      await cloudConfigService.saveConfigToCloud({
        spreadsheetId: info.spreadsheetId,
        spreadsheetTitle: info.title,
        spreadsheetUrl: info.spreadsheetUrl,
      });
    } catch (err: any) {
      console.warn('Gagal membaca maklumat spreadsheet:', err);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleSaveWebhook = async () => {
    if (!webhookUrlInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Sila masukkan URL Webhook Google Apps Script.' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);
    try {
      googleSheetsDb.setSavedWebhookUrl(webhookUrlInput.trim());
      await cloudConfigService.saveConfigToCloud({ webhookUrl: webhookUrlInput.trim() });

      // Immediately sync current data
      const [records, employees, offices] = await Promise.all([
        api.getAllAttendance(),
        api.getEmployees(),
        api.getOffices(),
      ]);

      await googleSheetsDb.syncViaWebhook(webhookUrlInput.trim(), records, employees, offices);

      setStatusMessage({
        type: 'success',
        text: 'Pangkalan data Google Apps Script berjaya disambungkan & diselaraskan ke semua peranti! Semua rekod telah dimuat naik ke Google Sheet.',
      });
      onDataChanged();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal menyegerakkan dengan Webhook.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveWebhook = async () => {
    googleSheetsDb.clearSavedWebhookUrl();
    await cloudConfigService.saveConfigToCloud({ webhookUrl: null });
    setWebhookUrlInput('');
    setStatusMessage({ type: 'info', text: 'Sambungan Webhook telah diputuskan di semua peranti.' });
  };

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setStatusMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setAccessToken(res.accessToken);
        setStatusMessage({ type: 'success', text: `Berjaya disambungkan ke akaun Google: ${res.user.email}` });

        const savedId = spreadsheetId || googleSheetsDb.getSavedSpreadsheetId();
        if (savedId) {
          await loadSheetMetadata(res.accessToken, savedId);
        }
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Log masuk Google gagal.' });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setAccessToken(null);
    setStatusMessage({ type: 'info', text: 'Telah dilog keluar dari Google pada peranti ini.' });
  };

  const handleCreateNewSpreadsheet = async () => {
    const token = accessToken || (await getAccessToken());
    if (!token) {
      setStatusMessage({ type: 'error', text: 'Sila log masuk dengan akaun Google terlebih dahulu.' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);
    try {
      const created = await googleSheetsDb.createDatabaseSpreadsheet(token);
      setSpreadsheetId(created.spreadsheetId);
      setSheetInfo(created);
      googleSheetsDb.setSavedSpreadsheetInfo(created);
      await cloudConfigService.saveConfigToCloud({
        spreadsheetId: created.spreadsheetId,
        spreadsheetTitle: created.title,
        spreadsheetUrl: created.spreadsheetUrl,
      });

      const [records, employees, offices] = await Promise.all([
        api.getAllAttendance(),
        api.getEmployees(),
        api.getOffices(),
      ]);

      await googleSheetsDb.syncAllToSheet(token, created.spreadsheetId, records, employees, offices);

      setStatusMessage({
        type: 'success',
        text: `Pangkalan Data Google Sheet baharu berjaya dicipta: "${created.title}" & diselaraskan ke semua peranti staf!`,
      });
      onDataChanged();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal mencipta Google Sheet baharu.' });
    } finally {
      setLoading(false);
    }
  };

  const promptSync = (op: 'PUSH' | 'PULL') => {
    setSyncOperation(op);
    setShowConfirmSyncModal(true);
  };

  const executeSync = async () => {
    setShowConfirmSyncModal(false);
    const token = accessToken || (await getAccessToken());
    const id = spreadsheetId || googleSheetsDb.getSavedSpreadsheetId();
    const webhook = googleSheetsDb.getSavedWebhookUrl();

    setLoading(true);
    setStatusMessage(null);

    try {
      if (syncOperation === 'PUSH') {
        const [records, employees, offices] = await Promise.all([
          api.getAllAttendance(),
          api.getEmployees(),
          api.getOffices(),
        ]);

        if (webhook) {
          await googleSheetsDb.syncViaWebhook(webhook, records, employees, offices);
        } else if (token && id) {
          await googleSheetsDb.syncAllToSheet(token, id, records, employees, offices);
        } else {
          throw new Error('Sila sambungkan Google Sheets terlebih dahulu.');
        }

        setStatusMessage({
          type: 'success',
          text: `Semua data (${records.length} rekod kehadiran, ${employees.length} staf) telah dimuat naik ke Google Sheets!`,
        });
      } else if (syncOperation === 'PULL') {
        if (!token || !id) {
          throw new Error('Penyegerakan muat turun memerlukan sambungan Google OAuth.');
        }
        const importedRecords = await googleSheetsDb.readAttendanceRecords(token, id);
        if (importedRecords.length > 0) {
          localStorage.setItem('halagel_attendance_v1', JSON.stringify(importedRecords));
          setStatusMessage({
            type: 'success',
            text: `Berjaya memuat turun ${importedRecords.length} rekod kehadiran daripada Google Sheets!`,
          });
          onDataChanged();
        } else {
          setStatusMessage({ type: 'info', text: 'Tiada rekod kehadiran dijumpai dalam Google Sheet ini.' });
        }
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Operasi penyegerakan gagal.' });
    } finally {
      setLoading(false);
    }
  };

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'domain-anda.vercel.app';
  const isWebhookActive = !!googleSheetsDb.getSavedWebhookUrl();

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-[#182234] to-slate-900 border border-slate-700/80 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Pangkalan Data Google Sheets</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isWebhookActive || sheetInfo ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                  {isWebhookActive || sheetInfo ? '✓ Live Connected' : 'Belum Bersambung'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pilih kaedah penyambungan Google Sheets pilihan anda untuk menyimpan rekod kehadiran kakitangan
              </p>
            </div>
          </div>

          {/* Quick sync button if connected */}
          {(isWebhookActive || sheetInfo) && (
            <button
              type="button"
              disabled={loading}
              onClick={() => promptSync('PUSH')}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-500/20"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{loading ? 'Menyegerak...' : 'Segerak Sekarang'}</span>
            </button>
          )}
        </div>

        {/* Method Switcher Tabs */}
        <div className="flex gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('WEBHOOK')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'WEBHOOK'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Kaedah 1: Google Apps Script (Disyorkan untuk Vercel - Tiada Ralat Domain)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('OAUTH')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'OAUTH'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>Kaedah 2: Google OAuth / Firebase</span>
          </button>
        </div>

        {statusMessage && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-center justify-between ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                : statusMessage.type === 'error'
                ? 'bg-red-500/15 border border-red-500/40 text-red-300'
                : 'bg-blue-500/15 border border-blue-500/40 text-blue-300'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white px-2">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* SUBTAB 1: WEBHOOK (BYPASSES ALL DOMAIN ERRORS ON VERCEL) */}
      {activeSubTab === 'WEBHOOK' && (
        <div className="p-4 sm:p-5 rounded-3xl bg-[#182234] border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-2xl">
            <Zap className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <strong className="text-emerald-300 font-bold block text-sm">Mengapa Kaedah Ini Terbaik Untuk Vercel?</strong>
              <p>
                Kaedah ini menggunakan Google Apps Script Webhook rasmi. Ia <strong>100% bebas daripada sekatan domain Firebase / Vercel</strong>, berfungsi serta-merta tanpa perlu menetapkan Authorized Domains di konsol Firebase mahupun Google Cloud.
              </p>
            </div>
          </div>

          {/* 3 Step Tutorial */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Langkah Mudah Sambung Google Sheets (2 Minit):</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-[11px]">1</span>
                  <strong className="text-white">Buka Google Sheets</strong>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Buka fail Google Sheet baharu atau sedia ada di akaun Google anda.
                </p>
                <a
                  href="https://sheets.new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:underline pt-1"
                >
                  Buka Google Sheet Baharu <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-[11px]">2</span>
                  <strong className="text-white">Tampal Kod Apps Script</strong>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Di Google Sheets, klik menu <strong>Extensions &gt; Apps Script</strong>. Padam kod sedia ada dan tampal kod skrip Halagel di bawah:
                </p>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{isCopied ? '✓ Disalin ke Papan Keratan!' : 'Salin Kod Apps Script'}</span>
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-[11px]">3</span>
                  <strong className="text-white">Deploy &amp; Salin URL</strong>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Klik <strong>Deploy &gt; New deployment</strong>. Pilih <strong>Web app</strong> (Who has access: <em>Anyone</em>). Klik Deploy dan salin Web app URL.
                </p>
              </div>
            </div>
          </div>

          {/* Webhook Input and Action */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-3">
            <label className="block text-xs font-bold text-white">
              Masukkan Web App URL Google Apps Script:
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Link className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  value={webhookUrlInput}
                  onChange={(e) => setWebhookUrlInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="button"
                disabled={loading || !webhookUrlInput.trim()}
                onClick={handleSaveWebhook}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{loading ? 'Menyambung...' : 'Simpan & Segerak Sekarang'}</span>
              </button>

              {isWebhookActive && (
                <button
                  type="button"
                  onClick={handleRemoveWebhook}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-xs font-semibold transition cursor-pointer"
                >
                  Padam
                </button>
              )}
            </div>

            {isWebhookActive && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold pt-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Pangkalan data Webhook aktif! Setiap Clock In / Out akan terus direkod ke Google Sheet secara automatik.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: OAUTH & DETAILED DOMAIN GUIDANCE */}
      {activeSubTab === 'OAUTH' && (
        <div className="p-4 sm:p-5 rounded-3xl bg-[#182234] border border-slate-800 shadow-xl space-y-4">
          {/* Explanation on Why the Button Couldn't Be Found */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-slate-300 space-y-2">
            <div className="font-bold text-amber-300 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Di Manakah Butang "Authorized domains" Sebenar?</span>
            </div>
            <p className="leading-relaxed">
              Ramai pengguna tidak menjumpai butang ini kerana tersilap klik pada <strong>Project Settings (ikon gear ⚙️ di penjuru atas)</strong>. Bahagian Project Settings <strong>memang tiada butang Authorized domains</strong>.
            </p>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1.5">
              <div className="text-white font-bold">2 Cara Betul Menambah Domain Vercel:</div>
              <div className="space-y-1">
                <div>
                  <strong className="text-emerald-400">Cara 1 (Firebase Console):</strong>
                  <p className="text-slate-400">
                    Buka menu kiri &gt; klik <strong>Authentication</strong> &gt; di bar atas klik tab <strong>Settings</strong> &gt; tatal ke bawah sehingga tajuk <strong>Authorized domains</strong> &gt; klik butang <strong>Add domain</strong>.
                  </p>
                  <a
                    href="https://console.firebase.google.com/project/gen-lang-client-0825638767/authentication/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 font-bold hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    Buka Firebase Auth Settings Terus <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <strong className="text-blue-400">Cara 2 (Google Cloud Console - Paling Tepat):</strong>
                  <p className="text-slate-400">
                    Buka Google Cloud Credentials &gt; klik nama OAuth Client: <code>677649965438-r4b94cvl9tlvgj04ajvd3nr0a4of9cto...</code> &gt; di bawah <strong>Authorized JavaScript origins</strong> klik <strong>+ ADD URI</strong> &gt; masukkan <code>https://{currentHostname}</code> &gt; klik Save.
                  </p>
                  <a
                    href="https://console.cloud.google.com/apis/credentials?project=gen-lang-client-0825638767"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 font-bold hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    Buka Google Cloud Credentials Terus <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-slate-400">Domain Vercel anda untuk disalin:</span>
              <code className="bg-slate-900 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                {currentHostname}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(currentHostname);
                  alert('Domain disalin: ' + currentHostname);
                }}
                className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold cursor-pointer"
              >
                Salin Domain
              </button>
            </div>
          </div>

          {/* Google Sign-in Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80">
            <div>
              <h4 className="text-sm font-bold text-white">Log Masuk OAuth Google</h4>
              <p className="text-xs text-slate-400">Sambungkan akaun Google Drive anda melalui OAuth terus</p>
            </div>

            {googleUser ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-400 font-semibold">{googleUser.email} (Terhubung)</span>
                <button
                  type="button"
                  onClick={handleGoogleLogout}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Log Keluar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSigningIn}
                className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center gap-2 shadow-lg transition active:scale-[0.98] cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{isSigningIn ? 'Menyambung...' : 'Sambung Google Sheets (OAuth)'}</span>
              </button>
            )}
          </div>

          {/* Connected Spreadsheet Card */}
          {sheetInfo && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-sm text-white">{sheetInfo.title}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                      Aktif
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    ID: {sheetInfo.spreadsheetId}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-emerald-400 pt-0.5">
                    <span>✓ Tab Kehadiran</span>
                    <span>•</span>
                    <span>✓ Tab Kakitangan</span>
                    <span>•</span>
                    <span>✓ Tab Cawangan</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={sheetInfo.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka di Google Sheets</span>
                  </a>
                </div>
              </div>

              {/* Sync Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => promptSync('PUSH')}
                  className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition flex items-center gap-2.5 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Muat Naik Rekod Semasa</div>
                    <div className="text-[10px] text-slate-400">Segerak rekod & senarai staf ke lembaran</div>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => promptSync('PULL')}
                  className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition flex items-center gap-2.5 cursor-pointer"
                >
                  <DownloadCloud className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Muat Turun Dari Google Sheet</div>
                    <div className="text-[10px] text-slate-400">Ambil rekod terkini dari lembaran</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Create Spreadsheet Button */}
          {googleUser && !sheetInfo && (
            <div className="pt-2 flex justify-start">
              <button
                type="button"
                disabled={loading}
                onClick={handleCreateNewSpreadsheet}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Cipta Spreadsheet Baharu Secara Automatik</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmSyncModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#182234] border border-emerald-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Sahkan Operasi Google Sheets</h3>
                <p className="text-xs text-slate-400">Penyegerakan Data Pangkalan Data</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {syncOperation === 'PUSH'
                ? 'Adakah anda pasti ingin memuat naik dan menyegerakkan semua rekod kehadiran, senarai kakitangan, dan cawangan Halagel ke Google Sheets?'
                : 'Adakah anda pasti ingin memuat turun rekod kehadiran dari Google Sheet ke dalam aplikasi? Data tempatan akan dikemas kini mengikut lembaran Google Sheet.'}
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmSyncModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeSync}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                Ya, Teruskan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
