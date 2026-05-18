import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  Stethoscope,
  UserCog,
  UserCircle2,
  Users,
  X
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { to: "/patients", label: "Patients", icon: Users, roles: ["admin", "receptionist", "doctor", "patient"] },
  { to: "/doctors", label: "Doctors", icon: Stethoscope, roles: ["admin", "receptionist", "patient"] },
  { to: "/appointments", label: "Appointments", icon: CalendarDays, roles: ["admin", "receptionist", "doctor", "patient"] },
  { to: "/users", label: "Users", icon: UserCog, roles: ["admin"] }
];

export default function AppLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-20 bg-slate-950/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-950">HMS</p>
              <p className="text-xs font-medium text-slate-500">Care Operations</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1 px-3 py-5">
          {navItems.filter((item) => item.roles.includes(user?.role)).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden text-sm font-semibold text-slate-500 sm:block">
            Hospital Management System
          </div>
          <div className="flex items-center gap-3">
            <NavLink
              to="/profile"
              className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-brand-700 transition hover:bg-brand-100"
              aria-label="Profile"
              title="Profile"
            >
              <UserCircle2 className="h-6 w-6" />
            </NavLink>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-slate-950">{user?.full_name || "User"}</p>
              <p className="text-xs font-medium capitalize text-slate-500">{user?.role}</p>
            </div>
            <button type="button" onClick={handleLogout} className="btn-secondary px-3">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

