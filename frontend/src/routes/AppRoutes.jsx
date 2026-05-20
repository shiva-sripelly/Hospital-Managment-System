import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import ProtectedRoute from "./ProtectedRoute";
import AppointmentsPage from "../pages/AppointmentsPage";
import AIInsightsPage from "../pages/AIInsightsPage";
import AuditLogsPage from "../pages/AuditLogsPage";
import BillingPage from "../pages/BillingPage";
import DashboardPage from "../pages/DashboardPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import InventoryPage from "../pages/InventoryPage";
import LabReportsPage from "../pages/LabReportsPage";
import LoginPage from "../pages/LoginPage";
import MedicalRecordsPage from "../pages/MedicalRecordsPage";
import PatientsPage from "../pages/PatientsPage";
import PayrollPage from "../pages/PayrollPage";
import PharmacyPage from "../pages/PharmacyPage";
import ProfilePage from "../pages/ProfilePage";
import PrescriptionsPage from "../pages/PrescriptionsPage";
import RegisterPage from "../pages/RegisterPage";
import ReportsPage from "../pages/ReportsPage";
import StaffPage from "../pages/StaffPage";
import UsersPage from "../pages/UsersPage";
import { useAuth } from "../hooks/useAuth";

function RoleHome() {
  const { user } = useAuth();
  if (user?.role === "admin") return <DashboardPage />;
  if (user?.role === "receptionist") return <Navigate to="/patients" replace />;
  if (user?.role === "doctor") return <Navigate to="/patients" replace />;
  if (user?.role === "lab_technician") return <Navigate to="/lab-report-upload" replace />;
  return <Navigate to="/appointments" replace />;
}

function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  return roles.includes(user?.role) ? children : <Navigate to="/" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
          <Route index element={<RoleHome />} />
          <Route path="patients" element={<RoleRoute roles={["admin", "receptionist", "doctor"]}><PatientsPage /></RoleRoute>} />
          <Route path="appointments" element={<RoleRoute roles={["admin", "receptionist", "patient"]}><AppointmentsPage /></RoleRoute>} />
          <Route path="billing" element={<RoleRoute roles={["admin", "receptionist", "patient"]}><BillingPage /></RoleRoute>} />
          <Route path="pharmacy" element={<RoleRoute roles={["admin"]}><PharmacyPage /></RoleRoute>} />
          <Route path="inventory" element={<RoleRoute roles={["admin"]}><InventoryPage /></RoleRoute>} />
          <Route path="staff" element={<RoleRoute roles={["admin"]}><StaffPage /></RoleRoute>} />
          <Route path="payroll" element={<RoleRoute roles={["admin"]}><PayrollPage /></RoleRoute>} />
          <Route path="reports" element={<RoleRoute roles={["admin"]}><ReportsPage /></RoleRoute>} />
          <Route path="audit-logs" element={<RoleRoute roles={["admin"]}><AuditLogsPage /></RoleRoute>} />
          <Route path="ai-insights" element={<RoleRoute roles={["admin"]}><AIInsightsPage /></RoleRoute>} />
          <Route path="prescriptions" element={<RoleRoute roles={["admin", "doctor", "patient"]}><PrescriptionsPage /></RoleRoute>} />
          <Route path="lab-reports" element={<RoleRoute roles={["admin", "doctor", "patient"]}><LabReportsPage /></RoleRoute>} />
          <Route path="lab-report-upload" element={<RoleRoute roles={["lab_technician"]}><LabReportsPage mode="upload" /></RoleRoute>} />
          <Route path="test-status-update" element={<RoleRoute roles={["lab_technician"]}><LabReportsPage mode="status" /></RoleRoute>} />
          <Route path="medical-records" element={<RoleRoute roles={["admin"]}><MedicalRecordsPage /></RoleRoute>} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="users" element={<RoleRoute roles={["admin"]}><UsersPage /></RoleRoute>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

