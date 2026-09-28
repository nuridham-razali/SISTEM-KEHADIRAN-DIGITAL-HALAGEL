import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AttendanceProvider } from './context/AttendanceContext';
import { LoginScreen } from './components/LoginScreen';
import { EmployeeDashboard } from './components/employee/EmployeeDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';

const AppContent: React.FC = () => {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-slate-100">
        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-semibold tracking-wide">
          Memuatkan Sistem Kehadiran Halagel...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <AttendanceProvider>
      {isAdmin ? <AdminDashboard /> : <EmployeeDashboard />}
    </AttendanceProvider>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
