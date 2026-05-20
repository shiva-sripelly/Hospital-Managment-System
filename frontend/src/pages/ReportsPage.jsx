import React, { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import DataTable from "../components/DataTable";
import LoadingSpinner from "../components/LoadingSpinner";
import PageHeader from "../components/PageHeader";
import { useToast } from "../hooks/useToast";
import { getApiError } from "../services/api";
import { reportsService } from "../services/reportsService";

function money(value) {
  return Number(value || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" });
}

export default function ReportsPage() {
  const [revenue, setRevenue] = useState(null);
  const [patients, setPatients] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const doctorColumns = useMemo(() => [
    { key: "doctor_name", label: "Doctor" },
    { key: "appointments", label: "Appointments" },
    { key: "prescriptions", label: "Prescriptions" },
    { key: "lab_tests", label: "Lab Tests" }
  ], []);

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      try {
        const [revenueResponse, patientResponse, inventoryResponse, doctorResponse] = await Promise.all([
          reportsService.revenue(),
          reportsService.patientSummary(),
          reportsService.inventory(),
          reportsService.doctorPerformance()
        ]);
        setRevenue(revenueResponse.data);
        setPatients(patientResponse.data);
        setInventory(inventoryResponse.data);
        setDoctors(doctorResponse.data.map((row) => ({ ...row, id: row.doctor_id })));
      } catch (error) {
        showToast(getApiError(error, "Failed to load reports"), "error");
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  async function downloadReport(exportType) {
    const extensions = { csv: "csv", xlsx: "xlsx", pdf: "pdf" };
    const mimeTypes = {
      csv: "text/csv",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      pdf: "application/pdf"
    };

    try {
      const response = await reportsService.exportReport("/reports/revenue", exportType);
      const blob = new Blob([response.data], { type: mimeTypes[exportType] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `revenue-report.${extensions[exportType]}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showToast(getApiError(error, "Failed to download report"), "error");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Revenue, patients, doctors, and inventory summaries."
        action={(
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => downloadReport("csv")}><Download className="h-4 w-4" /> CSV</button>
            <button type="button" className="btn-secondary" onClick={() => downloadReport("xlsx")}><Download className="h-4 w-4" /> Excel</button>
            <button type="button" className="btn-secondary" onClick={() => downloadReport("pdf")}><Download className="h-4 w-4" /> PDF</button>
          </div>
        )}
      />
      {loading ? <LoadingSpinner label="Loading reports" /> : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="panel p-4"><p className="label">Total Revenue</p><p className="mt-2 text-2xl font-bold">{money(revenue?.total_revenue)}</p></div>
            <div className="panel p-4"><p className="label">Patients</p><p className="mt-2 text-2xl font-bold">{patients?.total_patients || 0}</p></div>
            <div className="panel p-4"><p className="label">Appointments</p><p className="mt-2 text-2xl font-bold">{patients?.total_appointments || 0}</p></div>
            <div className="panel p-4"><p className="label">Inventory Value</p><p className="mt-2 text-2xl font-bold">{money(inventory?.inventory_value)}</p></div>
          </div>
          <DataTable columns={doctorColumns} data={doctors} emptyText="No doctor performance data" />
        </>
      )}
    </div>
  );
}
