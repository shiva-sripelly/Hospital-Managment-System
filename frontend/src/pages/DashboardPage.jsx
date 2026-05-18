import React from "react";
import { CalendarCheck, CalendarClock, Stethoscope, Users } from "lucide-react";
import { useEffect, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import PageHeader from "../components/PageHeader";
import { useToast } from "../hooks/useToast";
import { getApiError } from "../services/api";
import { dashboardService } from "../services/dashboardService";

const cards = [
  { key: "total_patients", label: "Patients", icon: Users, color: "text-brand-600", bg: "bg-brand-50" },
  { key: "total_doctors", label: "Doctors", icon: Stethoscope, color: "text-mint-600", bg: "bg-teal-50" },
  { key: "total_appointments", label: "Appointments", icon: CalendarClock, color: "text-indigo-600", bg: "bg-indigo-50" },
  { key: "completed_appointments", label: "Completed", icon: CalendarCheck, color: "text-emerald-600", bg: "bg-emerald-50" }
];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    async function loadStats() {
      try {
        const { data } = await dashboardService.stats();
        setStats(data);
      } catch (error) {
        showToast(getApiError(error, "Failed to load dashboard"), "error");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [showToast]);

  if (loading) return <LoadingSpinner label="Loading dashboard" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Basic statistics for hospital operations." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="panel p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-950">{stats?.[card.key] ?? 0}</p>
                </div>
                <div className={`grid h-12 w-12 place-items-center rounded-xl ${card.bg}`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5">
          <p className="text-sm font-semibold text-slate-500">Scheduled</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{stats?.scheduled_appointments ?? 0}</p>
        </div>
        <div className="panel p-5">
          <p className="text-sm font-semibold text-slate-500">Cancelled</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{stats?.cancelled_appointments ?? 0}</p>
        </div>
        <div className="panel p-5">
          <p className="text-sm font-semibold text-slate-500">Active Users</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{stats?.active_users ?? 0}</p>
        </div>
      </div>
    </div>
  );
}

