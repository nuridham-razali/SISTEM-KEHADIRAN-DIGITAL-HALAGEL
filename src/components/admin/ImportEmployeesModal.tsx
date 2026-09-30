import React, { useState, useRef } from 'react';
import { api } from '../../services/api';
import { X, Upload, FileText, Download, CheckCircle, AlertTriangle, Users } from 'lucide-react';

interface ImportEmployeesModalProps {
  onClose: () => void;
  onSuccess: (result: { added: number; updated: number }) => void;
}

export const ImportEmployeesModal: React.FC<ImportEmployeesModalProps> = ({ onClose, onSuccess }) => {
  const [csvContent, setCsvContent] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const template =
      'employeeId,name,department,assignedOfficeId,role,password\n' +
      'EMP104,Mohd Faiz,Kawalan Kualiti (QC),OFF-01,employee,Password123!\n' +
      'EMP105,Siti Aminah,Kewangan & Perakaunan,OFF-02,employee,Password123!\n' +
      'EMP106,Ahmad Zaki,Logistik & Stor,OFF-01,employee,Password123!\n';

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'templat_import_kakitangan_halagel.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = (evt.target?.result as string) || '';
      setCsvContent(text);
      parseCsv(text);
    };
    reader.readAsText(file);
  };

  const parseCsv = (text: string) => {
    setParseError(null);
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      setParseError('Fail CSV mestilah mengandungi sekurang-kurangnya satu baris tajuk dan satu baris data.');
      setParsedRows([]);
      return;
    }

    const rawHeaders = lines[0].split(',').map((h) => h.replace(/["']/g, '').trim().toLowerCase());

    const getColIndex = (aliases: string[]) => {
      return rawHeaders.findIndex((h) => aliases.some((a) => h.includes(a)));
    };

    const idIdx = getColIndex(['employeeid', 'id staf', 'id', 'staf id']);
    const nameIdx = getColIndex(['name', 'nama']);
    const emailIdx = getColIndex(['email', 'emel']);
    const deptIdx = getColIndex(['department', 'jabatan', 'bahagian']);
    const officeIdx = getColIndex(['office', 'cawangan', 'assignedofficeid']);
    const roleIdx = getColIndex(['role', 'peranan']);
    const passIdx = getColIndex(['password', 'katalaluan']);

    if (idIdx === -1 || nameIdx === -1) {
      setParseError('Lajur wajib tidak lengkap: Sila pastikan lajur "employeeId" dan "name" wujud dalam fail CSV.');
      setParsedRows([]);
      return;
    }

    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
      const empId = cols[idIdx];
      const name = cols[nameIdx];

      if (!empId || !name) continue;

      rows.push({
        employeeId: empId.toUpperCase(),
        name,
        email: emailIdx !== -1 && cols[emailIdx] ? cols[emailIdx] : `${empId.toLowerCase()}@halagel.com`,
        department: deptIdx !== -1 && cols[deptIdx] ? cols[deptIdx] : 'Pengeluaran & Operasi',
        assignedOfficeId: officeIdx !== -1 && cols[officeIdx] ? cols[officeIdx] : 'OFF-01',
        role: roleIdx !== -1 && cols[roleIdx]?.toLowerCase() === 'admin' ? 'admin' : 'employee',
        password: passIdx !== -1 && cols[passIdx] ? cols[passIdx] : 'Password123!',
      });
    }

    if (rows.length === 0) {
      setParseError('Tiada rekod sah dijumpai dalam fail CSV.');
    }

    setParsedRows(rows);
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setParseError(null);

    try {
      const result = await api.importEmployees(parsedRows);
      setImporting(false);
      onSuccess(result);
      onClose();
    } catch (err: any) {
      setImporting(false);
      setParseError(err.message || 'Gagal mengimport data kakitangan');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#182234] border border-slate-700/80 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Import Data Kakitangan (CSV)</h3>
              <p className="text-xs text-slate-400">Muat naik fail CSV untuk menambah atau mengemas kini staf secara pukal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template & Upload Section */}
        <div className="space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs">
            <div>
              <div className="font-semibold text-white">Perlukan contoh format lajur?</div>
              <div className="text-[11px] text-slate-400">Gunakan templat rasmi Halagel untuk mengelakkan ralat lajur.</div>
            </div>
            <button
              type="button"
              onClick={downloadTemplate}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Muat Turun Templat</span>
            </button>
          </div>

          {/* File input / Drag drop area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-4 text-center cursor-pointer transition bg-slate-900/40"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Upload className="w-7 h-7 text-emerald-400 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-white">
              {fileName ? fileName : 'Pilih fail CSV atau seret ke sini'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Menyokong fail .csv dengan format UTF-8</p>
          </div>

          {parseError && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}
        </div>

        {/* Parsed Rows Preview */}
        {parsedRows.length > 0 && (
          <div className="flex-1 overflow-hidden flex flex-col border border-slate-800 rounded-2xl bg-slate-900/60">
            <div className="p-2.5 px-3 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-white shrink-0">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Pratonton: {parsedRows.length} Kakitangan Dikesan</span>
              </div>
              <span className="text-[10px] text-slate-400">ID Sedia Ada Akan Dikemas Kini</span>
            </div>

            <div className="overflow-y-auto p-2 divide-y divide-slate-800/60 text-xs">
              {parsedRows.map((r, i) => (
                <div key={i} className="py-2 px-1 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-white text-xs">{r.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {r.employeeId} • {r.department} • {r.assignedOfficeId}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.role === 'admin' ? 'bg-amber-500/15 text-amber-400' : 'bg-blue-500/15 text-blue-400'}`}>
                    {r.role === 'admin' ? 'Pentadbir' : 'Staf'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex gap-2 pt-2 shrink-0 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={parsedRows.length === 0 || importing}
            onClick={handleImport}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            {importing ? (
              <span>Mengimport Data...</span>
            ) : (
              <>
                <Users className="w-4 h-4" />
                <span>Sahkan & Import ({parsedRows.length}) Staf</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
