/**
 * KONFIGURASI PANGKALAN DATA GOOGLE APPS SCRIPT / GOOGLE SHEETS
 * 
 * Untuk kegunaan di Vercel & Merentasi Semua Peranti (Telefon Android, iPhone, Laptop, PC):
 * 
 * KAEDAH A (Disyorkan di Vercel Dashboard):
 * 1. Buka Vercel Dashboard -> Pilih Projek anda -> Settings -> Environment Variables.
 * 2. Tambah:
 *    Key: VITE_GOOGLE_APPS_SCRIPT_URL
 *    Value: URL Web App Google Apps Script anda (cth: https://script.google.com/macros/s/.../exec)
 * 3. Redeploy di Vercel. Semua peranti staf akan terus disambungkan secara automatik!
 * 
 * KAEDAH B (Letak URL Terus Dalam Kod):
 * Jika anda tidak mahu gunakan Vercel Environment Variables, gantikan rentetan kosong di bawah
 * dengan URL Web App Google Apps Script anda:
 */

export const DEFAULT_APPS_SCRIPT_URL: string =
  (import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL as string | undefined) ||
  '';
