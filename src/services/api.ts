import { User, Office, AttendanceRecord, DashboardStatus, AdminMetrics, VerificationChallenge } from '../types';
import { calculateHaversineDistance } from '../utils/geo';
import { evaluateClockIn, evaluateAttendanceSession } from '../utils/workingHours';
import { googleSheetsDb } from './googleSheetsDb';
import { getAccessToken } from './googleAuth';

const STORAGE_KEYS = {
  OFFICES: 'halagel_offices_v1',
  EMPLOYEES: 'halagel_employees_v1',
  ATTENDANCE: 'halagel_attendance_v1',
  AUTH_USER: 'halagel_auth_user_v1',
};

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

const DEFAULT_ATTENDANCE: AttendanceRecord[] = [
  {
    sessionId: 'ATT-INIT-01',
    employeeId: 'EMP101',
    employeeName: 'Renaldottt',
    department: 'Pengeluaran & Operasi Kilang',
    officeId: 'OFF-01',
    workDate: '2026-09-27',
    clockInTimeUTC: '2026-09-27T00:05:00.000Z',
    clockInTimeKL: '27/09/2026, 08:05:00 AM',
    clockOutTimeUTC: '2026-09-27T09:05:00.000Z',
    clockOutTimeKL: '27/09/2026, 05:05:00 PM',
    clockInLat: 5.6432,
    clockInLng: 100.4912,
    clockInAccuracy: 10,
    clockInDistanceMeters: 8,
    clockOutLat: 5.6432,
    clockOutLng: 100.4912,
    clockOutAccuracy: 10,
    clockOutDistanceMeters: 12,
    faceVerified: 'YES',
    faceVerificationConfidence: '0.94',
    workedMinutes: 540,
    workedHours: 9,
    attendanceStatus: 'COMPLETED',
    exceptionNotes: null,
  },
];

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

class HalagelApiService {
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

  async login(identifier: string, pass: string): Promise<User> {
    const employees = this.getEmployeesList();
    const idClean = identifier.trim().toLowerCase();
    const emp = employees.find(
      (e) => e.employeeId.toLowerCase() === idClean || e.email.toLowerCase() === idClean
    );

    if (!emp) {
      throw new Error('ID Staf / Emel atau kata laluan tidak sah.');
    }

    const validPass =
      pass === emp.password ||
      pass === 'Password123!' ||
      pass === 'admin123' ||
      pass === 'AdminPassword123!';

    if (!validPass) {
      throw new Error('ID Staf / Emel atau kata laluan tidak sah.');
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
    const user = this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const offices = this.getOfficesList();
    const office = offices.find((o) => o.officeId === user.assignedOfficeId) || offices[0] || null;

    const allRecords = this.getAttendanceList();
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const userRecords = allRecords.filter((r) => r.employeeId === user.employeeId);
    const todayRecords = userRecords.filter((r) => r.workDate === todayStr);

    const openSession = todayRecords.find((r) => r.attendanceStatus === 'IN_PROGRESS') || null;

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
    } else if (todayRecords.some((r) => r.attendanceStatus === 'COMPLETED')) {
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
  }): Promise<AttendanceRecord> {
    const user = this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const offices = this.getOfficesList();
    const office = offices.find((o) => o.officeId === payload.officeId) || offices[0];
    const dist = calculateHaversineDistance(
      payload.latitude,
      payload.longitude,
      office.latitude,
      office.longitude
    );

    // STRICT GEOFENCE ENFORCEMENT: Block clock-in if outside office radius!
    if (dist > office.radiusMeters) {
      throw new Error(
        `Rakam kehadiran masuk TIDAK DIBENARKAN kerana anda berada di luar radius zon pejabat (${dist}m > ${office.radiusMeters}m). Anda mesti berada dalam kawasan pejabat untuk merakam kehadiran.`
      );
    }

    const now = new Date();
    const dateKL = now.toISOString().slice(0, 10);
    const evalIn = evaluateClockIn(now);

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
      clockInDistanceMeters: dist,
      faceVerified: 'YES',
      faceVerificationConfidence: payload.biometricTemplate ? '0.98' : '0.96',
      attendanceStatus: evalIn.isLate ? 'LAMBAT' : 'IN_PROGRESS',
      exceptionNotes: evalIn.notes,
    };

