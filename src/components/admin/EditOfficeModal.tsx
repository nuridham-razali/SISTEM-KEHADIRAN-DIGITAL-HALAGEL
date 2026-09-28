import React, { useState } from 'react';
import { Office } from '../../types';
import { api } from '../../services/api';
import { AdminOfficeMapPicker } from './AdminOfficeMapPicker';
import { X, MapPin, Check, Building2 } from 'lucide-react';

interface EditOfficeModalProps {
  office: Office | null;
  onClose: () => void;
  onSaved: () => void;
}

export const EditOfficeModal: React.FC<EditOfficeModalProps> = ({
  office,
  onClose,
  onSaved,
}) => {
  const isCreate = !office;
  const [name, setName] = useState(office?.name || '');
  const [latitude, setLatitude] = useState<number>(office?.latitude || 5.6432);
  const [longitude, setLongitude] = useState<number>(office?.longitude || 100.4912);
  const [radiusMeters, setRadiusMeters] = useState<number>(office?.radiusMeters || 120);
  const [address, setAddress] = useState(office?.address || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Sila masukkan nama cawangan.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        latitude,
        longitude,
        radiusMeters,
        address: address.trim(),
      };

      if (isCreate) {
        await api.createOffice(payload);
      } else {
        await api.updateOffice(office.officeId, payload);
      }
      setSaving(false);
      onSaved();
    } catch (err: any) {
      setSaving(false);
      setError(err.message || 'Gagal menyimpan maklumat pejabat');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#182234] border border-slate-700/80 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl my-auto max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                {isCreate ? 'Tambah Cawangan & Zon Geofens' : 'Tetapan Lokasi Pejabat & Radius Geofens'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Peta Satelit & Peta Jalan Interaktif (Seret Penanda & Radius)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs shrink-0">
            {error}
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="space-y-4 overflow-y-auto pr-1">
          {/* Office Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nama Cawangan / Kilang
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="cth: Ibu Pejabat & Kilang Halagel MIEL"
              className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Interactive Satellite & Roadmap Picker Component */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Peta Satelit & Radius Geofens
              </label>
              <span className="text-[11px] text-emerald-400 font-bold">
                Radius Semasa: {radiusMeters} Meter
              </span>
            </div>

            <AdminOfficeMapPicker
              latitude={latitude}
              longitude={longitude}
              radiusMeters={radiusMeters}
              officeName={name}
              onLocationChange={(newLat, newLng) => {
                setLatitude(newLat);
                setLongitude(newLng);
              }}
              onRadiusChange={(newRadius) => {
                setRadiusMeters(newRadius);
              }}
            />
          </div>

          {/* Coordinate Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Latitud GPS
              </label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                required
                className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Longitud GPS
              </label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                required
                className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Had Radius (m)
              </label>
              <input
                type="number"
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(parseInt(e.target.value, 10) || 10)}
                required
                min="10"
                max="2000"
                className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Alamat Lengkap Operasi
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              placeholder="Kawasan Perusahaan MIEL, 08000 Sungai Petani, Kedah"
              className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan Cawangan & Geofens</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
