import React, { createContext, useContext, useState, useEffect } from 'react';
import { DashboardStatus, Office } from '../types';
import { api } from '../services/api';
import { calculateHaversineDistance } from '../utils/geo';
import { useAuth } from './AuthContext';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface AttendanceContextType {
  dashboard: DashboardStatus | null;
  loading: boolean;
  assignedOffice: Office | null;
  userLocation: UserLocation | null;
  distanceToOffice: number | null;
  isInsideRadius: boolean;
  permissionPromptOpen: boolean;
  setPermissionPromptOpen: (val: boolean) => void;
  isPreciseGps: boolean;
  checkLocation: () => Promise<void>;
  setUserCustomLocation: (pos: UserLocation) => void;
  refreshDashboard: () => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isPreciseGps, setIsPreciseGps] = useState(false);
  const [permissionPromptOpen, setPermissionPromptOpen] = useState(false);

  const assignedOffice = dashboard?.assignedOffice || user?.assignedOffice || null;

  const refreshDashboard = async () => {
    try {
      const data = await api.getDashboardStatus();
      setDashboard(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const checkLocation = async () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: parseFloat(pos.coords.latitude.toFixed(6)),
            longitude: parseFloat(pos.coords.longitude.toFixed(6)),
            accuracy: Math.round(pos.coords.accuracy || 10),
          });
          setIsPreciseGps(true);
        },
        (err) => {
          // If permission is denied or prompt needed, show the precise location prompt
          if (err.code === err.PERMISSION_DENIED || !userLocation) {
            setPermissionPromptOpen(true);
          }
          if (assignedOffice && !userLocation) {
            // Keep userLocation null or report error
            setIsPreciseGps(false);
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      setPermissionPromptOpen(true);
    }
  };

  const setUserCustomLocation = (pos: UserLocation) => {
    setUserLocation(pos);
    setIsPreciseGps(true);
  };

  useEffect(() => {
    if (user) {
      refreshDashboard();
      checkLocation();

      // Trigger location prompt automatically on first login if not prompted before
      const hasPrompted = sessionStorage.getItem('halagel_gps_prompted');
      if (!hasPrompted && user.role === 'employee') {
        setPermissionPromptOpen(true);
        sessionStorage.setItem('halagel_gps_prompted', 'true');
      }
    }
  }, [user]);

  let distanceToOffice: number | null = null;
  let isInsideRadius = false;

  if (userLocation && assignedOffice) {
    distanceToOffice = calculateHaversineDistance(
      userLocation.latitude,
      userLocation.longitude,
      assignedOffice.latitude,
      assignedOffice.longitude
    );
    isInsideRadius = distanceToOffice <= assignedOffice.radiusMeters;
  }

  return (
    <AttendanceContext.Provider
      value={{
        dashboard,
        loading,
        assignedOffice,
        userLocation,
        distanceToOffice,
        isInsideRadius,
        permissionPromptOpen,
        setPermissionPromptOpen,
        isPreciseGps,
        checkLocation,
        setUserCustomLocation,
        refreshDashboard,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const ctx = useContext(AttendanceContext);
  if (!ctx) throw new Error('useAttendance must be used within an AttendanceProvider');
  return ctx;
};
