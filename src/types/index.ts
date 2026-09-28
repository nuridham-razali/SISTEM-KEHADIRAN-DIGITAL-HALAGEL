export interface User {
  employeeId: string;
  name: string;
  email: string;
  department: string;
  role: 'employee' | 'admin' | string;
  active: boolean;
  faceEnrolled: boolean;
  faceEnrolledAt?: string | null;
  facePhotoUrl?: string | null;
  faceBiometricHash?: string | null;
  assignedOfficeId?: string | null;
  assignedOffice?: Office | null;
  mustChangePassword?: boolean;
}

export interface Office {
  officeId: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  maxAccuracyMeters: number;
  maxAgeSeconds: number;
  address: string;
  active: boolean;
}

export interface AttendanceRecord {
  sessionId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  officeId: string;
  workDate: string;
  clockInTimeUTC: string;
  clockInTimeKL: string;
  clockOutTimeUTC?: string;
  clockOutTimeKL?: string;
  clockInLat?: number | null;
  clockInLng?: number | null;
  clockInAccuracy?: number | null;
  clockInDistanceMeters?: number | null;
  clockOutLat?: number | null;
  clockOutLng?: number | null;
  clockOutAccuracy?: number | null;
  clockOutDistanceMeters?: number | null;
  faceVerified: 'YES' | 'NO' | 'N/A' | string;
  faceVerificationConfidence?: string | null;
  workedMinutes?: number | null;
  workedHours?: number | null;
  attendanceStatus: 'IN_PROGRESS' | 'COMPLETED' | 'EXCEPTION_OUTSIDE_RADIUS' | 'EXCEPTION_MISSING_CLOCK_OUT' | 'CORRECTED' | string;
  exceptionNotes?: string | null;
}

export interface VerificationChallenge {
  challengeId: string;
  nonce: string;
  livenessAction: string;
  instruction: string;
  expiresInSeconds: number;
  expiresAt: string;
}

export interface DashboardStatus {
  serverTimeUTC: string;
  serverTimeKL: {
    dateKL: string;
    timeKL: string;
    displayKL: string;
    isoKL: string;
  };
  employee: {
    employeeId: string;
    name: string;
    department: string;
    faceEnrolled: boolean;
  };
  assignedOffice: Office | null;
  openSession: AttendanceRecord | null;
  todayRecords: AttendanceRecord[];
  statusSummary: 'NOT_CLOCKED_IN' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface AdminMetrics {
  totalEmployees: number;
  activeEmployees: number;
  totalOffices: number;
  activeSessionsNow: number;
  todayTotalClockIns: number;
  todayCompletedSessions: number;
  flaggedExceptions: number;
}
