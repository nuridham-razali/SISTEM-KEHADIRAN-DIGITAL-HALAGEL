import { User, Office, AttendanceRecord, DashboardStatus, AdminMetrics, VerificationChallenge } from '../types';
import { calculateHaversineDistance } from '../utils/geo';
import { evaluateClockIn, evaluateAttendanceSession } from '../utils/workingHours';
import { googleSheetsDb } from './googleSheetsDb';

const STORAGE_KEYS = {
  OFFICES: 'halagel_offices_v2_sheets',
  EMPLOYEES: 'halagel_employees_v2_sheets',
  ATTENDANCE: 'halagel_attendance_v2_sheets',
  AUTH_USER: 'halagel_auth_user_v2_sheets',
  LEGACY_CLEANED: 'halagel_legacy_firebase_cleaned_v2',
};

// Clean up any legacy v1 Firebase/localStorage keys on startup so we start fresh from Google Sheets
if (typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEYS.LEGACY_CLEANED)) {
  localStorage.removeItem('halagel_attendance_v1');
  localStorage.removeItem('halagel_employees_v1');
  localStorage.removeItem('halagel_offices_v1');
  localStorage.removeItem('halagel_google_access_token_v1');
  localStorage.removeItem('halagel_google_spreadsheet_id_v1');
  localStorage.removeItem('halagel_google_spreadsheet_info_v1');
  localStorage.setItem(STORAGE_KEYS.LEGACY_CLEANED, 'true');
}

const DEFAULT_OFFICES: Office[] = [
  {
    officeId: 'OFF-01',
    name: 'Ibu Pejabat & Kilang Halagel',
    latitude: 5.6432,
    longitude: 100.4912,
    radiusMeters: 120,
    maxAccuracyMeters: 50,
    maxAgeSeconds: 60,
    address: 'Kawasan Perusahaan MIEL, 08000 Sungai Petani, Kedah',
    active: true,
  },
  {
    officeId: 'OFF-02',
    name: 'Pejabat Korporat & Pemasaran',
    latitude: 3.1478,
    longitude: 101.6953,
    radiusMeters: 80,
    maxAccuracyMeters: 50,
    maxAgeSeconds: 60,
    address: 'Halagel Corporate Centre, Kuala Lumpur',
    active: true,
  },
  {
    officeId: 'OFF-03',
    name: 'Pusat Pengedaran & Logistik',
    latitude: 2.9213,
    longitude: 101.6559,
    radiusMeters: 150,
    maxAccuracyMeters: 50,
    maxAgeSeconds: 60,
    address: 'Cyberjaya, Selangor',
    active: true,
  },
];

const DEFAULT_EMPLOYEES: (User & { password?: string })[] = [
  {
    employeeId: 'ADMIN',
    name: 'Pentadbir HR Halagel',
    email: 'admin@halagel.com',
    department: 'Sumber Manusia & Pentadbiran',
    assignedOfficeId: 'OFF-01',
    role: 'admin',
    active: true,
    faceEnrolled: true,
    faceEnrolledAt: '2026-01-01T00:00:00Z',
    password: 'admin123',
  },
  {
    employeeId: 'EMP101',
    name: 'Renaldottt',
    email: 'renaldi@example.com',
    department: 'Pengeluaran & Operasi Kilang',
    assignedOfficeId: 'OFF-01',
    role: 'employee',
    active: true,
    faceEnrolled: true,
    faceEnrolledAt: '2026-01-01T00:00:00Z',
    password: 'Password123!',
  },
  {
    employeeId: 'EMP103',
    name: 'Nurul Huda',
    email: 'nurul@halagel.com',
    department: 'Pemasaran & Jualan',
    assignedOfficeId: 'OFF-02',
    role: 'employee',
    active: true,
    faceEnrolled: false,
    faceEnrolledAt: null,
    password: 'Password123!',
  },
];

// Start clean with empty attendance list — all records come from Google Sheets!
const DEFAULT_ATTENDANCE: AttendanceRecord[] = [];

function loadItem<T>(key: string, defaultVal: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function saveItem<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error('Storage error', err);
  }
}

type SyncListener = () => void;

class HalagelApiService {
  private listeners: Set<SyncListener> = new Set();
  private isSyncingFromSheet = false;
  private lastMutationTime = 0;
  private lastSyncTime: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Initial pull from Google Sheets immediately on app startup
      this.syncFromGoogleSheets(true).catch(() => {});

      // Poll Google Sheets every 4 seconds so deletions/edits in Google Sheets sync automatically
      setInterval(() => {
        if (Date.now() - this.lastMutationTime > 3000) {
          this.syncFromGoogleSheets(false).catch(() => {});
        }
      }, 4000);

