/**
 * Halagel Working Hours Policy and Attendance Status Engine
 *
 * Rules:
 * - Hari Bekerja: Ahad hingga Khamis (Sunday to Thursday)
 * - Cuti Mingguan: Jumaat & Sabtu (Kedah weekend)
 *
 * Waktu Bekerja Penuh (Full-Day):
 * - Ahad – Rabu: 8:30 AM – 6:00 PM
 * - Khamis: 8:00 AM – 6:00 PM (Masuk lebih awal jam 8:00 AM)
 * - Waktu Rehat Rasmi: 12:45 PM – 1:45 PM (60 minit)
 * - Syarat Minimum: 8.0 jam bekerja sehari (kecuali separuh hari)
 *
 * Waktu Separuh Hari (Half-Day):
 * - Sesi Pagi: 8:00 AM – 1:15 PM (5 jam 15 minit)
 * - Sesi Petang: 1:15 PM – 6:00 PM (4 jam 45 minit)
 *
 * Peraturan Lambat:
 * - Jika daftar masuk selepas waktu rasmi atau keluar awal, dikira LAMBAT
 *   KECUALI kakitangan mencukupi 8 jam bekerja, atau mencukupi waktu Separuh Hari yang ditetapkan!
 */

export interface WorkingHoursEvaluation {
  isWorkingDay: boolean; // Sunday - Thursday
  dayName: string;
  isThursday: boolean;
  shiftType: 'FULL_DAY' | 'HALF_DAY_MORNING' | 'HALF_DAY_AFTERNOON';
  isClockInLate: boolean;
  clockInTimeFormatted: string;
  clockOutTimeFormatted?: string;
  workedMinutes: number;
  workedHours: number;
  isSufficientHours: boolean; // >= 8.0 hours or completed valid half day
  attendanceStatus: 'COMPLETED' | 'IN_PROGRESS' | 'LAMBAT' | 'AWAL_KELUAR' | 'TEPAT_MASA';
  statusLabel: string;
  statusBadgeColor: string;
  notes: string;
}

export const WORK_CONFIG = {
  // Ahad - Rabu: 8:30 AM
  DEFAULT_START_HOUR: 8,
  DEFAULT_START_MINUTE: 30,

  // Khamis: 8:00 AM
  THURSDAY_START_HOUR: 8,
  THURSDAY_START_MINUTE: 0,

  // Tamat Kerja: 6:00 PM
  END_HOUR: 18,
  END_MINUTE: 0,

  // Waktu Rehat Harian: 12:45 PM - 1:45 PM
  REST_START_HOUR: 12,
  REST_START_MINUTE: 45,
  REST_END_HOUR: 13,
  REST_END_MINUTE: 45,
  REST_DURATION_MINUTES: 60,

  // Half-Day Sesi Pagi: 8:00 AM - 1:15 PM
  HALFDAY_MORNING_START_HOUR: 8,
  HALFDAY_MORNING_START_MIN: 0,
  HALFDAY_MORNING_END_HOUR: 13,
  HALFDAY_MORNING_END_MIN: 15, // 1:15 PM

  // Half-Day Sesi Petang: 1:15 PM - 6:00 PM
  HALFDAY_AFTERNOON_START_HOUR: 13,
  HALFDAY_AFTERNOON_START_MIN: 15, // 1:15 PM
  HALFDAY_AFTERNOON_END_HOUR: 18,
  HALFDAY_AFTERNOON_END_MIN: 0, // 6:00 PM

  REQUIRED_FULL_DAY_HOURS: 8.0,
  WORK_DAYS: [0, 1, 2, 3, 4], // 0: Ahad, 1: Isnin, 2: Selasa, 3: Rabu, 4: Khamis
};

const DAY_NAMES = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];

/**
 * Gets Malaysia time (Asia/Kuala_Lumpur) parts for a given Date
 */
