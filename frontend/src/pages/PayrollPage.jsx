import React, { useEffect, useMemo, useState } from "react";
import DataTable from "../components/DataTable";
import FormField from "../components/FormField";
import LoadingSpinner from "../components/LoadingSpinner";
import PageHeader from "../components/PageHeader";
import { useToast } from "../hooks/useToast";
import { getApiError } from "../services/api";
import { payrollService, staffService } from "../services/staffService";

const paymentOptions = ["pending", "paid", "cancelled"].map((value) => ({ value, label: value }));

export default function PayrollPage() {
  const [payroll, setPayroll] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ employee_id: "", month: new Date().toISOString().slice(0, 7), bonus: "0", deductions: "0", payment_status: "pending" });
  const { showToast } = useToast();

  const staffOptions = staff.map((item) => ({ value: String(item.id), label: `${item.employee_code} - ${item.full_name}` }));
  const columns = useMemo(() => [
    { key: "employee_id", label: "Employee ID" },
    { key: "month", label: "Month" },
    { key: "basic_salary", label: "Basic" },
    { key: "bonus", label: "Bonus" },
    { key: "deductions", label: "Deductions" },
    { key: "final_salary", label: "Final" },
    { key: "payment_status", label: "Status" }
  ], []);

  async function loadData() {
    setLoading(true);
    try {
      const [payrollResponse, staffResponse] = await Promise.all([
        payrollService.list({ limit: 100 }),
        staffService.list({ limit: 200 })
      ]);
      setPayroll(payrollResponse.data);
      setStaff(staffResponse.data);
    } catch (error) {
      showToast(getApiError(error, "Failed to load payroll"), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: ["bonus", "deductions"].includes(name) ? value.replace(/[^0-9.]/g, "") : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await payrollService.generate({
        employee_id: Number(form.employee_id),
        month: form.month,
        bonus: Number(form.bonus || 0),
        deductions: Number(form.deductions || 0),
        payment_status: form.payment_status
      });
      showToast("Payroll generated", "success");
      await loadData();
    } catch (error) {
      showToast(getApiError(error, "Failed to generate payroll"), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Payroll Management" description="Generate salary records with bonus and deduction calculations." />
      <form className="panel grid gap-4 p-4 sm:grid-cols-6" onSubmit={handleSubmit}>
        <FormField label="Staff" name="employee_id" as="select" options={staffOptions} value={form.employee_id} onChange={handleChange} required />
        <FormField label="Month" name="month" type="month" value={form.month} onChange={handleChange} required />
        <FormField label="Bonus" name="bonus" type="number" value={form.bonus} onChange={handleChange} />
        <FormField label="Deductions" name="deductions" type="number" value={form.deductions} onChange={handleChange} />
        <FormField label="Status" name="payment_status" as="select" options={paymentOptions} value={form.payment_status} onChange={handleChange} />
        <div className="flex items-end"><button className="btn-primary w-full" type="submit" disabled={saving}>{saving ? "Generating..." : "Generate"}</button></div>
      </form>
      {loading ? <LoadingSpinner label="Loading payroll" /> : <DataTable columns={columns} data={payroll} emptyText="No payroll records found" />}
    </div>
  );
}
