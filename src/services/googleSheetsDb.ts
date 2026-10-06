import { AttendanceRecord, User, Office } from '../types';
import { DEFAULT_APPS_SCRIPT_URL } from '../config/database';
import {
  parseKLTimeStringToDate,
  computeDurationFromKLTimes,
  formatDateToDMY,
  formatDateTimeToDMY,
  getMalaysiaDateDMY,
} from '../utils/workingHours';

const SPREADSHEET_KEY = 'halagel_sheets_id_v2';
const SPREADSHEET_INFO_KEY = 'halagel_sheets_info_v2';
const WEBHOOK_KEY = 'halagel_sheets_webhook_url_v2';
const SYS_SYNC_SESSION_ID = 'SYS-DB-SYNC';

export interface SpreadsheetInfo {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
}

export interface PullSyncResult {
  synced: boolean;
  records: AttendanceRecord[];
  employees?: (User & { password?: string })[];
  offices?: Office[];
  spreadsheetInfo?: SpreadsheetInfo;
  hasCloudMeta?: boolean;
}

function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Normalizes Staff ID read from Google Sheets (strips any leading apostrophe
 * and restores leading zero if a matching local employee ID has leading zeros).
 */
function normalizeSheetEmployeeId(
  rawVal: any,
  localEmployees: { employeeId: string }[] = []
): string {
  const cleaned = String(rawVal ?? '').replace(/^'+/, '').trim().toUpperCase();
  if (!cleaned) return '';

  // Exact match first
  const exact = localEmployees.find((e) => e.employeeId.toUpperCase() === cleaned);
  if (exact) return exact.employeeId.toUpperCase();

  // If numeric (e.g. Sheet stripped "0012" -> 12), check if local has "0012"
  if (/^\d+$/.test(cleaned)) {
    const paddedMatch = localEmployees.find(
      (e) => /^\d+$/.test(e.employeeId) && e.employeeId.replace(/^0+/, '') === cleaned.replace(/^0+/, '')
    );
    if (paddedMatch) {
      return paddedMatch.employeeId.toUpperCase();
    }
  }

  return cleaned;
}

/**
 * Formats Staff ID for writing to Google Sheets via Apps Script so leading zeros
 * (e.g. "0123") are forced as Plain Text ('0123) and never stripped by Google Sheets.
 */
function formatEmployeeIdForSheet(empId: string): string {
  const clean = String(empId ?? '').replace(/^'+/, '').trim();
  if (/^0/.test(clean) || /^\d+$/.test(clean)) {
    return `'${clean}`;
  }
  return clean;
}

/**
 * Formats text for writing to Google Sheets with a leading apostrophe so Google Sheets
 * NEVER converts or misinterprets dates, times, or custom text (preventing US locale date flip).
 */
function formatTextForSheet(val?: string | null): string {
  if (!val) return '';
  const clean = String(val).replace(/^'+/, '').trim();
  if (!clean) return '';
  return `'${clean}`;
}

function normalizeWorkDate(val: any): string {
  if (!val) return formatDateToDMY();
  return formatDateToDMY(String(val));
}

function formatSheetTime(val: any, workDate: string): string {
  if (!val) return '';
  const str = String(val).trim();
  if (!str || str === '-' || str === 'Belum Keluar') return '';

  // Check if Apps Script serialized a Date object like 1899-12-30T... or 2026-...T...Z
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const timePart = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kuala_Lumpur',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(parsed);
      return `${formatDateToDMY(workDate)}, ${timePart}`;
    }
  }
  return formatDateTimeToDMY(str, workDate);
}

function parseExceptionMetadata(notes: string | null | undefined) {
  if (!notes || notes === '-') {
    return {};
  }
  let isOutstation = false;
  let outstationLocation: string | null = null;
  let entryType: string | undefined = undefined;
  let exitType: string | undefined = undefined;

  const outMatch = notes.match(/\[OUTSTATION:\s*([^\]]+)\]/i);
  if (outMatch) {
    isOutstation = true;
    outstationLocation = outMatch[1].trim();
  }
  const locMatch = notes.match(/\[Lokasi:\s*([^\]]+)\]/i);
  if (locMatch) {
    isOutstation = true;
    outstationLocation = locMatch[1].trim();
  }
  const masukMatch = notes.match(/Masuk:\s*([^•(]+)/i);
  if (masukMatch) {
    entryType = masukMatch[1].trim();
  } else {
    const bracketEntry = notes.match(/^\[([^\]]+)\]/);
    if (bracketEntry && !bracketEntry[1].toUpperCase().startsWith('OUTSTATION')) {
      entryType = bracketEntry[1].trim();
    }
  }
  const keluarMatch = notes.match(/Keluar:\s*([^•(]+)/i);
  if (keluarMatch) {
    exitType = keluarMatch[1].trim();
  }

  return { isOutstation, outstationLocation, entryType, exitType };
}

