import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import ProtectedRoute from "./ProtectedRoute";
import AppointmentsPage from "../pages/AppointmentsPage";
import BillingPage from "../pages/BillingPage";
import DashboardPage from "../pages/DashboardPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import LabReportsPage from "../pages/LabReportsPage";
import LoginPage from "../pages/LoginPage";
import MedicalRecordsPage from "../pages/MedicalRecordsPage";
import PatientsPage from "../pages/PatientsPage";
import ProfilePage from "../pages/ProfilePage";
import PrescriptionsPage from "../pages/PrescriptionsPage";
import RegisterPage from "../pages/RegisterPage";
import UsersPage from "../pages/UsersPage";
import { useAuth } from "../hooks/useAuth";

function RoleHome() {
  const { user } = useAuth();
  if (user?.role === "admin") return <DashboardPage />;
  if (user?.role === "receptionist") return <Navigate to="/patients" replace />;
  if (user?.role === "doctor") return <Navigate to="/patients" replace />;
  if (user?.role === "lab_technician") return <Navigate to="/lab-reports" replace />;
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
          <Route path="prescriptions" element={<RoleRoute roles={["admin", "doctor", "patient"]}><PrescriptionsPage /></RoleRoute>} />
          <Route path="lab-reports" element={<RoleRoute roles={["admin", "doctor", "lab_technician", "patient"]}><LabReportsPage /></RoleRoute>} />
          <Route path="medical-records" element={<RoleRoute roles={["admin"]}><MedicalRecordsPage /></RoleRoute>} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="users" element={<RoleRoute roles={["admin"]}><UsersPage /></RoleRoute>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