export function getMalaysiaTimeParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'narrow',
  });

  const parts = formatter.formatToParts(date);
  const findVal = (type: string) => parts.find((p) => p.type === type)?.value || '0';

  const year = parseInt(findVal('year'), 10);
  const month = parseInt(findVal('month'), 10);
  const day = parseInt(findVal('day'), 10);
  const hour = parseInt(findVal('hour'), 10);
  const minute = parseInt(findVal('minute'), 10);
  const second = parseInt(findVal('second'), 10);

  const d = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const dayOfWeek = d.getUTCDay();

  const timeFormatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dayOfWeek,
    timeFormatted,
  };
}

/**
 * Evaluates whether clock in is on time based on day of week and shifts
 */
export function evaluateClockIn(clockInDate: Date): {
  isLate: boolean;
  clockInTimeFormatted: string;
  notes: string;
  shiftExpected: string;
} {
  const parts = getMalaysiaTimeParts(clockInDate);
  const clockInMinutes = parts.hour * 60 + parts.minute;
  const isThursday = parts.dayOfWeek === 4;

  // Afternoon half-day window: 1:00 PM to 1:30 PM (target 1:15 PM)
  const isAfternoonShift = clockInMinutes >= (13 * 60) && clockInMinutes <= (14 * 60);

  if (isAfternoonShift) {
    const targetAfternoonMinutes = 13 * 60 + 15; // 1:15 PM = 795 mins
    const isLate = clockInMinutes > (targetAfternoonMinutes + 5);
    const timeFormatted = parts.timeFormatted;
    return {
      isLate,
      clockInTimeFormatted: timeFormatted,
      shiftExpected: 'Separuh Hari (Petang: 1:15 PM – 6:00 PM)',
      notes: isLate
        ? `Masuk lewat untuk Separuh Hari Petang (${timeFormatted}, melepasi 1:15 PM). Tamat jam 6:00 PM.`
        : `Daftar masuk Separuh Hari Petang tepat masa (${timeFormatted}). Tamat jam 6:00 PM.`,
    };
  }

  // Morning Shift:
  // On Thursday (Khamis), work starts from 8:00 AM, but entering up to 8:30 AM is NOT considered late!
  // Sun - Wed: 8:30 AM.
  // Hence, cutoff for lateness is 8:30 AM (510 mins) across all workdays.
  const lateCutoffMinutes = WORK_CONFIG.DEFAULT_START_HOUR * 60 + WORK_CONFIG.DEFAULT_START_MINUTE; // 8:30 AM = 510 mins

  const isLate = clockInMinutes > lateCutoffMinutes;
  const timeFormatted = parts.timeFormatted;

  let notes = '';
  if (isLate) {
    const lateMins = clockInMinutes - lateCutoffMinutes;
    notes = `Daftar masuk lewat (${lateMins} minit selepas 8:30 AM). Perlu cukup 8 jam bekerja atau separuh hari.`;
  } else if (isThursday) {
    notes = `Daftar masuk tepat masa (Khamis: ${timeFormatted} • masuk 8:00 AM - 8:30 AM tidak dikira lambat).`;
  } else {
    notes = `Daftar masuk tepat masa (${timeFormatted}).`;
  }

  return {
    isLate,
    clockInTimeFormatted: timeFormatted,
    shiftExpected: isThursday ? 'Khamis (8:00 AM – 6:00 PM, masuk hingga 8:30 AM tidak lambat)' : 'Hari Penuh (8:30 AM – 6:00 PM)',
    notes,
  };
}

/**
 * Comprehensive attendance evaluation on clock out
 */
