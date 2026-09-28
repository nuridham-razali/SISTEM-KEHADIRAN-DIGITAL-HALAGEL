import React, { useState, useEffect } from 'react';
import { googleSignIn, getAccessToken, logoutGoogle, initGoogleAuth } from '../../services/googleAuth';
import { googleSheetsDb, SpreadsheetInfo } from '../../services/googleSheetsDb';
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
  FileText,
} from 'lucide-react';

interface GoogleSheetsDbManagerProps {
  onDataChanged: () => void;
}

export const GoogleSheetsDbManager: React.FC<GoogleSheetsDbManagerProps> = ({ onDataChanged }) => {
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(googleSheetsDb.getSavedSpreadsheetId());
  const [sheetInfo, setSheetInfo] = useState<SpreadsheetInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [customSheetInput, setCustomSheetInput] = useState('');
  const [showConfirmSyncModal, setShowConfirmSyncModal] = useState(false);
  const [syncOperation, setSyncOperation] = useState<'PUSH' | 'PULL' | null>(null);

  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
        if (spreadsheetId && token) {
          loadSheetMetadata(token, spreadsheetId);
        }
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, [spreadsheetId]);

  const loadSheetMetadata = async (token: string, id: string) => {
    try {
      const info = await googleSheetsDb.getSpreadsheetMetadata(token, id);
      setSheetInfo(info);
    } catch (err: any) {
      console.warn('Gagal membaca maklumat spreadsheet:', err);
    }
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

        const savedId = googleSheetsDb.getSavedSpreadsheetId();
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
    setSheetInfo(null);
    setStatusMessage({ type: 'info', text: 'Telah dilog keluar dari Google.' });
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

      // Immediately populate with existing data
      const [records, employees, offices] = await Promise.all([
        api.getAllAttendance(),
        api.getEmployees(),
        api.getOffices(),
      ]);

      await googleSheetsDb.syncAllToSheet(token, created.spreadsheetId, records, employees, offices);

      setStatusMessage({
        type: 'success',
        text: `Pangkalan Data Google Sheet baharu berjaya dicipta: "${created.title}" & disegerakkan dengan rekod semasa!`,
      });
      onDataChanged();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Gagal mencipta Google Sheet baharu.' });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectCustomSheet = async () => {
    if (!customSheetInput.trim()) return;
    const token = accessToken || (await getAccessToken());
    if (!token) {
      setStatusMessage({ type: 'error', text: 'Sila log masuk dengan akaun Google terlebih dahulu.' });
      return;
    }

    // Extract ID from URL if full URL is pasted
    let cleanId = customSheetInput.trim();
    const match = cleanId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      cleanId = match[1];
    }

    setLoading(true);
    setStatusMessage(null);
    try {
      const info = await googleSheetsDb.getSpreadsheetMetadata(token, cleanId);
      setSpreadsheetId(cleanId);
      googleSheetsDb.setSavedSpreadsheetId(cleanId);
      setSheetInfo(info);
      setCustomSheetInput('');
      setStatusMessage({ type: 'success', text: `Berjaya menghubungkan spreadsheet: "${info.title}"!` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Spreadsheet tidak dijumpai atau tiada akses.' });
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

    if (!token || !id) {
      setStatusMessage({ type: 'error', text: 'Sila log masuk Google dan pilih spreadsheet dahulu.' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      if (syncOperation === 'PUSH') {
        const [records, employees, offices] = await Promise.all([
          api.getAllAttendance(),
          api.getEmployees(),
          api.getOffices(),
        ]);
        await googleSheetsDb.syncAllToSheet(token, id, records, employees, offices);
        setStatusMessage({
          type: 'success',
          text: `Semua data (${records.length} rekod kehadiran, ${employees.length} staf) telah dimuat naik ke Google Sheets!`,
        });
      } else if (syncOperation === 'PULL') {
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

  return (
    <div className="space-y-4">
      {/* Top Banner & Google Auth Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-[#182234] to-slate-900 border border-slate-700/80 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Pangkalan Data Google Sheets</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Cloud Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gunakan Google Sheets rasmi sebagai pangkalan data awan untuk menyimpan kehadiran, pekerja & cawangan
              </p>
            </div>
          </div>

          {/* Google Sign-in / Connected Status */}
          <div>
            {googleUser ? (
              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 p-2 rounded-2xl text-xs">
                {googleUser.photoURL ? (
                  <img src={googleUser.photoURL} alt="Google" className="w-7 h-7 rounded-full border border-emerald-400" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-[10px]">
                    {googleUser.displayName?.charAt(0) || 'G'}
                  </div>
                )}
                <div className="text-left pr-2">
                  <div className="text-white font-bold text-[11px] truncate max-w-[150px]">{googleUser.displayName || 'Google User'}</div>
                  <div className="text-[10px] text-emerald-400">Terhubung</div>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleLogout}
                  className="px-2 py-1 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] transition cursor-pointer"
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
                <span>{isSigningIn ? 'Menyambung...' : 'Sambung Google Sheets'}</span>
              </button>
            )}
          </div>
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

      {/* Spreadsheet Status & Actions Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#182234] border border-slate-800 shadow-xl space-y-4">
        {sheetInfo ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-sm text-white">{sheetInfo.title}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  ID: {sheetInfo.spreadsheetId}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-emerald-400">
                  <span>✓ Tab: Kehadiran</span>
                  <span>•</span>
                  <span>✓ Tab: Kakitangan</span>
                  <span>•</span>
                  <span>✓ Tab: Cawangan</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                disabled={loading}
                onClick={() => promptSync('PUSH')}
                className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition flex items-center gap-3 cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Muat Naik Rekod Semasa</div>
                  <div className="text-[10px] text-slate-400">Segerakkan kehadiran & staf tempatan ke Google Sheet</div>
                </div>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => promptSync('PULL')}
                className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-left transition flex items-center gap-3 cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition">
                  <DownloadCloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Muat Turun Dari Google Sheet</div>
                  <div className="text-[10px] text-slate-400">Kemas kini aplikasi dengan data lembaran Google Sheet</div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <FileSpreadsheet className="w-7 h-7" />
            </div>

            <div className="max-w-md mx-auto">
              <h4 className="text-sm font-bold text-white">Belum Ada Spreadsheet Pangkalan Data Dihubungkan</h4>
              <p className="text-xs text-slate-400 mt-1">
                Cipta spreadsheet baharu secara automatik atau sambungkan spreadsheet Google Sheets sedia ada anda.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <button
                type="button"
                disabled={loading || !googleUser}
                onClick={handleCreateNewSpreadsheet}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Cipta Pangkalan Data Baharu</span>
              </button>
            </div>
          </div>
        )}

        {/* Connect Existing Sheet By URL or ID */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Link className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Atau masukkan URL / ID Google Spreadsheet sedia ada..."
              value={customSheetInput}
              onChange={(e) => setCustomSheetInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="button"
            disabled={!customSheetInput.trim() || loading || !googleUser}
            onClick={handleConnectCustomSheet}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            Hubungkan
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Mutating/Syncing Operations (Mandatory User Confirmation) */}
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
                ? 'Adakah anda pasti ingin memuat naik dan mengemas kini semua rekod kehadiran, senarai kakitangan, dan cawangan Halagel ke Google Sheets?'
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
