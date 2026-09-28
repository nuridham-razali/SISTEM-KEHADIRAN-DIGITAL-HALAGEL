import { AttendanceRecord, User, Office } from '../types';

const SPREADSHEET_KEY = 'halagel_google_spreadsheet_id_v1';
const SPREADSHEET_INFO_KEY = 'halagel_google_spreadsheet_info_v1';
const WEBHOOK_KEY = 'halagel_google_sheets_webhook_url_v1';

export interface SpreadsheetInfo {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
}

export const googleSheetsDb = {
  getSavedSpreadsheetId(): string | null {
    return localStorage.getItem(SPREADSHEET_KEY);
  },

  setSavedSpreadsheetId(id: string) {
    localStorage.setItem(SPREADSHEET_KEY, id);
  },

  getSavedSpreadsheetInfo(): SpreadsheetInfo | null {
    try {
      const raw = localStorage.getItem(SPREADSHEET_INFO_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setSavedSpreadsheetInfo(info: SpreadsheetInfo) {
    localStorage.setItem(SPREADSHEET_INFO_KEY, JSON.stringify(info));
  },

  clearSavedSpreadsheetId() {
    localStorage.removeItem(SPREADSHEET_KEY);
    localStorage.removeItem(SPREADSHEET_INFO_KEY);
  },

  getSavedWebhookUrl(): string | null {
    return localStorage.getItem(WEBHOOK_KEY);
  },

  setSavedWebhookUrl(url: string) {
    localStorage.setItem(WEBHOOK_KEY, url);
  },

  clearSavedWebhookUrl() {
    localStorage.removeItem(WEBHOOK_KEY);
  },

  /**
   * Fetches metadata for an existing Google Spreadsheet
   */
  async getSpreadsheetMetadata(token: string, spreadsheetId: string): Promise<SpreadsheetInfo> {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gagal membaca Google Sheet (Status: ${res.status})`);
    }
    const data = await res.json();
    return {
      spreadsheetId: data.spreadsheetId,
      title: data.properties?.title || 'Halagel Database',
      spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}`,
    };
  },

  /**
   * Creates a brand new Halagel Attendance & Employee Database spreadsheet
   */
  async createDatabaseSpreadsheet(token: string): Promise<SpreadsheetInfo> {
    const payload = {
      properties: {
        title: `Halagel Pangkalan Data Kehadiran (${new Date().toLocaleDateString('ms-MY')})`,
      },
      sheets: [
        {
          properties: {
            title: 'Kehadiran',
            gridProperties: { rowCount: 1000, columnCount: 14, frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: 'Kakitangan',
            gridProperties: { rowCount: 500, columnCount: 8, frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: 'Cawangan',
            gridProperties: { rowCount: 50, columnCount: 7, frozenRowCount: 1 },
          },
        },
      ],
    };

    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Gagal mencipta Google Sheet pangkalan data');
    }

    const data = await res.json();
    const spreadsheetId = data.spreadsheetId;
    this.setSavedSpreadsheetId(spreadsheetId);

    // Write initial headers
    await this.initializeHeaders(token, spreadsheetId);

    return {
      spreadsheetId,
      title: data.properties.title,
      spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
  },

  /**
   * Populates initial header rows for all 3 tables with styling
   */
  async initializeHeaders(token: string, spreadsheetId: string) {
    const attendanceHeaders = [
      'Session ID',
      'ID Staf',
      'Nama Kakitangan',
      'Jabatan',
      'Tarikh',
      'Waktu Masuk (KL)',
      'Waktu Keluar (KL)',
      'Status Kehadiran',
      'Jumlah Jam',
      'Jarak Geofens (m)',
      'Pengesahan Wajah',
      'Nota Pengecualian',
      'ID Cawangan',
      'Tarikh Rekod Kemaskini',
    ];

    const employeeHeaders = [
      'ID Staf',
      'Nama',
      'Emel',
      'Jabatan',
      'ID Cawangan',
      'Peranan',
      'Status Wajah',
      'Tarikh Didaftar',
    ];

    const officeHeaders = [
      'ID Cawangan',
      'Nama Cawangan',
      'Alamat',
      'Latitude',
      'Longitude',
      'Radius (m)',
      'Status Aktif',
    ];

    const updates = [
      { range: 'Kehadiran!A1:N1', values: [attendanceHeaders] },
      { range: 'Kakitangan!A1:H1', values: [employeeHeaders] },
      { range: 'Cawangan!A1:G1', values: [officeHeaders] },
    ];

    for (const update of updates) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(update.range)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: update.values }),
        }
      );
    }
  },

  /**
   * Appends or updates an attendance record in the Google Sheet
   */
  async saveAttendanceRecord(token: string | null, spreadsheetId: string | null, r: AttendanceRecord) {
    const webhookUrl = this.getSavedWebhookUrl();
    if (webhookUrl) {
      try {
        await this.saveViaWebhook(webhookUrl, r);
        return;
      } catch (err) {
        console.warn('Gagal simpan ke Webhook:', err);
      }
    }

    if (!token || !spreadsheetId) return;

    try {
      // First check if the row already exists
      const readRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Kehadiran!A:A`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const readData = await readRes.json();
      const rows: string[][] = readData.values || [];
      const rowIndex = rows.findIndex((row) => row[0] === r.sessionId);

      const rowValues = [
        r.sessionId,
        r.employeeId,
        r.employeeName,
        r.department,
        r.workDate,
        r.clockInTimeKL,
        r.clockOutTimeKL || 'Belum Keluar',
        r.attendanceStatus,
        r.workedHours ? `${r.workedHours} jam` : '-',
        r.clockInDistanceMeters ?? 0,
        r.faceVerified,
        r.exceptionNotes || '-',
        r.officeId,
        new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' }),
      ];

      if (rowIndex !== -1) {
        // Update existing row (Row numbers in Google Sheets are 1-based)
        const rowNumber = rowIndex + 1;
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Kehadiran!A${rowNumber}:N${rowNumber}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ values: [rowValues] }),
          }
        );
      } else {
        // Append new row
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Kehadiran!A:N:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ values: [rowValues] }),
          }
        );
      }
    } catch (err) {
      console.warn('Gagal menyimpan rekod ke Google Sheets:', err);
    }
  },

  /**
   * Syncs all data (Attendance, Employees, Offices) to Google Sheets
   */
  async syncAllToSheet(
    token: string,
    spreadsheetId: string,
    records: AttendanceRecord[],
    employees: User[],
    offices: Office[]
  ) {
    // 1. Attendance rows
    const attRows = records.map((r) => [
      r.sessionId,
      r.employeeId,
      r.employeeName,
      r.department,
      r.workDate,
      r.clockInTimeKL,
      r.clockOutTimeKL || 'Belum Keluar',
      r.attendanceStatus,
      r.workedHours ? `${r.workedHours} jam` : '-',
      r.clockInDistanceMeters ?? 0,
      r.faceVerified,
      r.exceptionNotes || '-',
      r.officeId,
      new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' }),
    ]);

    // 2. Employee rows
    const empRows = employees.map((e) => [
      e.employeeId,
      e.name,
      e.email,
      e.department,
      e.assignedOfficeId,
      e.role === 'admin' ? 'Pentadbir' : 'Kakitangan',
      e.faceEnrolled ? 'Didaftar' : 'Belum Daftar',
      e.faceEnrolledAt || '-',
    ]);

    // 3. Office rows
    const offRows = offices.map((o) => [
      o.officeId,
      o.name,
      o.address,
      o.latitude,
      o.longitude,
      o.radiusMeters,
      o.active ? 'Aktif' : 'Tidak Aktif',
    ]);

    // Clear and write fresh
    await this.initializeHeaders(token, spreadsheetId);

    if (attRows.length > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Kehadiran!A2:N${attRows.length + 1}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: attRows }),
        }
      );
    }

    if (empRows.length > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Kakitangan!A2:H${empRows.length + 1}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: empRows }),
        }
      );
    }

    if (offRows.length > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Cawangan!A2:G${offRows.length + 1}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: offRows }),
        }
      );
    }
  },

  /**
   * Reads attendance records from the Google Sheet
   */
  async readAttendanceRecords(token: string, spreadsheetId: string): Promise<AttendanceRecord[]> {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Kehadiran!A2:N1000`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) {
      throw new Error('Gagal membaca rekod kehadiran dari Google Sheet');
    }
    const data = await res.json();
    const rows: string[][] = data.values || [];

    return rows.map((row) => ({
      sessionId: row[0] || '',
      employeeId: row[1] || '',
      employeeName: row[2] || '',
      department: row[3] || '',
      officeId: row[12] || 'OFF-01',
      workDate: row[4] || '',
      clockInTimeUTC: new Date().toISOString(),
      clockInTimeKL: row[5] || '',
      clockOutTimeUTC: row[6] && row[6] !== 'Belum Keluar' ? new Date().toISOString() : null,
      clockOutTimeKL: row[6] && row[6] !== 'Belum Keluar' ? row[6] : null,
      clockInLat: 5.6432,
      clockInLng: 100.4912,
      clockOutLat: null,
      clockOutLng: null,
      clockInDistanceMeters: parseInt(row[9] || '0', 10),
      clockOutDistanceMeters: null,
      attendanceStatus: (row[7] as any) || 'COMPLETED',
      workedHours: row[8] ? parseFloat(row[8].replace(' jam', '')) || null : null,
      faceVerified: (row[10] as any) || 'VERIFIED',
      exceptionNotes: row[11] !== '-' ? row[11] : null,
    }));
  },

  /**
   * Google Apps Script Webhook Operations (Works without OAuth domain constraints)
   */
  async saveViaWebhook(webhookUrl: string, record: AttendanceRecord) {
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'SAVE_ATTENDANCE', record }),
    });
  },

  async syncViaWebhook(
    webhookUrl: string,
    records: AttendanceRecord[],
    employees: User[],
    offices: Office[]
  ) {
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'SYNC_ALL', records, employees, offices }),
    });
  },
};