export function evaluateAttendanceSession(
  clockInDate: Date,
  clockOutDate?: Date | null
): WorkingHoursEvaluation {
  const inParts = getMalaysiaTimeParts(clockInDate);
  const dayName = DAY_NAMES[inParts.dayOfWeek];
  const isWorkingDay = WORK_CONFIG.WORK_DAYS.includes(inParts.dayOfWeek);
  const isThursday = inParts.dayOfWeek === 4;

  const lateCutoffMinutes = WORK_CONFIG.DEFAULT_START_HOUR * 60 + WORK_CONFIG.DEFAULT_START_MINUTE; // 8:30 AM = 510 mins
  const standardEndMinutes = WORK_CONFIG.END_HOUR * 60 + WORK_CONFIG.END_MINUTE; // 6:00 PM = 1080 mins

  const inMinutes = inParts.hour * 60 + inParts.minute;
  const isAfternoonClockIn = inMinutes >= (13 * 60); // 1:00 PM onwards

  // On Thursday, entering up to 8:30 AM is NOT considered late!
  const isClockInLate = isAfternoonClockIn
    ? inMinutes > (13 * 60 + 20) // after 1:20 PM for afternoon half-day
    : inMinutes > lateCutoffMinutes;

  if (!clockOutDate) {
    // Session still in progress
    return {
      isWorkingDay,
      dayName,
      isThursday,
      shiftType: isAfternoonClockIn ? 'HALF_DAY_AFTERNOON' : 'FULL_DAY',
      isClockInLate,
      clockInTimeFormatted: inParts.timeFormatted,
      workedMinutes: 0,
      workedHours: 0,
      isSufficientHours: false,
      attendanceStatus: isClockInLate ? 'LAMBAT' : 'IN_PROGRESS',
      statusLabel: isClockInLate ? 'Dalam Sesi (Masuk Lewat)' : 'Sedang Bekerja',
      statusBadgeColor: isClockInLate
        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
        : 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      notes: isClockInLate
        ? `Masuk jam ${inParts.timeFormatted} (Lewat). Perlu lengkapkan 8 jam bekerja atau separuh hari.`
        : `Masuk jam ${inParts.timeFormatted} (Tepat Masa).`,
    };
  }

  // Session has clocked out
  const outParts = getMalaysiaTimeParts(clockOutDate);
  const outMinutes = outParts.hour * 60 + outParts.minute;

  const elapsedMs = clockOutDate.getTime() - clockInDate.getTime();
  const rawMinutes = Math.max(0, Math.floor(elapsedMs / (1000 * 60)));

  // Deduct 1-hour rest time (12:45 PM - 1:45 PM) only if shift crosses noon and exceeds 5 hours
  let netMinutes = rawMinutes;
  const restStartMins = WORK_CONFIG.REST_START_HOUR * 60 + WORK_CONFIG.REST_START_MINUTE; // 12:45 = 765 mins
  const restEndMins = WORK_CONFIG.REST_END_HOUR * 60 + WORK_CONFIG.REST_END_MINUTE; // 13:45 = 825 mins

  const crossesRestTime = inMinutes < restEndMins && outMinutes > restStartMins;
  if (crossesRestTime && rawMinutes >= 330) {
    netMinutes = Math.max(240, rawMinutes - WORK_CONFIG.REST_DURATION_MINUTES);
  }

  const workedHours = parseFloat((netMinutes / 60).toFixed(2));

  // Check Half-day conditions:
  // 1. Morning Half-Day: 8:00 AM - 1:15 PM (Ends at or after 1:15 PM = 795 mins, and exits before 2:15 PM)
  const isMorningHalfDay =
    !isAfternoonClockIn &&
    outMinutes >= (13 * 60 + 15) && // 1:15 PM
    outMinutes <= (14 * 60 + 30) && // Exited around lunch
    rawMinutes >= 270; // At least ~4.5 hours worked

  // 2. Afternoon Half-Day: 1:15 PM - 6:00 PM (Started around 1:00-1:30 PM and ended at or after 6:00 PM = 1080 mins)
  const isAfternoonHalfDay =
    isAfternoonClockIn &&
    outMinutes >= standardEndMinutes && // 6:00 PM
    rawMinutes >= 250; // At least ~4.2 hours worked

  // 3. Full-Day: worked >= 8.0 hours
  const isFullDayComplete = workedHours >= WORK_CONFIG.REQUIRED_FULL_DAY_HOURS;

  let attendanceStatus: WorkingHoursEvaluation['attendanceStatus'] = 'COMPLETED';
  let statusLabel = 'Tepat Masa';
  let statusBadgeColor = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  let shiftType: WorkingHoursEvaluation['shiftType'] = 'FULL_DAY';
  let isSufficientHours = false;
  let notes = '';

  if (isMorningHalfDay) {
    // Valid Morning Half-day (8:00 AM - 1:15 PM)
    shiftType = 'HALF_DAY_MORNING';
    isSufficientHours = true;
    attendanceStatus = 'COMPLETED';
    statusLabel = 'Separuh Hari (Pagi: 8:00 AM – 1:15 PM)';
    notes = `Lengkap separuh hari sesi pagi (${workedHours} jam bekerja). Keluar pada ${outParts.timeFormatted}.`;
  } else if (isAfternoonHalfDay) {
    // Valid Afternoon Half-day (1:15 PM - 6:00 PM)
    shiftType = 'HALF_DAY_AFTERNOON';
    isSufficientHours = true;
    attendanceStatus = 'COMPLETED';
    statusLabel = 'Separuh Hari (Petang: 1:15 PM – 6:00 PM)';
    notes = `Lengkap separuh hari sesi petang (${workedHours} jam bekerja). Masuk pada ${inParts.timeFormatted} dan keluar ${outParts.timeFormatted}.`;
  } else if (isFullDayComplete) {
    // Completed 8 hours full day
    isSufficientHours = true;
    attendanceStatus = 'COMPLETED';
    if (isClockInLate) {
      statusLabel = 'Tepat Masa (Cukup 8 Jam)';
      notes = `Daftar masuk ${inParts.timeFormatted} (asalnya lewat), tetapi memenuhi syarat wajib 8 jam bekerja (${workedHours} jam).`;
    } else {
      statusLabel = isThursday ? 'Hadir Lengkap (Khamis 8 AM - 6 PM)' : 'Hadir Lengkap';
      notes = `Hadir tepat masa dan mencukupi 8 jam bekerja (${workedHours} jam).`;
    }
  } else {
    // Insufficient hours and did not meet half-day requirements
    isSufficientHours = false;
    const isClockOutEarly = outMinutes < standardEndMinutes;

    if (isClockInLate) {
      attendanceStatus = 'LAMBAT';
      statusLabel = 'Lambat (Kurang 8 Jam)';
      statusBadgeColor = 'bg-red-500/15 text-red-400 border-red-500/30';
      notes = `Daftar masuk lewat (${inParts.timeFormatted}) dan bekerja ${workedHours} jam (tidak mencukupi 8 jam atau separuh hari).`;
    } else if (isClockOutEarly) {
      attendanceStatus = 'AWAL_KELUAR';
      statusLabel = 'Awal Keluar (Kurang 8 Jam)';
      statusBadgeColor = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      notes = `Daftar keluar sebelum 6:00 PM (${outParts.timeFormatted}) dan bekerja ${workedHours} jam.`;
    } else {
      attendanceStatus = 'LAMBAT';
      statusLabel = 'Kurang 8 Jam';
      statusBadgeColor = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      notes = `Jumlah jam bekerja ${workedHours} jam tidak mencukupi syarat.`;
    }
  }

  return {
    isWorkingDay,
    dayName,
    isThursday,
    shiftType,
    isClockInLate,
    clockInTimeFormatted: inParts.timeFormatted,
    clockOutTimeFormatted: outParts.timeFormatted,
    workedMinutes: netMinutes,
    workedHours,
    isSufficientHours,
    attendanceStatus,
    statusLabel,
    statusBadgeColor,
    notes,
  };
}

