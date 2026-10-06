/**
 * SENARAI RASMI JABATAN HALAGEL (M) SDN BHD
 * 
 * 1. Purchasing
 * 2. Medical Device
 * 3. HR & Admin
 * 4. QA/QC
 * 5. SHE
 * 6. Warehouse
 * 7. Engineering
 * 8. Sales & Marketing (Dahulu 'Sales' / 'Pemasaran & Jualan')
 * 9. Softgel
 * 10. Rocksalt
 * 11. R&D
 * 12. Toothpaste
 * 13. Cosmetics
 * 14. Admin Manufacturing
 */

export const HALAGEL_DEPARTMENTS = [
  'Purchasing',
  'Medical Device',
  'HR & Admin',
  'QA/QC',
  'SHE',
  'Warehouse',
  'Engineering',
  'Sales & Marketing',
  'Softgel',
  'Rocksalt',
  'R&D',
  'Toothpaste',
  'Cosmetics',
  'Admin Manufacturing',
] as const;

export type HalagelDepartment = (typeof HALAGEL_DEPARTMENTS)[number];

/**
 * Normalizes any department input string to the official Halagel department list.
 * Specifically converts legacy 'Sales' or 'Pemasaran & Jualan' into 'Sales & Marketing'.
 */
export function normalizeDepartmentName(raw?: string | null): string {
  if (!raw) return 'Purchasing';
  const clean = raw.trim();
  const lower = clean.toLowerCase();

  // Specifically handle user instruction: 'Sales' -> 'Sales & Marketing'
  if (
    lower === 'sales' ||
    lower === 'sale' ||
    lower === 'pemasaran & jualan' ||
    lower === 'pemasaran' ||
    lower === 'sales & marketing' ||
    lower === 'sales and marketing'
  ) {
    return 'Sales & Marketing';
  }
  if (lower === 'purchasing' || lower === 'pembelian') {
    return 'Purchasing';
  }
  if (lower === 'medical device' || lower === 'medical devices' || lower === 'peranti perubatan') {
    return 'Medical Device';
  }
  if (
    lower === 'hr & admin' ||
    lower === 'hr' ||
    lower === 'sumber manusia' ||
    lower === 'sumber manusia & pentadbiran' ||
    lower === 'hr and admin'
  ) {
    return 'HR & Admin';
  }
  if (lower === 'qa/qc' || lower === 'qa' || lower === 'qc' || lower === 'kawalan kualiti' || lower === 'kawalan kualiti (qc/qa)') {
    return 'QA/QC';
  }
  if (lower === 'she' || lower === 'safety, health & environment' || lower === 'keselamatan & kesihatan') {
    return 'SHE';
  }
  if (lower === 'warehouse' || lower === 'gudang' || lower === 'stor') {
    return 'Warehouse';
  }
  if (lower === 'engineering' || lower === 'kejuruteraan') {
    return 'Engineering';
  }
  if (lower === 'softgel') {
    return 'Softgel';
  }
  if (lower === 'rocksalt' || lower === 'rock salt' || lower === 'garam bukit') {
    return 'Rocksalt';
  }
  if (lower === 'r&d' || lower === 'rnd' || lower === 'penyelidikan' || lower === 'penyelidikan & pembangunan (r&d)') {
    return 'R&D';
  }
  if (lower === 'toothpaste' || lower === 'ubat gigi') {
    return 'Toothpaste';
  }
  if (lower === 'cosmetics' || lower === 'kosmetik') {
    return 'Cosmetics';
  }
  if (lower === 'admin manufacturing' || lower === 'admin pembuatan' || lower === 'manufacturing admin') {
    return 'Admin Manufacturing';
  }

  // Check if case-insensitive match exists in official list
  const matched = HALAGEL_DEPARTMENTS.find((d) => d.toLowerCase() === lower);
  if (matched) return matched;

  return clean;
}