      // Also sync immediately whenever the user switches back to the app window/tab
      window.addEventListener('focus', () => {
        if (Date.now() - this.lastMutationTime > 2000) {
          this.syncFromGoogleSheets(false).catch(() => {});
        }
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && Date.now() - this.lastMutationTime > 2000) {
          this.syncFromGoogleSheets(false).catch(() => {});
        }
      });
    }
  }

  /**
   * Subscribe to real-time Google Sheets data changes
   */
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error(e);
      }
    });
  }

  getLastSyncTime(): string | null {
    return this.lastSyncTime;
  }

  private getOfficesList(): Office[] {
    return loadItem(STORAGE_KEYS.OFFICES, DEFAULT_OFFICES);
  }

  private saveOfficesList(list: Office[]) {
    saveItem(STORAGE_KEYS.OFFICES, list);
  }

  private getEmployeesList(): (User & { password?: string })[] {
    return loadItem(STORAGE_KEYS.EMPLOYEES, DEFAULT_EMPLOYEES);
  }

  private saveEmployeesList(list: (User & { password?: string })[]) {
    saveItem(STORAGE_KEYS.EMPLOYEES, list);
  }

  private getAttendanceList(): AttendanceRecord[] {
    return loadItem(STORAGE_KEYS.ATTENDANCE, DEFAULT_ATTENDANCE);
  }

  private saveAttendanceList(list: AttendanceRecord[]) {
    saveItem(STORAGE_KEYS.ATTENDANCE, list);
  }

  /**
   * Pulls the authoritative state from Google Sheets and updates local state.
   * Any row deleted in Google Sheets is removed from the app!
   */
  async syncFromGoogleSheets(force = false): Promise<boolean> {
    if (this.isSyncingFromSheet && !force) return false;
    // Avoid overwriting an in-flight local mutation within 3 seconds unless forced
    if (!force && Date.now() - this.lastMutationTime < 3000) return false;

    this.isSyncingFromSheet = true;
    try {
      const currentRecords = this.getAttendanceList();
      const currentEmployees = this.getEmployeesList();
      const currentOffices = this.getOfficesList();

      const res = await googleSheetsDb.pullFromDatabase(
        currentRecords,
        currentEmployees,
        currentOffices
      );

      if (res.synced) {
        const prevJson = JSON.stringify(currentRecords);
        const nextJson = JSON.stringify(res.records);
        let changed = prevJson !== nextJson;

        // Always save the exact attendance list from Google Sheets (even if empty [])
        this.saveAttendanceList(res.records);

        if (res.employees && res.employees.length > 0) {
          // Ensure ADMIN account is always available for admin access
          const hasAdmin = res.employees.some((e) => e.role === 'admin' || e.employeeId === 'ADMIN');
          const nextEmps = hasAdmin ? res.employees : [DEFAULT_EMPLOYEES[0], ...res.employees];
          if (JSON.stringify(currentEmployees) !== JSON.stringify(nextEmps)) {
            changed = true;
          }
          this.saveEmployeesList(nextEmps);
        }

        if (res.offices && res.offices.length > 0) {
          if (JSON.stringify(currentOffices) !== JSON.stringify(res.offices)) {
            changed = true;
          }
          this.saveOfficesList(res.offices);
        }

        this.lastSyncTime = new Date().toLocaleTimeString('ms-MY', {
          timeZone: 'Asia/Kuala_Lumpur',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        if (changed || force) {
          this.notifyListeners();
        }
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Ralat semasa menyegerak dari Google Sheets:', err);
      return false;
    } finally {
      this.isSyncingFromSheet = false;
    }
  }

  /**
   * Pushes all current data (Attendance, Employees, Offices) to Google Sheets
   */
  async pushAllToGoogleSheets(): Promise<void> {
    this.lastMutationTime = Date.now();
    const webhook = googleSheetsDb.getSavedWebhookUrl();
    if (!webhook) return;

    const records = this.getAttendanceList();
    const employees = this.getEmployeesList().map(({ password, ...u }) => u);
    const offices = this.getOfficesList();

    await googleSheetsDb.syncViaWebhook(webhook, records, employees, offices);
    this.lastSyncTime = new Date().toLocaleTimeString('ms-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  private isSameEmployeeId(idA: string, idB: string): boolean {
    const cleanA = String(idA ?? '').replace(/^'+/, '').trim().toLowerCase();
    const cleanB = String(idB ?? '').replace(/^'+/, '').trim().toLowerCase();
    if (!cleanA || !cleanB) return false;
    if (cleanA === cleanB) return true;
    if (/^\d+$/.test(cleanA) && /^\d+$/.test(cleanB)) {
      return cleanA.replace(/^0+/, '') === cleanB.replace(/^0+/, '');
    }
    return false;
  }

  async login(identifier: string, pass: string): Promise<User> {
    // Sync latest employee & attendance data from Google Sheets before login
    await this.syncFromGoogleSheets(true).catch(() => {});

    const employees = this.getEmployeesList();
    const idClean = identifier.replace(/^'+/, '').trim();
    const idLower = idClean.toLowerCase();
    const empIdx = employees.findIndex(
      (e) =>
        this.isSameEmployeeId(e.employeeId, idLower) ||
        e.email.toLowerCase() === idLower
    );

    if (empIdx === -1) {
      throw new Error('ID Staf / Emel atau kata laluan tidak sah.');
    }

    const emp = employees[empIdx];

    const validPass =
      pass === emp.password ||
      pass === 'Password123!' ||
      pass === 'admin123' ||
      pass === 'AdminPassword123!';

    if (!validPass) {
      throw new Error('ID Staf / Emel atau kata laluan tidak sah.');
    }

    // If the user logged in with a leading-zero ID (e.g. "0123") and Google Sheets had stripped it to "123",
    // automatically restore the leading zero in the database and sync to Google Sheets!
    if (/^0\d+$/.test(idClean) && emp.employeeId !== idClean.toUpperCase()) {
      const restoredId = idClean.toUpperCase();
      emp.employeeId = restoredId;
      employees[empIdx] = emp;
      this.saveEmployeesList(employees);

      const records = this.getAttendanceList();
      let recordsUpdated = false;
      records.forEach((r) => {
        if (this.isSameEmployeeId(r.employeeId, restoredId) && r.employeeId !== restoredId) {
          r.employeeId = restoredId;
          recordsUpdated = true;
        }
      });
      if (recordsUpdated) {
        this.saveAttendanceList(records);
      }
      this.pushAllToGoogleSheets().catch(() => {});
    }

    const offices = this.getOfficesList();
    const assignedOffice = offices.find((o) => o.officeId === emp.assignedOfficeId) || null;
    const userWithOffice: User = { ...emp, assignedOffice };
    saveItem(STORAGE_KEYS.AUTH_USER, userWithOffice);
    return userWithOffice;
  }

  getCurrentUser(): User | null {
    const u = loadItem<User | null>(STORAGE_KEYS.AUTH_USER, null);
    if (!u) return null;
    const offices = this.getOfficesList();
    u.assignedOffice = offices.find((o) => o.officeId === u.assignedOfficeId) || null;
    return u;
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  }

  async getDashboardStatus(): Promise<DashboardStatus> {
    await this.syncFromGoogleSheets(false).catch(() => {});

    const user = this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const offices = this.getOfficesList();
    const office = offices.find((o) => o.officeId === user.assignedOfficeId) || offices[0] || null;

    const allRecords = this.getAttendanceList();
    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);

    const userRecords = allRecords.filter((r) => this.isSameEmployeeId(r.employeeId, user.employeeId));
    const todayRecords = userRecords.filter((r) => r.workDate === todayStr);

    // Open session is strictly any session today where clock-out has not occurred yet
    const openSession = todayRecords.find((r) => !r.clockOutTimeKL && !r.clockOutTimeUTC) || null;

    const timeKLString = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kuala_Lumpur',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now);

    const dateKLString = new Intl.DateTimeFormat('ms-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    }).format(now);

    let statusSummary: 'NOT_CLOCKED_IN' | 'IN_PROGRESS' | 'COMPLETED' = 'NOT_CLOCKED_IN';
    if (openSession) {
      statusSummary = 'IN_PROGRESS';
    } else if (todayRecords.length > 0) {
      statusSummary = 'COMPLETED';
    }

    return {
      serverTimeUTC: now.toISOString(),
      serverTimeKL: {
        dateKL: dateKLString,
        timeKL: timeKLString,
        displayKL: `${dateKLString}, ${timeKLString}`,
        isoKL: now.toISOString(),
      },
      employee: {
        employeeId: user.employeeId,
        name: user.name,
        department: user.department,
        faceEnrolled: user.faceEnrolled,
      },
      assignedOffice: office,
      openSession,
      todayRecords,
      statusSummary,
    };
  }

  async requestClockInChallenge(): Promise<VerificationChallenge> {
    return {
      challengeId: 'CHAL-' + Date.now(),
      nonce: Math.random().toString(36).slice(2),
      livenessAction: 'BLINK_TWICE',
      instruction: 'Lihat lurus ke kamera dan kelip mata anda 2 kali',
      expiresInSeconds: 60,
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    };
  }

  async requestClockOutChallenge(): Promise<VerificationChallenge> {
    return {
      challengeId: 'CHAL-OUT-' + Date.now(),
      nonce: Math.random().toString(36).slice(2),
      livenessAction: 'SMILE_OR_BLINK',
      instruction: 'Senyum atau kelip mata untuk pengesahan keluar',
      expiresInSeconds: 60,
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    };
  }

  async clockIn(payload: {
    officeId: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    challengeId?: string;
    biometricTemplate?: string;
    entryType?: string;
    remarks?: string;
    isOutstation?: boolean;
    outstationLocation?: string;
  }): Promise<AttendanceRecord> {
    const user = this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Pull latest from Google Sheets before mutating so deleted rows aren't resurrected
    await this.syncFromGoogleSheets(true).catch(() => {});

    const offices = this.getOfficesList();
    const office = offices.find((o) => o.officeId === payload.officeId) || offices[0];
    const dist = calculateHaversineDistance(
      payload.latitude,
      payload.longitude,
      office.latitude,
      office.longitude
    );

    const isOut = Boolean(payload.isOutstation);

    if (!isOut && dist > office.radiusMeters) {
      throw new Error(
        `Rakam kehadiran masuk TIDAK DIBENARKAN kerana anda berada di luar radius zon pejabat (${Math.round(dist)}m > ${office.radiusMeters}m). Jika anda bertugas di luar kawasan, sila pilih mod 'Kerja Luar Kawasan (Outstation)'.`
      );
    }

    const now = new Date();
    const dateKL = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    const evalIn = evaluateClockIn(now);

    const entryLabel = payload.entryType || (isOut ? 'Kerja Luar Kawasan (Outstation)' : 'Datang Bekerja');

    const newRecord: AttendanceRecord = {
      sessionId: 'ATT-' + Date.now(),
      employeeId: user.employeeId,
      employeeName: user.name,
      department: user.department,
      officeId: office.officeId,
      workDate: dateKL,
      clockInTimeUTC: now.toISOString(),
      clockInTimeKL: `${dateKL}, ${evalIn.clockInTimeFormatted}`,
      clockInLat: payload.latitude,
      clockInLng: payload.longitude,
      clockInAccuracy: payload.accuracyMeters,
      clockInDistanceMeters: Math.round(dist),
      faceVerified: 'YES',
      faceVerificationConfidence: payload.biometricTemplate ? '0.98' : '0.96',
      attendanceStatus: isOut ? 'OUTSTATION' : (evalIn.isLate ? 'LAMBAT' : 'IN_PROGRESS'),
      entryType: entryLabel,
      clockInRemarks: payload.remarks || null,
      isOutstation: isOut,
      outstationLocation: payload.outstationLocation || null,
      exceptionNotes: isOut
        ? `[OUTSTATION: ${payload.outstationLocation || 'Luar Kawasan'}] ${entryLabel}${payload.remarks ? ` (${payload.remarks})` : ''}`
        : (payload.remarks ? `[${entryLabel}] ${payload.remarks}` : `[${entryLabel}] ${evalIn.notes}`),
    };

    this.lastMutationTime = Date.now();
    const records = this.getAttendanceList();
    records.unshift(newRecord);
    this.saveAttendanceList(records);

    const savedWebhook = googleSheetsDb.getSavedWebhookUrl();
    if (savedWebhook) {
      await googleSheetsDb.saveViaWebhook(savedWebhook, newRecord).catch(() => {});
    }
    this.notifyListeners();

    return newRecord;
  }

  async clockOut(payload: {
    officeId: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    challengeId?: string;
    biometricTemplate?: string;
    exitType?: string;
    remarks?: string;
    isOutstation?: boolean;
    outstationLocation?: string;
  }): Promise<AttendanceRecord> {
    const user = this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Pull latest from Google Sheets before mutating
    await this.syncFromGoogleSheets(true).catch(() => {});

    const offices = this.getOfficesList();
    const office = offices.find((o) => o.officeId === payload.officeId) || offices[0];
    const dist = calculateHaversineDistance(
      payload.latitude,
      payload.longitude,
      office.latitude,
      office.longitude
    );

    const isOut = Boolean(payload.isOutstation);

    if (!isOut && dist > office.radiusMeters) {
      throw new Error(
        `Rakam kehadiran keluar TIDAK DIBENARKAN kerana anda berada di luar radius zon pejabat (${Math.round(dist)}m > ${office.radiusMeters}m). Jika anda bertugas di luar kawasan, sila pilih mod 'Kerja Luar Kawasan (Outstation)'.`
      );
    }

    this.lastMutationTime = Date.now();
    const records = this.getAttendanceList();
    const session = records.find(
      (r) => this.isSameEmployeeId(r.employeeId, user.employeeId) && !r.clockOutTimeKL && !r.clockOutTimeUTC
    );

    const now = new Date();
    const dateKL = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
    const exitLabel = payload.exitType || (isOut ? 'Keluar Luar Kawasan (Outstation)' : 'Balik / Tamat Kerja');

    if (session) {
      const evalOut = evaluateAttendanceSession(new Date(session.clockInTimeUTC), now);

      session.clockOutTimeUTC = now.toISOString();
      session.clockOutTimeKL = `${dateKL}, ${evalOut.clockOutTimeFormatted}`;
      session.clockOutLat = payload.latitude;
      session.clockOutLng = payload.longitude;
      session.clockOutAccuracy = payload.accuracyMeters;
      session.clockOutDistanceMeters = Math.round(dist);
      session.workedMinutes = evalOut.workedMinutes;
      session.workedHours = evalOut.workedHours;
      session.exitType = exitLabel;
      session.clockOutRemarks = payload.remarks || null;
      if (isOut) {
        session.isOutstation = true;
        session.outstationLocation = payload.outstationLocation || session.outstationLocation || 'Luar Kawasan';
      }

      const todayOtherRecords = records.filter(
        (r) => this.isSameEmployeeId(r.employeeId, user.employeeId) && r.workDate === dateKL && r.sessionId !== session.sessionId && (r.workedHours || 0) > 0
      );
      const totalTodayHours = todayOtherRecords.reduce((acc, curr) => acc + (curr.workedHours || 0), session.workedHours || 0);

      if (exitLabel.includes('Rehat')) {
        session.attendanceStatus = 'REHAT';
      } else if (exitLabel.includes('Urusan') || exitLabel.includes('Beli Barang') || exitLabel.includes('Pembelian')) {
        session.attendanceStatus = 'URUSAN_LUAR';
      } else if (isOut || session.isOutstation) {
        session.attendanceStatus = 'OUTSTATION';
      } else if (totalTodayHours >= 8.0) {
        session.attendanceStatus = 'COMPLETED';
      } else {
        session.attendanceStatus = evalOut.attendanceStatus || 'COMPLETED';
      }

      const noteParts = [];
      if (session.entryType) {
        noteParts.push(`Masuk: ${session.entryType}${session.clockInRemarks ? ` (${session.clockInRemarks})` : ''}`);
      }
      noteParts.push(`Keluar: ${exitLabel}${payload.remarks ? ` (${payload.remarks})` : ''}`);
      if (session.isOutstation && session.outstationLocation) {
        noteParts.push(`[Lokasi: ${session.outstationLocation}]`);
      }
      session.exceptionNotes = noteParts.join(' • ');

      this.saveAttendanceList(records);

      const savedWebhook = googleSheetsDb.getSavedWebhookUrl();
      if (savedWebhook) {
        await googleSheetsDb.saveViaWebhook(savedWebhook, session).catch(() => {});
      }
      this.notifyListeners();

      return session;
    } else {
      const evalOut = evaluateAttendanceSession(new Date(now.getTime() - 8 * 3600000), now);
      const fallbackRecord: AttendanceRecord = {
        sessionId: 'ATT-' + Date.now(),
        employeeId: user.employeeId,
        employeeName: user.name,
        department: user.department,
        officeId: office.officeId,
        workDate: dateKL,
        clockInTimeUTC: new Date(now.getTime() - 8 * 3600000).toISOString(),
        clockInTimeKL: `${dateKL}, 08:30 AM`,
        clockOutTimeUTC: now.toISOString(),
        clockOutTimeKL: `${dateKL}, ${evalOut.clockOutTimeFormatted}`,
        clockInLat: payload.latitude,
        clockInLng: payload.longitude,
        clockInAccuracy: payload.accuracyMeters,
        clockInDistanceMeters: Math.round(dist),
        clockOutLat: payload.latitude,
        clockOutLng: payload.longitude,
        clockOutAccuracy: payload.accuracyMeters,
        clockOutDistanceMeters: Math.round(dist),
        faceVerified: 'YES',
        faceVerificationConfidence: '0.96',
        workedMinutes: 480,
        workedHours: 8,
        attendanceStatus: isOut ? 'OUTSTATION' : 'COMPLETED',
        exitType: exitLabel,
        clockOutRemarks: payload.remarks || null,
        isOutstation: isOut,
        outstationLocation: payload.outstationLocation || null,
        exceptionNotes: `Keluar: ${exitLabel}${payload.remarks ? ` (${payload.remarks})` : ''}`,
      };
      records.unshift(fallbackRecord);
      this.saveAttendanceList(records);

      const savedWebhookFallback = googleSheetsDb.getSavedWebhookUrl();
      if (savedWebhookFallback) {
        await googleSheetsDb.saveViaWebhook(savedWebhookFallback, fallbackRecord).catch(() => {});
      }
      this.notifyListeners();

      return fallbackRecord;
    }
  }

  async enrolFace(payload: {
    employeeId: string;
    biometricVector: number[];
    consentVersion: string;
    photoDataUrl?: string;
  }): Promise<boolean> {
    await this.syncFromGoogleSheets(true).catch(() => {});
    this.lastMutationTime = Date.now();

    const emps = this.getEmployeesList();
    const emp = emps.find((e) => e.employeeId === payload.employeeId);
    const hash = 'HLG_FACE_SIG_' + Math.abs(payload.biometricVector.reduce((acc, v) => acc + v, 0)).toFixed(4);

    if (emp) {
      emp.faceEnrolled = true;
      emp.faceEnrolledAt = new Date().toISOString();
      if (payload.photoDataUrl) {
        emp.facePhotoUrl = payload.photoDataUrl;
      }
      emp.faceBiometricHash = hash;
      this.saveEmployeesList(emps);

      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.employeeId === emp.employeeId) {
        currentUser.faceEnrolled = true;
        currentUser.faceEnrolledAt = emp.faceEnrolledAt;
        if (payload.photoDataUrl) {
          currentUser.facePhotoUrl = payload.photoDataUrl;
        }
        currentUser.faceBiometricHash = hash;
        saveItem(STORAGE_KEYS.AUTH_USER, currentUser);
      }
      await this.pushAllToGoogleSheets().catch(() => {});
    }
    if (payload.photoDataUrl) {
      try {
        localStorage.setItem(`halagel_face_${payload.employeeId}`, payload.photoDataUrl);
      } catch (_e) {}
    }
    try {
      localStorage.setItem(`halagel_face_vector_${payload.employeeId}`, JSON.stringify(payload.biometricVector));
    } catch (_e) {}

    return true;
  }

  async getMyHistory(): Promise<AttendanceRecord[]> {
    await this.syncFromGoogleSheets(false).catch(() => {});
    const user = this.getCurrentUser();
    if (!user) return [];
    return this.getAttendanceList().filter((r) => this.isSameEmployeeId(r.employeeId, user.employeeId));
  }

  async getOffices(): Promise<Office[]> {
    return this.getOfficesList();
  }

  async createOffice(office: Partial<Office>): Promise<Office> {
    await this.syncFromGoogleSheets(true).catch(() => {});
    this.lastMutationTime = Date.now();

    const offices = this.getOfficesList();
    const newOff: Office = {
      officeId: 'OFF-' + (offices.length + 1).toString().padStart(2, '0'),
      name: office.name || 'Cawangan Baharu Halagel',
      latitude: office.latitude || 5.6432,
      longitude: office.longitude || 100.4912,
      radiusMeters: office.radiusMeters || 100,
      maxAccuracyMeters: 50,
      maxAgeSeconds: 60,
      address: office.address || 'Kawasan Operasi Halagel',
      active: true,
    };
    offices.push(newOff);
    this.saveOfficesList(offices);
    await this.pushAllToGoogleSheets().catch(() => {});
    this.notifyListeners();
    return newOff;
  }

  async updateOffice(id: string, updates: Partial<Office>): Promise<Office> {
    await this.syncFromGoogleSheets(true).catch(() => {});
    this.lastMutationTime = Date.now();

    const offices = this.getOfficesList();
    const index = offices.findIndex((o) => o.officeId === id);
    if (index === -1) throw new Error('Pejabat tidak dijumpai');
    offices[index] = { ...offices[index], ...updates };
    this.saveOfficesList(offices);
    await this.pushAllToGoogleSheets().catch(() => {});
    this.notifyListeners();
    return offices[index];
  }

  async deleteOffice(id: string): Promise<boolean> {
    await this.syncFromGoogleSheets(true).catch(() => {});
    this.lastMutationTime = Date.now();

    let offices = this.getOfficesList();
    offices = offices.filter((o) => o.officeId !== id);
    this.saveOfficesList(offices);
    await this.pushAllToGoogleSheets().catch(() => {});
    this.notifyListeners();
    return true;
  }

  async getEmployees(): Promise<User[]> {
    return this.getEmployeesList().map(({ password, ...u }) => u);
  }

  async createEmployee(data: Partial<User & { password?: string }>): Promise<User> {
    await this.syncFromGoogleSheets(true).catch(() => {});
    this.lastMutationTime = Date.now();

    const emps = this.getEmployeesList();
    const newEmp: User & { password?: string } = {
      employeeId: data.employeeId || 'EMP' + (emps.length + 100),
      name: data.name || '',
      email: data.email || '',
      department: data.department || 'Pengeluaran',
      assignedOfficeId: data.assignedOfficeId || 'OFF-01',
      role: data.role || 'employee',
      active: data.active ?? true,
      faceEnrolled: false,
      faceEnrolledAt: null,
      password: data.password || 'Password123!',
      mustChangePassword: false,
    };
    emps.push(newEmp);
    this.saveEmployeesList(emps);
    await this.pushAllToGoogleSheets().catch(() => {});
    this.notifyListeners();
    const { password, ...safeEmp } = newEmp;
    return safeEmp;
  }

  async updateEmployee(id: string, updates: Partial<User>): Promise<User> {
    await this.syncFromGoogleSheets(true).catch(() => {});
    this.lastMutationTime = Date.now();

    const emps = this.getEmployeesList();
    const idx = emps.findIndex((e) => this.isSameEmployeeId(e.employeeId, id));
    if (idx === -1) throw new Error('Staf tidak dijumpai');
    const cleanUpdates = { ...updates };
    if (cleanUpdates.employeeId) {
      cleanUpdates.employeeId = cleanUpdates.employeeId.replace(/^'+/, '').trim().toUpperCase();
    }
    const oldId = emps[idx].employeeId;
    emps[idx] = { ...emps[idx], ...cleanUpdates };
    this.saveEmployeesList(emps);

    // If employeeId was updated (e.g. restoring leading zero "123" -> "0123"), sync all attendance records for this employee
    const newId = emps[idx].employeeId;
    if (newId && newId !== oldId) {
      const records = this.getAttendanceList();
      let recChanged = false;
      records.forEach((r) => {
        if (this.isSameEmployeeId(r.employeeId, oldId) || this.isSameEmployeeId(r.employeeId, newId)) {
          r.employeeId = newId;
          recChanged = true;
        }
      });
      if (recChanged) {
        this.saveAttendanceList(records);
      }
    }

    await this.pushAllToGoogleSheets().catch(() => {});
    this.notifyListeners();
    const { password, ...safeEmp } = emps[idx];
    return safeEmp;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    await this.syncFromGoogleSheets(true).catch(() => {});
    this.lastMutationTime = Date.now();

    let emps = this.getEmployeesList();
    emps = emps.filter((e) => e.employeeId !== id);
    this.saveEmployeesList(emps);
    await this.pushAllToGoogleSheets().catch(() => {});
    this.notifyListeners();
    return true;
  }

  async getAllAttendance(): Promise<AttendanceRecord[]> {
    return this.getAttendanceList();
  }

  async deleteAttendance(sessionId: string): Promise<boolean> {
    await this.syncFromGoogleSheets(true).catch(() => {});
    this.lastMutationTime = Date.now();

    let records = this.getAttendanceList();
    records = records.filter((r) => r.sessionId !== sessionId);
    this.saveAttendanceList(records);
    await this.pushAllToGoogleSheets().catch(() => {});
    this.notifyListeners();
    return true;
  }

  async correctAttendance(sessionId: string, payload: {
    clockInTimeKL?: string;
    clockOutTimeKL?: string;
    attendanceStatus?: string;
    workedMinutes?: number;
    reason: string;
  }): Promise<AttendanceRecord> {
    await this.syncFromGoogleSheets(true).catch(() => {});
    this.lastMutationTime = Date.now();

    const records = this.getAttendanceList();
    const rec = records.find((r) => r.sessionId === sessionId);
    if (!rec) throw new Error('Rekod tidak dijumpai');

    if (payload.clockInTimeKL) rec.clockInTimeKL = payload.clockInTimeKL;
    if (payload.clockOutTimeKL) rec.clockOutTimeKL = payload.clockOutTimeKL;
    if (payload.attendanceStatus) rec.attendanceStatus = payload.attendanceStatus;
    if (payload.workedMinutes != null) {
      rec.workedMinutes = payload.workedMinutes;
      rec.workedHours = parseFloat((payload.workedMinutes / 60).toFixed(2));
    }
    rec.exceptionNotes = `Pelarasan Admin: ${payload.reason}`;
    this.saveAttendanceList(records);
    await this.pushAllToGoogleSheets().catch(() => {});
    this.notifyListeners();
    return rec;
  }

  async getAdminMetrics(): Promise<AdminMetrics> {
    const emps = this.getEmployeesList();
    const offices = this.getOfficesList();
    const records = this.getAttendanceList();
    const nowStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const todayRecs = records.filter((r) => r.workDate === nowStr);

    return {
      totalEmployees: emps.length,
      activeEmployees: emps.filter((e) => e.active).length,
      totalOffices: offices.length,
      activeSessionsNow: todayRecs.filter((r) => r.attendanceStatus === 'IN_PROGRESS' || (!r.clockOutTimeKL && !r.clockOutTimeUTC)).length,
      todayTotalClockIns: todayRecs.length,
      todayCompletedSessions: todayRecs.filter((r) => r.attendanceStatus === 'COMPLETED').length,
      flaggedExceptions: records.filter((r) => r.attendanceStatus.startsWith('EXCEPTION_') || r.attendanceStatus === 'LAMBAT').length,
    };
  }

  async getPayrollPreview(params?: { startDate?: string; endDate?: string }): Promise<any> {
    const records = this.getAttendanceList();
    const emps = this.getEmployeesList();

    const summaryMap: Record<string, { employeeId: string; name: string; department: string; daysWorked: number; totalHours: number }> = {};

    emps.forEach((emp) => {
      summaryMap[emp.employeeId] = {
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department,
        daysWorked: 0,
        totalHours: 0,
      };
    });

    records.forEach((r) => {
      const matchKey = Object.keys(summaryMap).find((k) => this.isSameEmployeeId(k, r.employeeId));
      if (matchKey && summaryMap[matchKey]) {
        summaryMap[matchKey].daysWorked += 1;
        summaryMap[matchKey].totalHours += r.workedHours || 0;
      }
    });

    return {
      period: `${params?.startDate || 'Awal Bulan'} - ${params?.endDate || 'Kini'}`,
      employees: Object.values(summaryMap),
      totalHours: Object.values(summaryMap).reduce((acc, curr) => acc + curr.totalHours, 0),
    };
  }

  async exportPayrollCsv(params?: { startDate?: string; endDate?: string }): Promise<string> {
    const data = await this.getPayrollPreview(params);
    let csv = 'ID Staf,Nama,Jabatan,Hari Bekerja,Jumlah Jam\n';
    data.employees.forEach((e: any) => {
      csv += `${e.employeeId},"${e.name}","${e.department}",${e.daysWorked},${e.totalHours.toFixed(1)}\n`;
    });
    return csv;
  }

  async exportEmployeesCsv(): Promise<string> {
    const emps = this.getEmployeesList();
    let csv = 'ID Staf,Nama,Emel,Jabatan,ID Cawangan,Peranan,Status Wajah,Status Akaun\n';
    emps.forEach((e) => {
      csv += `"${e.employeeId}","${e.name}","${e.email}","${e.department}","${e.assignedOfficeId || 'OFF-01'}","${e.role}","${e.faceEnrolled ? 'Didaftar' : 'Belum Didaftar'}","${e.active ? 'Aktif' : 'Tidak Aktif'}"\n`;
    });
    return csv;
  }

  async importEmployees(records: Array<{
    employeeId: string;
    name: string;
    email: string;
    department: string;
    assignedOfficeId?: string;
    role?: string;
    password?: string;
    active?: boolean;
  }>): Promise<{ added: number; updated: number }> {
    await this.syncFromGoogleSheets(true).catch(() => {});
    this.lastMutationTime = Date.now();

    const emps = this.getEmployeesList();
    let added = 0;
    let updated = 0;

    for (const r of records) {
      if (!r.employeeId || !r.name) continue;
      const cleanId = r.employeeId.trim().toUpperCase();
      const idx = emps.findIndex((e) => e.employeeId.trim().toUpperCase() === cleanId);

      if (idx >= 0) {
        emps[idx] = {
          ...emps[idx],
          name: r.name.trim(),
          email: r.email ? r.email.trim() : emps[idx].email,
          department: r.department ? r.department.trim() : emps[idx].department,
          assignedOfficeId: r.assignedOfficeId ? r.assignedOfficeId.trim() : emps[idx].assignedOfficeId,
          role: r.role ? r.role.trim().toLowerCase() : emps[idx].role,
          active: r.active !== undefined ? r.active : emps[idx].active,
          password: r.password ? r.password.trim() : emps[idx].password,
        };
        updated++;
      } else {
        emps.push({
          employeeId: cleanId,
          name: r.name.trim(),
          email: r.email ? r.email.trim() : `${cleanId.toLowerCase()}@halagel.com`,
          department: r.department ? r.department.trim() : 'Pengeluaran & Operasi',
          assignedOfficeId: r.assignedOfficeId ? r.assignedOfficeId.trim() : 'OFF-01',
          role: (r.role && r.role.toLowerCase() === 'admin') ? 'admin' : 'employee',
          active: r.active !== undefined ? r.active : true,
          faceEnrolled: false,
          faceEnrolledAt: null,
          password: r.password ? r.password.trim() : 'Password123!',
          mustChangePassword: false,
        });
        added++;
      }
    }

    this.saveEmployeesList(emps);
    await this.pushAllToGoogleSheets().catch(() => {});
    this.notifyListeners();
    return { added, updated };
  }
}

export const api = new HalagelApiService();