/**
 * Converts a date string ("01/10/2026" or "2026-10-01") into YYYY-MM-DD for ISO Date construction.
 */
export function toISODatePart(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const s = dateStr.trim();
  const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  }
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  return '';
}

/**
 * Formats a Date object as DD/MM/YYYY in Asia/Kuala_Lumpur timezone.
 */
export function getMalaysiaDateDMY(date: Date = new Date()): string {
  const parts = getMalaysiaTimeParts(date);
  return `${String(parts.day).padStart(2, '0')}/${String(parts.month).padStart(2, '0')}/${parts.year}`;
}

/**
 * Normalizes any date string ("2026-10-01", "1/10/2026", "01/10/2026", or ISO) into DD/MM/YYYY.
 */
export function formatDateToDMY(val?: string | null): string {
  if (!val) return getMalaysiaDateDMY();
  const str = String(val).trim();
  if (!str) return getMalaysiaDateDMY();

  const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    return `${dmy[1].padStart(2, '0')}/${dmy[2].padStart(2, '0')}/${dmy[3]}`;
  }

  const ymd = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    return `${ymd[3].padStart(2, '0')}/${ymd[2].padStart(2, '0')}/${ymd[1]}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return getMalaysiaDateDMY(parsed);
  }
  return str;
}

/**
 * Compares two workDate strings regardless of whether one is YYYY-MM-DD and the other is DD/MM/YYYY.
 */
export function isSameWorkDate(dateA?: string | null, dateB?: string | null): boolean {
  if (!dateA || !dateB) return false;
  return formatDateToDMY(dateA) === formatDateToDMY(dateB);
}

/**
 * Formats any date-time string such as "2026-10-01, 8:30 AM" into "DD/MM/YYYY, 8:30 AM".
 */
export function formatDateTimeToDMY(
  dateTimeStr?: string | null,
  fallbackWorkDate?: string | null
): string {
  if (!dateTimeStr || typeof dateTimeStr !== 'string') return '';
  const trimmed = dateTimeStr.trim();
  if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'belum keluar') return '';

  if (trimmed.includes(',')) {
    const parts = trimmed.split(',');
    const datePrefix = parts[0].trim();
    const timeSuffix = parts.slice(1).join(',').trim();
    return `${formatDateToDMY(datePrefix)}, ${timeSuffix}`;
  }

  const spaceMatch = trimmed.match(/^(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})\s+(.+)$/);
  if (spaceMatch) {
    return `${formatDateToDMY(spaceMatch[1])}, ${spaceMatch[2].trim()}`;
  }

  if (fallbackWorkDate) {
    return `${formatDateToDMY(fallbackWorkDate)}, ${trimmed}`;
  }

  return trimmed;
}

/**
 * Parses a Malaysia formatted date/time string such as "01/10/2026, 11:59 am",
 * "2026-10-01, 11:59 am", or "08:30 AM" into a valid JavaScript Date object in Asia/Kuala_Lumpur (+08:00).
 */
export function parseKLTimeStringToDate(
  klTimeStr?: string | null,
  fallbackWorkDate?: string | null
): Date | null {
  if (!klTimeStr || typeof klTimeStr !== 'string') return null;
  const trimmed = klTimeStr.trim();
  if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'belum keluar') return null;

  let isoDatePart = toISODatePart(fallbackWorkDate);
  let timePart = trimmed;

  if (trimmed.includes(',')) {
    const parts = trimmed.split(',');
    const possibleIsoDate = toISODatePart(parts[0].trim());
    if (possibleIsoDate) {
      isoDatePart = possibleIsoDate;
    }
    timePart = parts.slice(1).join(',').trim();
  } else {
    const datePrefixMatch = trimmed.match(/^(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})\s+(.+)$/);
    if (datePrefixMatch) {
      const possibleIsoDate = toISODatePart(datePrefixMatch[1]);
      if (possibleIsoDate) {
        isoDatePart = possibleIsoDate;
      }
      timePart = datePrefixMatch[2].trim();
    }
  }

  if (!isoDatePart) {
    isoDatePart = toISODatePart(getMalaysiaDateDMY());
  }

  const timeMatch = timePart.match(/^(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/i);
  if (!timeMatch) return null;

  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
  const rawMeridiem = timeMatch[4]?.toLowerCase().replace(/\./g, '');

  if (rawMeridiem === 'pm' && hours < 12) hours += 12;
  if (rawMeridiem === 'am' && hours === 12) hours = 0;

  const isoStr = `${isoDatePart}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}+08:00`;
  const parsed = new Date(isoStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Computes workedMinutes and workedHours directly from clockInTimeKL and clockOutTimeKL
 * whenever both are valid, preventing stale durations (like 0.02 jam) after edits.
 */
export function computeDurationFromKLTimes(
  clockInTimeKL?: string | null,
  clockOutTimeKL?: string | null,
  workDate?: string | null
): {
  inDate: Date;
  outDate: Date;
  workedMinutes: number;
  workedHours: number;
  evaluation: WorkingHoursEvaluation;
} | null {
  const inDate = parseKLTimeStringToDate(clockInTimeKL, workDate);
  const outDate = parseKLTimeStringToDate(clockOutTimeKL, workDate);
  if (!inDate || !outDate) return null;

  // If outDate appears earlier than inDate on the same date (e.g. overnight shift), add 1 day
  let adjustedOutDate = outDate;
  if (adjustedOutDate.getTime() < inDate.getTime()) {
    adjustedOutDate = new Date(adjustedOutDate.getTime() + 24 * 60 * 60 * 1000);
  }

  const evaluation = evaluateAttendanceSession(inDate, adjustedOutDate);
  return {
    inDate,
    outDate: adjustedOutDate,
    workedMinutes: evaluation.workedMinutes,
    workedHours: evaluation.workedHours,
    evaluation,
  };
}

/**
 * Formats worked hours / minutes into a human-friendly BM label showing both
 * exact hours/minutes and decimal hours (e.g. "9 jam 1 minit (9.02 jam)" or "8 jam").
 */
export function formatWorkedDuration(
  workedHours?: number | null,
  workedMinutes?: number | null,
  clockInTimeKL?: string | null,
  clockOutTimeKL?: string | null,
  workDate?: string | null
): string {
  // Always prioritize computing from actual Masuk & Keluar times if available
  const computed = computeDurationFromKLTimes(clockInTimeKL, clockOutTimeKL, workDate);
  const effectiveMinutes = computed ? computed.workedMinutes : workedMinutes;
  const effectiveHours = computed ? computed.workedHours : workedHours;

  const hasMinutes = effectiveMinutes != null && !isNaN(Number(effectiveMinutes)) && Number(effectiveMinutes) >= 0;
  const hasHours = effectiveHours != null && !isNaN(Number(effectiveHours)) && Number(effectiveHours) >= 0;

  if (!hasMinutes && !hasHours) return '-';

  const totalMinutes = hasMinutes
    ? Math.round(Number(effectiveMinutes))
    : Math.round(Number(effectiveHours) * 60);

  const decHours = hasHours
    ? Number(Number(effectiveHours).toFixed(2))
    : Number((totalMinutes / 60).toFixed(2));

  if (totalMinutes <= 0 && decHours <= 0) {
    return '0 minit (0 jam)';
  }

  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hrs === 0) {
    return `${mins} minit (${decHours} jam)`;
  }
  if (mins === 0) {
    return `${hrs} jam`;
  }
  return `${hrs} jam ${mins} minit (${decHours} jam)`;
}

/**
 * Formats a clock-in or clock-out timestamp into the exact biometric "Transit time" format:
 * "YYYY-MM-DD HH:mm:ss" (24-hour format with seconds, e.g. "2026-09-24 08:07:35").
 */
export function formatToTransitTime(
  klTimeStr?: string | null,
  utcTimeStr?: string | null,
  fallbackWorkDate?: string | null,
  sessionId?: string | null
): string | null {
  const klDate = parseKLTimeStringToDate(klTimeStr, fallbackWorkDate);
  const utcDate = utcTimeStr ? new Date(utcTimeStr) : null;
  const validUtc = utcDate && !isNaN(utcDate.getTime()) ? utcDate : null;

  const baseDate = klDate || validUtc;
  if (!baseDate) return null;

  const parts = getMalaysiaTimeParts(baseDate);
  let seconds = parts.second;

  if (seconds === 0 && validUtc) {
    const utcParts = getMalaysiaTimeParts(validUtc);
    if (utcParts.second > 0) {
      seconds = utcParts.second;
    }
  }

  if (seconds === 0 && sessionId) {
    const m = String(sessionId).match(/(\d{10,13})$/);
    if (m) {
      const ts = parseInt(m[1], 10);
      if (!isNaN(ts)) {
        seconds = new Date(ts).getSeconds();
      }
    }
  }

  const yyyy = String(parts.year).padStart(4, '0');
  const mm = String(parts.month).padStart(2, '0');
  const dd = String(parts.day).padStart(2, '0');
  const hh = String(parts.hour).padStart(2, '0');
  const min = String(parts.minute).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}