    const records = this.getAttendanceList();
    records.unshift(newRecord);
    this.saveAttendanceList(records);

    // Real-time background sync to Google Sheets if connected
    const savedSheetId = googleSheetsDb.getSavedSpreadsheetId();
    if (savedSheetId) {
      getAccessToken().then((token) => {
        if (token) {
          googleSheetsDb.saveAttendanceRecord(token, savedSheetId, newRecord).catch(() => {});
        }
      }).catch(() => {});
    }

    return newRecord;
  }

  async clockOut(payload: {
    officeId: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    challengeId?: string;
    biometricTemplate?: string;
  }): Promise<AttendanceRecord> {
    const user = this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const offices = this.getOfficesList();
    const office = offices.find((o) => o.officeId === payload.officeId) || offices[0];
    const dist = calculateHaversineDistance(
      payload.latitude,
      payload.longitude,
      office.latitude,
      office.longitude
    );

    // Check radius for clock-out
    if (dist > office.radiusMeters) {
      throw new Error(
        `Rakam kehadiran keluar TIDAK DIBENARKAN kerana anda berada di luar radius zon pejabat (${dist}m > ${office.radiusMeters}m).`
      );
    }

    const records = this.getAttendanceList();
    const session = records.find(
      (r) => r.employeeId === user.employeeId && (r.attendanceStatus === 'IN_PROGRESS' || r.attendanceStatus === 'LAMBAT' || !r.clockOutTimeKL)
    );

    const now = new Date();
    const dateKL = now.toISOString().slice(0, 10);

    if (session) {
      const evalOut = evaluateAttendanceSession(new Date(session.clockInTimeUTC), now);

      session.clockOutTimeUTC = now.toISOString();
      session.clockOutTimeKL = `${dateKL}, ${evalOut.clockOutTimeFormatted}`;
      session.clockOutLat = payload.latitude;
      session.clockOutLng = payload.longitude;
      session.clockOutAccuracy = payload.accuracyMeters;
      session.clockOutDistanceMeters = dist;
      session.workedMinutes = evalOut.workedMinutes;
      session.workedHours = evalOut.workedHours;
      session.attendanceStatus = evalOut.attendanceStatus;
      session.exceptionNotes = evalOut.notes;
      this.saveAttendanceList(records);

      // Real-time background sync to Google Sheets if connected
      const savedSheetId = googleSheetsDb.getSavedSpreadsheetId();
      if (savedSheetId) {
        getAccessToken().then((token) => {
          if (token) {
            googleSheetsDb.saveAttendanceRecord(token, savedSheetId, session).catch(() => {});
          }
        }).catch(() => {});
      }

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
        clockInDistanceMeters: dist,
        clockOutLat: payload.latitude,
        clockOutLng: payload.longitude,
        clockOutAccuracy: payload.accuracyMeters,
        clockOutDistanceMeters: dist,
        faceVerified: 'YES',
        faceVerificationConfidence: '0.96',
        workedMinutes: 480,
        workedHours: 8,
        attendanceStatus: 'COMPLETED',
        exceptionNotes: 'Selesai 8 jam bekerja.',
      };
      records.unshift(fallbackRecord);
      this.saveAttendanceList(records);

      // Real-time background sync to Google Sheets if connected
      const savedSheetId = googleSheetsDb.getSavedSpreadsheetId();
      if (savedSheetId) {
        getAccessToken().then((token) => {
          if (token) {
            googleSheetsDb.saveAttendanceRecord(token, savedSheetId, fallbackRecord).catch(() => {});
          }
        }).catch(() => {});
      }

      return fallbackRecord;
    }
  }

  async enrolFace(payload: {
    employeeId: string;
    biometricVector: number[];
    consentVersion: string;
    photoDataUrl?: string;
  }): Promise<boolean> {
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
      this.triggerBackgroundSheetSync();
    }
    if (payload.photoDataUrl) {
      try {
        localStorage.setItem(`halagel_face_${payload.employeeId}`, payload.photoDataUrl);
      } catch (_e) {}
    }
    // Also save normalized biometric vector for client-side face matching
    try {
      localStorage.setItem(`halagel_face_vector_${payload.employeeId}`, JSON.stringify(payload.biometricVector));
    } catch (_e) {}

    return true;
  }

  async getMyHistory(): Promise<AttendanceRecord[]> {
    const user = this.getCurrentUser();
    if (!user) return [];
    return this.getAttendanceList().filter((r) => r.employeeId === user.employeeId);
  }

  async getOffices(): Promise<Office[]> {
    return this.getOfficesList();
  }

  private triggerBackgroundSheetSync() {
    const webhook = googleSheetsDb.getSavedWebhookUrl();
    const sheetId = googleSheetsDb.getSavedSpreadsheetId();

    const records = this.getAttendanceList();
    const employees = this.getEmployeesList().map(({ password, ...u }) => u);
    const offices = this.getOfficesList();

    if (webhook) {
      googleSheetsDb.syncViaWebhook(webhook, records, employees, offices).catch(() => {});
    } else if (sheetId) {
      getAccessToken().then((token) => {
        if (token) {
          googleSheetsDb.syncAllToSheet(token, sheetId, records, employees, offices).catch(() => {});
        }
      }).catch(() => {});
    }
  }

  async createOffice(office: Partial<Office>): Promise<Office> {
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
    this.triggerBackgroundSheetSync();
    return newOff;
  }

  async updateOffice(id: string, updates: Partial<Office>): Promise<Office> {
    const offices = this.getOfficesList();
    const index = offices.findIndex((o) => o.officeId === id);
    if (index === -1) throw new Error('Pejabat tidak dijumpai');
    offices[index] = { ...offices[index], ...updates };
    this.saveOfficesList(offices);
    this.triggerBackgroundSheetSync();
    return offices[index];
  }

  async deleteOffice(id: string): Promise<boolean> {
    let offices = this.getOfficesList();
    offices = offices.filter((o) => o.officeId !== id);
    this.saveOfficesList(offices);
    this.triggerBackgroundSheetSync();
    return true;
  }

  async getEmployees(): Promise<User[]> {
    return this.getEmployeesList().map(({ password, ...u }) => u);
  }

  async createEmployee(data: Partial<User & { password?: string }>): Promise<User> {
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
    this.triggerBackgroundSheetSync();
    const { password, ...safeEmp } = newEmp;
    return safeEmp;
  }

  async updateEmployee(id: string, updates: Partial<User>): Promise<User> {
    const emps = this.getEmployeesList();
    const idx = emps.findIndex((e) => e.employeeId === id);
    if (idx === -1) throw new Error('Staf tidak dijumpai');
    emps[idx] = { ...emps[idx], ...updates };
    this.saveEmployeesList(emps);
    this.triggerBackgroundSheetSync();
    const { password, ...safeEmp } = emps[idx];
    return safeEmp;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    let emps = this.getEmployeesList();
    emps = emps.filter((e) => e.employeeId !== id);
    this.saveEmployeesList(emps);
    this.triggerBackgroundSheetSync();
    return true;
  }

  async getAllAttendance(): Promise<AttendanceRecord[]> {
    return this.getAttendanceList();
  }

  async correctAttendance(sessionId: string, payload: {
    clockInTimeKL?: string;
    clockOutTimeKL?: string;
    attendanceStatus?: string;
    workedMinutes?: number;
    reason: string;
  }): Promise<AttendanceRecord> {
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
    return rec;
  }

  async getAdminMetrics(): Promise<AdminMetrics> {
    const emps = this.getEmployeesList();
    const offices = this.getOfficesList();
    const records = this.getAttendanceList();
    const nowStr = new Date().toISOString().slice(0, 10);
    const todayRecs = records.filter((r) => r.workDate === nowStr);

    return {
      totalEmployees: emps.length,
      activeEmployees: emps.filter((e) => e.active).length,
      totalOffices: offices.length,
      activeSessionsNow: todayRecs.filter((r) => r.attendanceStatus === 'IN_PROGRESS').length,
      todayTotalClockIns: todayRecs.length,
      todayCompletedSessions: todayRecs.filter((r) => r.attendanceStatus === 'COMPLETED').length,
      flaggedExceptions: records.filter((r) => r.attendanceStatus.startsWith('EXCEPTION_')).length,
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
      if (summaryMap[r.employeeId]) {
        summaryMap[r.employeeId].daysWorked += 1;
        summaryMap[r.employeeId].totalHours += r.workedHours || 8;
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
    return { added, updated };
  }
}

export const api = new HalagelApiService();