export const googleSheetsDb = {
  getSavedSpreadsheetId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(SPREADSHEET_KEY);
  },

  setSavedSpreadsheetId(idOrUrl: string) {
    if (typeof window === 'undefined') return;
    const cleanId = extractSpreadsheetId(idOrUrl);
    localStorage.setItem(SPREADSHEET_KEY, cleanId);
    this.setSavedSpreadsheetInfo({
      spreadsheetId: cleanId,
      title: 'Halagel Google Sheet Database',
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
    });
  },

  getSavedSpreadsheetInfo(): SpreadsheetInfo | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(SPREADSHEET_INFO_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setSavedSpreadsheetInfo(info: SpreadsheetInfo) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SPREADSHEET_INFO_KEY, JSON.stringify(info));
  },

  clearSavedSpreadsheetId() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SPREADSHEET_KEY);
    localStorage.removeItem(SPREADSHEET_INFO_KEY);
  },

  getSavedWebhookUrl(): string | null {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(WEBHOOK_KEY);
      if (stored && stored.trim() !== '') {
        return stored.trim();
      }
    }
    if (DEFAULT_APPS_SCRIPT_URL && DEFAULT_APPS_SCRIPT_URL.trim() !== '') {
      return DEFAULT_APPS_SCRIPT_URL.trim();
    }
    return null;
  },

  getDefaultWebhookUrl(): string {
    return DEFAULT_APPS_SCRIPT_URL || '';
  },

  isUsingDefaultWebhook(): boolean {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(WEBHOOK_KEY);
      if (!stored && DEFAULT_APPS_SCRIPT_URL) return true;
      if (stored && stored.trim() === DEFAULT_APPS_SCRIPT_URL.trim()) return true;
    }
    return Boolean(DEFAULT_APPS_SCRIPT_URL);
  },

  resetToDefaultWebhookUrl(): string | null {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(WEBHOOK_KEY);
    }
    return DEFAULT_APPS_SCRIPT_URL || null;
  },

  setSavedWebhookUrl(url: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(WEBHOOK_KEY, url.trim());
  },

  clearSavedWebhookUrl() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(WEBHOOK_KEY);
  },

  /**
   * Parses raw 2D rows from the "Kehadiran" sheet into AttendanceRecord[].
   * Any row deleted in Google Sheets will not be in `rows`, so it will be removed from the app!
   */
  parseAttendanceRows(
    rows: any[][],
    existingLocal: AttendanceRecord[] = [],
    existingEmployees: { employeeId: string }[] = []
  ): AttendanceRecord[] {
    if (!Array.isArray(rows)) return [];

    const localMap = new Map<string, AttendanceRecord>();
    existingLocal.forEach((r) => {
      if (r.sessionId) localMap.set(r.sessionId, r);
    });

    const validRows = rows.filter((row) => {
      if (!Array.isArray(row) || row.length === 0) return false;
      const col0 = String(row[0] ?? '').trim();
      const col1 = String(row[1] ?? '').trim();
      if (!col0 && !col1) return false;
      if (col0.toLowerCase() === 'session id' || col1.toLowerCase() === 'id staf') return false;
      if (col0 === SYS_SYNC_SESSION_ID || col1.toUpperCase() === 'SYSTEM') return false;
      return true;
    });

    return validRows.map((row, index) => {
      const sessionId = String(row[0] || `ATT-SHEET-${index}`).trim();
      const prev = localMap.get(sessionId);

      // Extract authentic timestamp from sessionId (ATT-<timestamp>) which is 100% immune to Google Sheets locale flips
      const sessionMatch = sessionId.match(/ATT-(\d{10,13})/);
      let sessionUtcDate: Date | null = null;
      let sessionDateKL = '';
      if (sessionMatch) {
        const ts = parseInt(sessionMatch[1], 10);
        if (!isNaN(ts) && ts > 1577836800000) {
          sessionUtcDate = new Date(ts);
          sessionDateKL = getMalaysiaDateDMY(sessionUtcDate);
        }
      }

      const employeeId = normalizeSheetEmployeeId(row[1] || prev?.employeeId || '', existingEmployees);
      const employeeName = String(row[2] || prev?.employeeName || '').trim();
      const department = String(row[3] || prev?.department || '').trim();
      const workDate = sessionDateKL || prev?.workDate || normalizeWorkDate(row[4]);
      const clockInTimeKL = formatSheetTime(row[5], workDate) || prev?.clockInTimeKL || `${workDate}, 08:30:00 AM`;

      const rawOut = String(row[6] ?? '').trim();
      const isStillOpen = !rawOut || rawOut === 'Belum Keluar' || rawOut === '-';
      const clockOutTimeKL = isStillOpen ? undefined : formatSheetTime(rawOut, workDate);

      // Check if this is the 20-column Google Sheet schema (row.length >= 18)
      const is20Col = row.length >= 18;

      if (is20Col) {
        const rawEntryType = String(row[7] ?? '').trim();
        const rawInRemarks = String(row[8] ?? '').trim();
        const rawExitType = String(row[9] ?? '').trim();
        const rawOutRemarks = String(row[10] ?? '').trim();
        const attendanceStatus = String(row[11] || (isStillOpen ? 'IN_PROGRESS' : 'COMPLETED')).trim();

        const rawHours = String(row[12] ?? '').replace(/jam/i, '').trim();
        const parsedHours = rawHours && rawHours !== '-' ? parseFloat(rawHours) : NaN;
        const computedDuration = isStillOpen ? null : computeDurationFromKLTimes(clockInTimeKL, clockOutTimeKL, workDate);
        const workedHours = computedDuration
          ? computedDuration.workedHours
          : (!isNaN(parsedHours) ? parsedHours : (isStillOpen ? null : (prev?.workedHours ?? null)));
        const workedMinutes = computedDuration
          ? computedDuration.workedMinutes
          : (workedHours != null ? Math.round(workedHours * 60) : (prev?.workedMinutes ?? null));

        const rawOutstation = String(row[13] ?? '').trim().toUpperCase();
        const isOutstation =
          rawOutstation === 'YA' ||
          rawOutstation === 'YES' ||
          rawOutstation === 'TRUE' ||
          attendanceStatus === 'OUTSTATION';
        const rawOutLoc = String(row[14] ?? '').trim();
        const outstationLocation = rawOutLoc && rawOutLoc !== '-' ? rawOutLoc : null;

        const parsedDist = parseInt(String(row[15] ?? '0'), 10);
        const clockInDistanceMeters = !isNaN(parsedDist) ? parsedDist : (prev?.clockInDistanceMeters ?? 0);

        const faceVerified = String(row[16] || prev?.faceVerified || 'YES').trim();
        const rawNotes = String(row[17] ?? '').trim();
        const exceptionNotes = !rawNotes || rawNotes === '-' ? null : rawNotes;
        const officeId = String(row[18] || prev?.officeId || 'OFF-01').trim();

        const parsedInDate = parseKLTimeStringToDate(clockInTimeKL, workDate);
        const parsedOutDate = isStillOpen ? null : parseKLTimeStringToDate(clockOutTimeKL, workDate);
        const effectiveInUtc = sessionUtcDate
          ? sessionUtcDate.toISOString()
          : (parsedInDate ? parsedInDate.toISOString() : (prev?.clockInTimeUTC || new Date().toISOString()));

        return {
          sessionId,
          employeeId,
          employeeName,
          department,
          officeId,
          workDate,
          clockInTimeUTC: effectiveInUtc,
          clockInTimeKL,
          clockOutTimeUTC: isStillOpen
            ? undefined
            : (parsedOutDate ? parsedOutDate.toISOString() : (prev?.clockOutTimeUTC || new Date().toISOString())),
          clockOutTimeKL,
          clockInLat: prev?.clockInLat ?? 5.6432,
          clockInLng: prev?.clockInLng ?? 100.4912,
          clockInAccuracy: prev?.clockInAccuracy ?? 10,
          clockInDistanceMeters,
          clockOutLat: isStillOpen ? null : (prev?.clockOutLat ?? null),
          clockOutLng: isStillOpen ? null : (prev?.clockOutLng ?? null),
          clockOutAccuracy: isStillOpen ? null : (prev?.clockOutAccuracy ?? null),
          clockOutDistanceMeters: isStillOpen ? null : (prev?.clockOutDistanceMeters ?? null),
          faceVerified,
          faceVerificationConfidence: prev?.faceVerificationConfidence || '0.96',
          workedMinutes,
          workedHours,
          attendanceStatus,
          exceptionNotes,
          entryType: rawEntryType && rawEntryType !== '-' ? rawEntryType : prev?.entryType,
          exitType: isStillOpen ? undefined : (rawExitType && rawExitType !== '-' ? rawExitType : prev?.exitType),
          clockInRemarks: rawInRemarks && rawInRemarks !== '-' ? rawInRemarks : (prev?.clockInRemarks || null),
          clockOutRemarks: isStillOpen ? null : (rawOutRemarks && rawOutRemarks !== '-' ? rawOutRemarks : (prev?.clockOutRemarks || null)),
          isOutstation,
          outstationLocation,
        };
      }

      // Fallback: 14-column schema
      const attendanceStatus = String(row[7] || (isStillOpen ? 'IN_PROGRESS' : 'COMPLETED')).trim();

      const rawHours = String(row[8] ?? '').replace(/jam/i, '').trim();
      const parsedHours = rawHours && rawHours !== '-' ? parseFloat(rawHours) : NaN;
      const computedDuration = isStillOpen ? null : computeDurationFromKLTimes(clockInTimeKL, clockOutTimeKL, workDate);
      const workedHours = computedDuration
        ? computedDuration.workedHours
        : (!isNaN(parsedHours) ? parsedHours : (isStillOpen ? null : (prev?.workedHours ?? null)));
      const workedMinutes = computedDuration
        ? computedDuration.workedMinutes
        : (workedHours != null ? Math.round(workedHours * 60) : (prev?.workedMinutes ?? null));

      const parsedDist = parseInt(String(row[9] ?? '0'), 10);
      const clockInDistanceMeters = !isNaN(parsedDist) ? parsedDist : (prev?.clockInDistanceMeters ?? 0);

      const faceVerified = String(row[10] || prev?.faceVerified || 'YES').trim();
      const rawNotes = String(row[11] ?? '').trim();
      const exceptionNotes = !rawNotes || rawNotes === '-' ? null : rawNotes;
      const officeId = String(row[12] || prev?.officeId || 'OFF-01').trim();

      const parsedMeta = parseExceptionMetadata(exceptionNotes);
      const isOutstation =
        attendanceStatus === 'OUTSTATION' ||
        parsedMeta.isOutstation ||
        Boolean(prev?.isOutstation);

      const parsedInDate = parseKLTimeStringToDate(clockInTimeKL, workDate);
      const parsedOutDate = isStillOpen ? null : parseKLTimeStringToDate(clockOutTimeKL, workDate);
      const effectiveInUtc = sessionUtcDate
        ? sessionUtcDate.toISOString()
        : (parsedInDate ? parsedInDate.toISOString() : (prev?.clockInTimeUTC || new Date().toISOString()));

      return {
        sessionId,
        employeeId,
        employeeName,
        department,
        officeId,
        workDate,
        clockInTimeUTC: effectiveInUtc,
        clockInTimeKL,
        clockOutTimeUTC: isStillOpen
          ? undefined
          : (parsedOutDate ? parsedOutDate.toISOString() : (prev?.clockOutTimeUTC || new Date().toISOString())),
        clockOutTimeKL,
        clockInLat: prev?.clockInLat ?? 5.6432,
        clockInLng: prev?.clockInLng ?? 100.4912,
        clockInAccuracy: prev?.clockInAccuracy ?? 10,
        clockInDistanceMeters,
        clockOutLat: isStillOpen ? null : (prev?.clockOutLat ?? null),
        clockOutLng: isStillOpen ? null : (prev?.clockOutLng ?? null),
        clockOutAccuracy: isStillOpen ? null : (prev?.clockOutAccuracy ?? null),
        clockOutDistanceMeters: isStillOpen ? null : (prev?.clockOutDistanceMeters ?? null),
        faceVerified,
        faceVerificationConfidence: prev?.faceVerificationConfidence || '0.96',
        workedMinutes,
        workedHours,
        attendanceStatus,
        exceptionNotes,
        entryType: parsedMeta.entryType || prev?.entryType,
        exitType: isStillOpen ? undefined : (parsedMeta.exitType || prev?.exitType),
        clockInRemarks: prev?.clockInRemarks || null,
        clockOutRemarks: isStillOpen ? null : (prev?.clockOutRemarks || null),
        isOutstation,
        outstationLocation: parsedMeta.outstationLocation || prev?.outstationLocation || null,
      };
    });
  },

  /**
   * Parses raw 2D rows from the "Kakitangan" sheet into User[].
   */
  parseEmployeeRows(
    rows: any[][],
    existingLocal: (User & { password?: string })[] = []
  ): (User & { password?: string })[] {
    if (!Array.isArray(rows)) return [];

    const localMap = new Map<string, User & { password?: string }>();
    existingLocal.forEach((e) => {
      if (e.employeeId) localMap.set(e.employeeId.toUpperCase(), e);
    });

    const validRows = rows.filter((row) => {
      if (!Array.isArray(row) || row.length === 0) return false;
      const col0 = String(row[0] ?? '').trim();
      const col1 = String(row[1] ?? '').trim();
      if (!col0 && !col1) return false;
      if (col0.toLowerCase() === 'id staf' || col0.toLowerCase() === 'employeeid') return false;
      return true;
    });

    return validRows.map((row) => {
      const employeeId = normalizeSheetEmployeeId(row[0], existingLocal);
      const prev =
        localMap.get(employeeId) ||
        existingLocal.find(
          (e) =>
            /^\d+$/.test(e.employeeId) &&
            /^\d+$/.test(employeeId) &&
            e.employeeId.replace(/^0+/, '') === employeeId.replace(/^0+/, '')
        );
      const name = String(row[1] || prev?.name || employeeId).trim();
      const email = String(row[2] || prev?.email || `${employeeId.toLowerCase()}@halagel.com`).trim();
      const department = String(row[3] || prev?.department || 'Pengeluaran & Operasi').trim();
      const assignedOfficeId = String(row[4] || prev?.assignedOfficeId || 'OFF-01').trim();
      const rawRole = String(row[5] || prev?.role || 'employee').trim().toLowerCase();
      const role = rawRole === 'admin' || rawRole === 'pentadbir' ? 'admin' : 'employee';
      const rawFace = String(row[6] ?? '').trim().toLowerCase();
      const faceEnrolled =
        rawFace === 'didaftar' ||
        rawFace === 'yes' ||
        rawFace === 'true' ||
        Boolean(prev?.faceEnrolled);
      const rawEnrolledAt = String(row[7] ?? '').trim();
      const faceEnrolledAt =
        rawEnrolledAt && rawEnrolledAt !== '-' ? rawEnrolledAt : (prev?.faceEnrolledAt || null);
      const sheetPassword = row[8] ? String(row[8]).trim() : '';
      const rawAttdId = row[9] != null ? String(row[9]).replace(/^'+/, '').trim() : '';
      const attdId = rawAttdId && rawAttdId !== '-' ? rawAttdId : (prev?.attdId || '');

      return {
        employeeId,
        attdId,
        name,
        email,
        department,
        assignedOfficeId,
        role,
        active: prev?.active ?? true,
        faceEnrolled,
        faceEnrolledAt,
        facePhotoUrl: prev?.facePhotoUrl || null,
        faceBiometricHash: prev?.faceBiometricHash || null,
        password: sheetPassword || prev?.password || (role === 'admin' ? 'admin123' : 'Password123!'),
      };
    });
  },

  /**
   * Parses raw 2D rows from the "Cawangan" sheet into Office[].
   */
  parseOfficeRows(rows: any[][], existingLocal: Office[] = []): Office[] {
    if (!Array.isArray(rows)) return [];

    const localMap = new Map<string, Office>();
    existingLocal.forEach((o) => {
      if (o.officeId) localMap.set(o.officeId.toUpperCase(), o);
    });

    const validRows = rows.filter((row) => {
      if (!Array.isArray(row) || row.length === 0) return false;
      const col0 = String(row[0] ?? '').trim();
      const col1 = String(row[1] ?? '').trim();
      if (!col0 && !col1) return false;
      if (col0.toLowerCase() === 'id cawangan' || col0.toLowerCase() === 'officeid') return false;
      return true;
    });

    return validRows.map((row, idx) => {
      const officeId = String(row[0] || `OFF-0${idx + 1}`).trim();
      const prev = localMap.get(officeId.toUpperCase());
      const name = String(row[1] || prev?.name || 'Cawangan Halagel').trim();
      const address = String(row[2] || prev?.address || '').trim();
      const lat = parseFloat(String(row[3] ?? ''));
      const lng = parseFloat(String(row[4] ?? ''));
      const rad = parseInt(String(row[5] ?? ''), 10);
      const rawActive = String(row[6] ?? 'Aktif').trim().toLowerCase();

      return {
        officeId,
        name,
        address,
        latitude: !isNaN(lat) ? lat : (prev?.latitude ?? 5.6432),
        longitude: !isNaN(lng) ? lng : (prev?.longitude ?? 100.4912),
        radiusMeters: !isNaN(rad) ? rad : (prev?.radiusMeters ?? 120),
        maxAccuracyMeters: prev?.maxAccuracyMeters ?? 50,
        maxAgeSeconds: prev?.maxAgeSeconds ?? 60,
        active: rawActive !== 'tidak aktif' && rawActive !== 'false',
      };
    });
  },

  /**
   * Pulls live data from a public Google Sheet via Google Visualization JSON endpoint
   * if a Spreadsheet ID is configured.
   */
  async fetchSheetTabViaGviz(spreadsheetId: string, sheetName: string): Promise<any[][] | null> {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&headers=1&t=${Date.now()}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const text = await res.text();
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) return null;
      const json = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
      if (!json.table || !Array.isArray(json.table.rows)) return null;

      return json.table.rows.map((r: any) =>
        (r.c || []).map((cell: any) => (cell ? (cell.f ?? cell.v ?? '') : ''))
      );
    } catch {
      return null;
    }
  },

  /**
   * Extracts embedded cross-device sync state (Cawangan & Kakitangan) stored in the
   * SYS-DB-SYNC row of "Kehadiran" so even V1 Apps Script endpoints sync 100% across devices.
   */
  extractCloudMetadata(
    rows: any[][],
    existingEmployees: (User & { password?: string })[] = []
  ): {
    found: boolean;
    employees?: (User & { password?: string })[];
    offices?: Office[];
    deletedSessionIds?: string[];
    ts?: number;
  } {
    if (!Array.isArray(rows)) return { found: false };

    // Scan ALL matching SYS-DB-SYNC rows and pick the one with the latest `ts` timestamp
    let bestParsed: any = null;
    let bestTs = -1;

    for (const r of rows) {
      if (!Array.isArray(r)) continue;
      const col0 = String(r[0] ?? '').trim();
      const col1 = String(r[1] ?? '').trim().toUpperCase();
      const isSyncRow = col0 === SYS_SYNC_SESSION_ID || col1 === 'SYSTEM';

      for (const c of r) {
        const s = String(c ?? '').trim();
        if (s.startsWith('{"v":2,') && s.endsWith('}')) {
          try {
            const candidate = JSON.parse(s);
            const candidateTs = typeof candidate.ts === 'number' ? candidate.ts : 0;
            if (isSyncRow || candidate.v === 2) {
              if (candidateTs >= bestTs) {
                bestTs = candidateTs;
                bestParsed = candidate;
              }
            }
          } catch {
            // ignore malformed JSON cell
          }
        }
      }
    }

    if (!bestParsed) return { found: false };

    try {
      const parsed = bestParsed;
      let employees: (User & { password?: string })[] | undefined = undefined;
      let offices: Office[] | undefined = undefined;

      if (Array.isArray(parsed.employees) && parsed.employees.length > 0) {
        employees = parsed.employees.map((e: any) => {
          const cleanId = normalizeSheetEmployeeId(e.employeeId, existingEmployees);
          const localMatch = existingEmployees.find(
            (loc) => loc.employeeId.toUpperCase() === cleanId
          );
          const cleanAttdId = e.attdId != null
            ? String(e.attdId).replace(/^'+/, '').trim()
            : (localMatch?.attdId || '');
          return {
            employeeId: cleanId,
            attdId: cleanAttdId,
            name: String(e.name || cleanId).trim(),
            email: String(e.email || `${cleanId.toLowerCase()}@halagel.com`).trim(),
            department: String(e.department || 'Pengeluaran & Operasi').trim(),
            assignedOfficeId: String(e.assignedOfficeId || 'OFF-01').trim(),
            role: e.role === 'admin' ? 'admin' : 'employee',
            active: e.active ?? true,
            faceEnrolled: Boolean(e.faceEnrolled ?? localMatch?.faceEnrolled),
            faceEnrolledAt: e.faceEnrolledAt || localMatch?.faceEnrolledAt || null,
            facePhotoUrl: localMatch?.facePhotoUrl || null,
            faceBiometricHash: e.faceBiometricHash || localMatch?.faceBiometricHash || null,
            password:
              e.password ||
              localMatch?.password ||
              (e.role === 'admin' ? 'admin123' : 'Password123!'),
          };
        });
      }

      if (Array.isArray(parsed.offices) && parsed.offices.length > 0) {
        offices = parsed.offices.map((o: any, idx: number) => ({
          officeId: String(o.officeId || `OFF-0${idx + 1}`).trim(),
          name: String(o.name || 'Cawangan Halagel').trim(),
          address: String(o.address || '').trim(),
          latitude: typeof o.latitude === 'number' ? o.latitude : parseFloat(String(o.latitude)) || 5.6432,
          longitude: typeof o.longitude === 'number' ? o.longitude : parseFloat(String(o.longitude)) || 100.4912,
          radiusMeters: typeof o.radiusMeters === 'number' ? o.radiusMeters : parseInt(String(o.radiusMeters), 10) || 120,
          maxAccuracyMeters: o.maxAccuracyMeters ?? 50,
          maxAgeSeconds: o.maxAgeSeconds ?? 60,
          active: o.active ?? true,
        }));
      }

      const deletedSessionIds = Array.isArray(parsed.deletedSessionIds)
        ? parsed.deletedSessionIds.map((id: any) => String(id))
        : undefined;

      return { found: true, employees, offices, deletedSessionIds, ts: bestTs };
    } catch {
      return { found: false };
    }
  },

  /**
   * Pulls the latest data from Google Sheets (via Google Apps Script Web App doGet and/or GViz).
   * Ensures any rows deleted in Google Sheets are also deleted in the app!
   */
  async pullFromDatabase(
    existingRecords: AttendanceRecord[],
    existingEmployees: (User & { password?: string })[],
    existingOffices: Office[]
  ): Promise<PullSyncResult> {
    const webhookUrl = this.getSavedWebhookUrl();
    const savedSheetId = this.getSavedSpreadsheetId();

    let recordsResult: AttendanceRecord[] | null = null;
    let employeesResult: (User & { password?: string })[] | undefined = undefined;
    let officesResult: Office[] | undefined = undefined;
    let spreadsheetInfo: SpreadsheetInfo | undefined = undefined;
    let hasCloudMeta = false;
    let deletedSessionIds: Set<string> = new Set();

    // 1. Pull from Google Apps Script Web App URL (doGet)
    if (webhookUrl) {
      try {
        const sep = webhookUrl.includes('?') ? '&' : '?';
        const res = await fetch(`${webhookUrl}${sep}action=GET_ALL&t=${Date.now()}`, {
          method: 'GET',
          redirect: 'follow',
        });

        if (res.ok) {
          const payload = await res.json();
          if (payload && payload.status === 'ok') {
            const rawAtt = Array.isArray(payload.records)
              ? payload.records
              : Array.isArray(payload.data)
              ? payload.data
              : [];

            // Extract embedded SYS-DB-SYNC metadata if present in Kehadiran rows
            const cloudMeta = this.extractCloudMetadata(rawAtt, existingEmployees);
            if (cloudMeta.found) {
              hasCloudMeta = true;
              if (cloudMeta.employees && cloudMeta.employees.length > 0) {
                employeesResult = cloudMeta.employees;
              }
              if (cloudMeta.offices && cloudMeta.offices.length > 0) {
                officesResult = cloudMeta.offices;
              }
              if (cloudMeta.deletedSessionIds) {
                cloudMeta.deletedSessionIds.forEach((id) => deletedSessionIds.add(id));
              }
            }

            const effectiveEmps = employeesResult || existingEmployees;
            recordsResult = this.parseAttendanceRows(rawAtt, existingRecords, effectiveEmps);

            // Only use payload.employees / payload.offices from Kakitangan/Cawangan tabs if:
            // 1) SYS-DB-SYNC wasn't found, OR
            // 2) The Kakitangan/Cawangan tab in Google Sheets was directly edited by a user in Google Sheets
            if (Array.isArray(payload.employees) && payload.employees.length > 0) {
              const rawEmpSnap = JSON.stringify(payload.employees);
              const prevEmpSnap = typeof window !== 'undefined' ? localStorage.getItem('halagel_raw_sheet_emp_v2') : null;
              if (typeof window !== 'undefined') {
                localStorage.setItem('halagel_raw_sheet_emp_v2', rawEmpSnap);
              }
              const parsedEmps = this.parseEmployeeRows(payload.employees, effectiveEmps);
              if (parsedEmps.length > 0) {
                if (!hasCloudMeta || (prevEmpSnap !== null && prevEmpSnap !== rawEmpSnap)) {
                  employeesResult = parsedEmps;
                }
              }
            }

            if (Array.isArray(payload.offices) && payload.offices.length > 0) {
              const rawOffSnap = JSON.stringify(payload.offices);
              const prevOffSnap = typeof window !== 'undefined' ? localStorage.getItem('halagel_raw_sheet_off_v2') : null;
              if (typeof window !== 'undefined') {
                localStorage.setItem('halagel_raw_sheet_off_v2', rawOffSnap);
              }
              const parsedOffs = this.parseOfficeRows(payload.offices, officesResult || existingOffices);
              if (parsedOffs.length > 0) {
                if (!hasCloudMeta || (prevOffSnap !== null && prevOffSnap !== rawOffSnap)) {
                  officesResult = parsedOffs;
                }
              }
            }

            if (payload.spreadsheetId) {
              spreadsheetInfo = {
                spreadsheetId: payload.spreadsheetId,
                title: payload.spreadsheetName || 'Halagel Google Sheet Database',
                spreadsheetUrl:
                  payload.spreadsheetUrl ||
                  `https://docs.google.com/spreadsheets/d/${payload.spreadsheetId}/edit`,
              };
              this.setSavedSpreadsheetId(payload.spreadsheetId);
              this.setSavedSpreadsheetInfo(spreadsheetInfo);
            }
          }
        }
      } catch (err) {
        console.warn('Tidak dapat membaca doGet daripada Google Apps Script:', err);
      }
    }

    // 2. If a Spreadsheet ID is available, also check GViz for tabs not returned by V1 Apps Script
    const activeSheetId = spreadsheetInfo?.spreadsheetId || savedSheetId;
    if (activeSheetId) {
      try {
        const [gvizAtt, gvizEmp, gvizOff] = await Promise.all([
          recordsResult === null ? this.fetchSheetTabViaGviz(activeSheetId, 'Kehadiran') : Promise.resolve(null),
          !employeesResult ? this.fetchSheetTabViaGviz(activeSheetId, 'Kakitangan') : Promise.resolve(null),
          !officesResult ? this.fetchSheetTabViaGviz(activeSheetId, 'Cawangan') : Promise.resolve(null),
        ]);

        if (recordsResult === null && gvizAtt !== null) {
          const cloudMeta = this.extractCloudMetadata(gvizAtt, existingEmployees);
          if (cloudMeta.found) {
            hasCloudMeta = true;
            if (cloudMeta.employees) employeesResult = cloudMeta.employees;
            if (cloudMeta.offices) officesResult = cloudMeta.offices;
            if (cloudMeta.deletedSessionIds) {
              cloudMeta.deletedSessionIds.forEach((id) => deletedSessionIds.add(id));
            }
          }
          recordsResult = this.parseAttendanceRows(
            gvizAtt,
            existingRecords,
            employeesResult || existingEmployees
          );
        }
        if (!employeesResult && gvizEmp !== null && gvizEmp.length > 0) {
          const parsedEmps = this.parseEmployeeRows(gvizEmp, existingEmployees);
          if (parsedEmps.length > 0) {
            employeesResult = parsedEmps;
          }
        }
        if (!officesResult && gvizOff !== null && gvizOff.length > 0) {
          const parsedOffs = this.parseOfficeRows(gvizOff, existingOffices);
          if (parsedOffs.length > 0) {
            officesResult = parsedOffs;
          }
        }
      } catch {
        // Ignore GViz errors if sheet is private
      }
    }

    if (recordsResult !== null) {
      // Filter out any sessions deleted by admin
      if (deletedSessionIds.size > 0) {
        recordsResult = recordsResult.filter((r) => !deletedSessionIds.has(r.sessionId));
      }

      // Ensure any staff member who has an active attendance record in Google Sheets
      // is also registered in the employees list across all devices if SYS-DB-SYNC wasn't created yet
      if (!hasCloudMeta && recordsResult.length > 0) {
        const baseEmps = [...(employeesResult || existingEmployees)];
        let addedFromAtt = false;
        recordsResult.forEach((r) => {
          if (!r.employeeId || r.employeeId === 'SYSTEM') return;
          const exists = baseEmps.some(
            (e) =>
              e.employeeId.toUpperCase() === r.employeeId.toUpperCase() ||
              (/^\d+$/.test(e.employeeId) &&
                /^\d+$/.test(r.employeeId) &&
                e.employeeId.replace(/^0+/, '') === r.employeeId.replace(/^0+/, ''))
          );
          if (!exists) {
            baseEmps.push({
              employeeId: r.employeeId,
              name: r.employeeName || r.employeeId,
              email: `${r.employeeId.toLowerCase()}@halagel.com`,
              department: r.department || 'Pengeluaran & Operasi',
              assignedOfficeId: r.officeId || 'OFF-01',
              role: 'employee',
              active: true,
              faceEnrolled: r.faceVerified === 'YES',
              faceEnrolledAt: r.clockInTimeUTC || new Date().toISOString(),
              password: 'Password123!',
            });
            addedFromAtt = true;
          }
        });
        if (addedFromAtt) {
          employeesResult = baseEmps;
        }
      }

      return {
        synced: true,
        records: recordsResult,
        employees: employeesResult,
        offices: officesResult,
        spreadsheetInfo,
        hasCloudMeta,
      };
    }

    return {
      synced: false,
      records: existingRecords,
    };
  },

  /**
   * Sends POST request to Google Apps Script using text/plain to avoid CORS preflight
   * while waiting for completion so Google Sheets updates immediately.
   */
  async postToAppsScript(webhookUrl: string, payload: Record<string, any>): Promise<void> {
    const bodyStr = JSON.stringify(payload);
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: bodyStr,
      });
    } catch {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: bodyStr,
      });
    }
  },

  async saveViaWebhook(webhookUrl: string, record: AttendanceRecord) {
    const safeRecord = {
      ...record,
      employeeId: formatEmployeeIdForSheet(record.employeeId),
      workDate: formatTextForSheet(record.workDate),
      clockInTimeKL: formatTextForSheet(record.clockInTimeKL),
      clockOutTimeKL: record.clockOutTimeKL ? formatTextForSheet(record.clockOutTimeKL) : undefined,
    };
    await this.postToAppsScript(webhookUrl, { action: 'SAVE_ATTENDANCE', record: safeRecord });
  },

  async syncViaWebhook(
    webhookUrl: string,
    records: AttendanceRecord[],
    employees: (User & { password?: string })[],
    offices: Office[],
    deletedSessionIds: string[] = []
  ) {
    const safeRecords = records
      .filter((r) => r.sessionId !== SYS_SYNC_SESSION_ID)
      .map((r) => ({
        ...r,
        employeeId: formatEmployeeIdForSheet(r.employeeId),
        workDate: formatTextForSheet(r.workDate),
        clockInTimeKL: formatTextForSheet(r.clockInTimeKL),
        clockOutTimeKL: r.clockOutTimeKL ? formatTextForSheet(r.clockOutTimeKL) : undefined,
      }));

    // Strip large base64 photos so Google Sheets cell stays well below the 50,000-character limit
    const compactEmployees = employees.map((e) => ({
      employeeId: String(e.employeeId ?? '').replace(/^'+/, '').trim().toUpperCase(),
      attdId: e.attdId ? String(e.attdId).replace(/^'+/, '').trim() : '',
      name: e.name,
      email: e.email,
      department: e.department,
      assignedOfficeId: e.assignedOfficeId,
      role: e.role,
      active: e.active ?? true,
      faceEnrolled: Boolean(e.faceEnrolled),
      faceEnrolledAt: e.faceEnrolledAt || null,
      faceBiometricHash: e.faceBiometricHash || null,
      password: e.password || (e.role === 'admin' ? 'admin123' : 'Password123!'),
    }));

    const safeEmployees = compactEmployees.map((e) => ({
      ...e,
      employeeId: formatEmployeeIdForSheet(e.employeeId),
      attdId: e.attdId ? formatEmployeeIdForSheet(e.attdId) : '',
    }));

    const metaJson = JSON.stringify({
      v: 2,
      employees: compactEmployees,
      offices,
      deletedSessionIds: deletedSessionIds.slice(-100),
      ts: Date.now(),
    });

    const todayStr = new Date().toISOString().slice(0, 10);
    const sysSyncRecord: AttendanceRecord = {
      sessionId: SYS_SYNC_SESSION_ID,
      employeeId: 'SYSTEM',
      employeeName: '[AUTO-SYNC] Pangkalan Data Cawangan & Kakitangan',
      department: metaJson,
      officeId: 'OFF-01',
      workDate: todayStr,
      clockInTimeUTC: new Date().toISOString(),
      clockInTimeKL: '-',
      clockOutTimeKL: '-',
      clockInLat: 5.6432,
      clockInLng: 100.4912,
      clockInAccuracy: 0,
      clockInDistanceMeters: 0,
      faceVerified: 'YES',
      attendanceStatus: 'SYSTEM_SYNC',
      entryType: 'SYNC_METADATA',
      clockInRemarks: metaJson,
      exitType: '-',
      clockOutRemarks: '-',
      isOutstation: false,
      outstationLocation: '-',
      exceptionNotes: metaJson,
    };

    // 1. Update SYS-DB-SYNC row via SAVE_ATTENDANCE (works on both V1 and V2 Apps Script deployments!)
    await this.postToAppsScript(webhookUrl, {
      action: 'SAVE_ATTENDANCE',
      record: sysSyncRecord,
    });

    // 2. Also send SYNC_ALL with sysSyncRecord FIRST so Kehadiran, Kakitangan, and Cawangan stay in sync
    await this.postToAppsScript(webhookUrl, {
      action: 'SYNC_ALL',
      records: [sysSyncRecord, ...safeRecords],
      employees: safeEmployees,
      offices,
    });
  },

  async testWebhook(webhookUrl: string): Promise<{ success: boolean; message: string; recordCount?: number }> {
    try {
      const sep = webhookUrl.includes('?') ? '&' : '?';
      const getRes = await fetch(`${webhookUrl}${sep}action=GET_ALL&t=${Date.now()}`, {
        method: 'GET',
        redirect: 'follow',
      });

      if (getRes.ok) {
        const data = await getRes.json().catch(() => null);
        if (data && data.status === 'ok') {
          const rows = Array.isArray(data.records) ? data.records : Array.isArray(data.data) ? data.data : [];
          const valid = this.parseAttendanceRows(rows);
          return {
            success: true,
            recordCount: valid.length,
            message: `Sambungan Google Sheets Aktif (Dua Hala)! Dikesan ${valid.length} rekod kehadiran semasa di dalam Google Sheet.`,
          };
        }
      }

      await this.postToAppsScript(webhookUrl, { action: 'PING', timestamp: new Date().toISOString() });
      return {
        success: true,
        message: 'Sambungan Webhook Google Apps Script berjaya dihubungi! Pangkalan data Google Sheets sedia digunakan.',
      };
    } catch (err: any) {
      return {
        success: false,
        message:
          err.message ||
          'Gagal menghubungi Google Apps Script. Sila pastikan URL adalah sah dan di-deploy dengan akses "Anyone".',
      };
    }
  },
};
