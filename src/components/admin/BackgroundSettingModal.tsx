import React, { useState } from 'react';
import { X, Image as ImageIcon, Copy, Check, RotateCcw, Upload, Sparkles } from 'lucide-react';
import { getHalagelBackground, RAW_BACKGROUND_BASE64 } from '../../assets/background';

interface BackgroundSettingModalProps {
  onClose: () => void;
  onBackgroundChange: (newBg: string) => void;
}

export const BackgroundSettingModal: React.FC<BackgroundSettingModalProps> = ({
  onClose,
  onBackgroundChange,
}) => {
  const [base64Input, setBase64Input] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('HALAGEL_CUSTOM_BG');
      if (stored) return stored;
    }
    return RAW_BACKGROUND_BASE64 || '';
  });
  const [copySuccess, setCopySuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const handleApplyBase64 = (customValue?: string) => {
    const textToApply = customValue !== undefined ? customValue : base64Input;
    const trimmed = textToApply.trim();
    if (!trimmed) {
      setUploadError('Sila masukkan rentetan Base64 atau muat naik imej.');
      return;
    }

    const formatted = trimmed.startsWith('data:') ? trimmed : `data:image/jpeg;base64,${trimmed}`;

    try {
      localStorage.setItem('HALAGEL_CUSTOM_BG', formatted);
      onBackgroundChange(formatted);
      setStatusMessage('Imej latar belakang berjaya dikemas kini!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setUploadError('Gagal menyimpan imej dalam simpanan pelayar (saiz mungkin terlalu besar).');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Sila pilih fail imej yang sah (JPG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setBase64Input(result);
        setUploadError('');
      }
    };
    reader.onerror = () => {
      setUploadError('Gagal membaca fail imej.');
    };
    reader.readAsDataURL(file);
  };

  const handleResetBackground = () => {
    localStorage.removeItem('HALAGEL_CUSTOM_BG');
    setBase64Input('');
    const defaultBg = getHalagelBackground();
    onBackgroundChange(defaultBg);
    setStatusMessage('Latar belakang telah dikembalikan kepada reka bentuk asal.');
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleCopyBase64 = () => {
    if (!base64Input) return;
    navigator.clipboard.writeText(base64Input).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900">Tetapan Imej Latar Belakang (Base64)</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                  Admin Sahaja
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal">
                Ubah imej latar belakang skrin log masuk dan papan pemuka staf
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:text-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {statusMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {uploadError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {uploadError}
          </div>
        )}

        {/* Option 1: File Upload */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pilihan 1: Muat Naik Fail Imej dari Komputer / Telefon</span>
          </label>
          <p className="text-[11px] text-slate-500">
            Pilih fail imej (JPG, PNG, WEBP) untuk ditukarkan kepada format Base64 secara automatik:
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
          />
        </div>

        {/* Option 2: Paste Base64 */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-900">
              Pilihan 2: Tampal Rentetan Base64 Secara Manual
            </label>
            {base64Input && (
              <button
                type="button"
                onClick={handleCopyBase64}
                className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold hover:text-emerald-800"
              >
                {copySuccess ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copySuccess ? 'Disalin!' : 'Salin Base64'}</span>
              </button>
            )}
          </div>
          <textarea
            value={base64Input}
            onChange={(e) => setBase64Input(e.target.value)}
            placeholder="Tampal data:image/jpeg;base64,... atau /9j/4AAQSkZJRg..."
            rows={4}
            className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 placeholder:text-slate-400 font-mono focus:outline-none focus:border-emerald-500 shadow-xs"
          />
        </div>

        {/* Live Preview */}
        {base64Input && (
          <div className="space-y-1.5">
            <div className="text-[11px] text-slate-600 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Pratonton Imej:</span>
            </div>
            <div className="h-32 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
              <img
                src={base64Input.startsWith('data:') ? base64Input : `data:image/jpeg;base64,${base64Input}`}
                alt="Pratonton Latar"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Instructions for background.ts */}
        <div className="text-[11px] bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5 text-slate-600">
          <div className="font-bold text-emerald-900">💡 Arahan untuk Tetapan Kekal dalam Kod:</div>
          <p className="leading-relaxed">
            Jika anda ingin latar belakang ini kekal bagi semua peranti walaupun memori pelayar dikosongkan, salin kod Base64 di atas dan tampal pada pembolehubah:
          </p>
          <code className="block text-slate-900 font-mono bg-white px-2.5 py-1.5 rounded-lg text-[10px] break-all border border-slate-200">
            export const RAW_BACKGROUND_BASE64: string = 'KOD_BASE64_ANDA';
          </code>
          <p className="text-[10px] text-slate-500">
            Lokasi fail: <strong>/src/assets/background.ts</strong>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => handleApplyBase64()}
            className="flex-1 py-2.5 rounded-xl bg-[#588517] hover:bg-[#4c7512] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Simpan & Gunakan Latar</span>
          </button>

          <button
            type="button"
            onClick={handleResetBackground}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
            title="Kembalikan ke latar asal"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Asal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
