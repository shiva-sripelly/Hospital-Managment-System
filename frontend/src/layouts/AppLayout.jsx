import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell,
  BrainCircuit,
  CalendarDays,
  ClipboardList,
  FileBarChart,
  FlaskConical,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PackageSearch,
  Pill,
  ReceiptText,
  Stethoscope,
  Sun,
  UserCog,
  UserCircle2,
  Users,
  UploadCloud,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { api } from "../services/api";
import { notificationService } from "../services/notificationService";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { to: "/patients", label: "Patients", roleLabels: { receptionist: "Patient Registration" }, icon: Users, roles: ["admin", "receptionist", "doctor"] },
  { to: "/appointments", label: "Appointments", icon: CalendarDays, roles: ["admin", "receptionist", "patient"] },
  { to: "/billing", label: "Billing", icon: FileText, roles: ["admin", "receptionist", "patient"] },
  { to: "/pharmacy", label: "Pharmacy", icon: Pill, roles: ["admin"] },
  { to: "/inventory", label: "Inventory", icon: PackageSearch, roles: ["admin"] },
  { to: "/prescriptions", label: "Prescriptions", icon: ClipboardList, roles: ["admin", "doctor", "patient"] },
  { to: "/lab-reports", label: "Lab Reports", icon: FlaskConical, roles: ["admin", "doctor", "patient"] },
  { to: "/lab-report-upload", label: "Lab Report Upload", icon: UploadCloud, roles: ["lab_technician"] },
  { to: "/test-status-update", label: "Test Status Update", icon: FlaskConical, roles: ["lab_technician"] },
  { to: "/medical-records", label: "Medical Records", icon: FolderOpen, roles: ["admin"] },
  { to: "/staff", label: "Staff", icon: Users, roles: ["admin"] },
  { to: "/payroll", label: "Payroll", icon: ReceiptText, roles: ["admin"] },
  { to: "/reports", label: "Reports", icon: FileBarChart, roles: ["admin"] },
  { to: "/audit-logs", label: "Audit Logs", icon: ClipboardList, roles: ["admin"] },
  { to: "/ai-insights", label: "AI Insights", icon: BrainCircuit, roles: ["admin"] },
  { to: "/users", label: "Users", icon: UserCog, roles: ["admin"] }
];

function getVisibleNavItems(role) {
  const visibleItems = navItems.filter((item) => item.roles.includes(role));
  if (role === "receptionist") {
    const order = ["/appointments", "/billing", "/pharmacy", "/inventory", "/patients"];
    return [...visibleItems].sort((first, second) => order.indexOf(first.to) - order.indexOf(second.to));
  }
  return visibleItems;
}

export default function AppLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { logout, token, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.is_read).length, [notifications]);
  const profilePhotoUrl = user?.profile_photo_url ? `${api.defaults.baseURL}${user.profile_photo_url}` : "";

  useEffect(() => {
    let ignore = false;
    async function loadNotifications() {
      try {
        const { data } = await notificationService.list({ limit: 10 });
        if (!ignore) setNotifications(data);
      } catch {
        if (!ignore) setNotifications([]);
      }
    }
    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 30000);
    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!token) return undefined;

    let socket;
    let reconnectTimeoutId;
    let isClosed = false;

    function connect() {
      socket = new WebSocket(notificationService.websocketUrl(), ["hms-notifications", token]);
      socket.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data);
          setNotifications((current) => [
            notification,
            ...current.filter((item) => item.id !== notification.id)
          ].slice(0, 10));
        } catch {
          // Ignore malformed websocket payloads.
        }
      };
      socket.onclose = () => {
        if (!isClosed) {
          reconnectTimeoutId = window.setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      isClosed = true;
      window.clearTimeout(reconnectTimeoutId);
      if (socket) {
        socket.close();
      }
    };
  }, [token]);

  async function markNotificationRead(notification) {
    if (notification.is_read) return;
    try {
      const { data } = await notificationService.markRead(notification.id);
      setNotifications((current) => current.map((item) => (item.id === data.id ? data : item)));
    } catch {
      // Notification read state is non-critical UI.
    }
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-[#020617] dark:text-slate-100">
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-20 bg-slate-950/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform dark:border-white/10 dark:bg-[#0f172a] lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-950/20 dark:bg-brand-500 dark:shadow-brand-500/15">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-950 dark:text-slate-50">HMS</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-300">Care Operations</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {getVisibleNavItems(user?.role).map((item) => {
            const Icon = item.icon;
            const label = item.roleLabels?.[user?.role] || item.label;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-500 dark:text-white dark:shadow-sm dark:shadow-brand-950/20"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 text-slate-900 lg:px-12 dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-100">
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-brand-500/60 dark:hover:bg-brand-500/15 dark:hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden text-base font-semibold text-slate-950 dark:text-slate-100 sm:block">
            Hospital Management System
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                className="relative grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-brand-500/70 dark:hover:bg-brand-500/20 dark:hover:text-white"
                onClick={() => setNotificationsOpen((current) => !current)}
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-xs font-bold text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </button>
              {notificationsOpen ? (
                <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft dark:border-white/10 dark:bg-[#0f172a] dark:shadow-none">
                  <div className="border-b border-slate-100 px-4 py-3 dark:border-white/10">
                    <p className="text-sm font-bold text-slate-950 dark:text-slate-50">Notifications</p>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">No notifications</p>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          className={`block w-full border-b border-slate-100 px-4 py-3 text-left text-sm hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/10 ${
                            notification.is_read ? "bg-white dark:bg-[#0f172a]" : "bg-brand-50/60 dark:bg-brand-500/15"
                          }`}
                          onClick={() => markNotificationRead(notification)}
                        >
                          <span className="font-bold text-slate-950 dark:text-slate-50">{notification.title}</span>
                          <span className="mt-1 block text-slate-600 dark:text-slate-300">{notification.message}</span>
                          <span className="mt-1 block text-xs capitalize text-slate-400 dark:text-slate-500">{notification.notification_type.replace("_", " ")}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-brand-500/70 dark:hover:bg-brand-500/20 dark:hover:text-white"
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              title={isDark ? "Light mode" : "Dark mode"}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <NavLink
              to="/profile"
              className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-brand-200 bg-brand-50 text-brand-700 transition hover:bg-brand-100 dark:border-brand-400/30 dark:bg-brand-500/20 dark:text-brand-100 dark:hover:bg-brand-500/30"
              aria-label="Profile"
              title="Profile"
            >
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt={user?.full_name || "Profile"} className="h-full w-full object-cover" />
              ) : (
                <UserCircle2 className="h-6 w-6" />
              )}
            </NavLink>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-slate-950 dark:text-slate-50">{user?.full_name || "User"}</p>
              <p className="text-xs font-semibold capitalize text-slate-500 dark:text-slate-300">{user?.role}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:hover:border-rose-500/70 dark:hover:bg-rose-500/15 dark:hover:text-rose-100"
            >
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

