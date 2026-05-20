import React, { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import DataTable from "../components/DataTable";
import FormField from "../components/FormField";
import ListControls from "../components/ListControls";
import LoadingSpinner from "../components/LoadingSpinner";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { useToast } from "../hooks/useToast";
import { getApiError } from "../services/api";
import { staffService } from "../services/staffService";

const PAGE_SIZE = 10;
const emptyStaff = { employee_code: "", full_name: "", role: "", department: "", phone: "", email: "", salary: "0", joining_date: "", status: "active" };
const statusOptions = ["active", "inactive", "on_leave"].map((value) => ({ value, label: value.replace("_", " ") }));

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyStaff);
  const { showToast } = useToast();

  const columns = useMemo(() => [
    { key: "employee_code", label: "Code" },
    { key: "full_name", label: "Name" },
    { key: "role", label: "Role" },
    { key: "department", label: "Department" },
    { key: "salary", label: "Salary", render: (row) => Number(row.salary || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" }) },
    { key: "status", label: "Status" }
  ], []);

  async function loadData(nextPage = page, nextSearch = search) {
    setLoading(true);
    try {
      const { data } = await staffService.list({ skip: (nextPage - 1) * PAGE_SIZE, limit: PAGE_SIZE, search: nextSearch || undefined });
      setStaff(data);
    } catch (error) {
      showToast(getApiError(error, "Failed to load staff"), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(1, ""); }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: name === "salary" ? value.replace(/[^0-9.]/g, "") : value }));
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyStaff);
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm({ ...row, salary: String(row.salary || 0), joining_date: row.joining_date || "" });
    setModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    const payload = { ...form, employee_code: form.employee_code || null, email: form.email || null, salary: Number(form.salary || 0) };
    try {
      if (editing) await staffService.update(editing.id, payload);
      else await staffService.create(payload);
      showToast(editing ? "Staff updated" : "Staff added", "success");
      setModalOpen(false);
      await loadData(page, search);
    } catch (error) {
      showToast(getApiError(error, "Failed to save staff"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(`Delete ${row.full_name}?`)) return;
    try {
      await staffService.remove(row.id);
      showToast("Staff deleted", "success");
      await loadData(page, search);
    } catch (error) {
      showToast(getApiError(error, "Failed to delete staff"), "error");
    }
  }

  async function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    await loadData(1, search);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Staff Management" description="Manage employee records, departments, and salary data." action={<button type="button" className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Add Staff</button>} />
      <ListControls search={search} setSearch={setSearch} onSearch={handleSearch} page={page} onPrevious={() => { setPage(page - 1); loadData(page - 1, search); }} onNext={() => { setPage(page + 1); loadData(page + 1, search); }} hasNext={staff.length === PAGE_SIZE} loading={loading} placeholder="Search staff" />
      {loading ? <LoadingSpinner label="Loading staff" /> : <DataTable columns={columns} data={staff} emptyText="No staff found" onEdit={openEdit} onDelete={handleDelete} />}
      {modalOpen && (
        <Modal title={editing ? "Edit Staff" : "Add Staff"} onClose={() => setModalOpen(false)}>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <FormField label="Employee Code" name="employee_code" value={form.employee_code} onChange={handleChange} placeholder="Auto generated" />
            <FormField label="Full Name" name="full_name" value={form.full_name} onChange={handleChange} required />
            <FormField label="Role" name="role" value={form.role} onChange={handleChange} required />
            <FormField label="Department" name="department" value={form.department} onChange={handleChange} required />
            <FormField label="Phone" name="phone" value={form.phone} onChange={handleChange} required />
            <FormField label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
            <FormField label="Salary" name="salary" type="number" value={form.salary} onChange={handleChange} />
            <FormField label="Joining Date" name="joining_date" type="date" value={form.joining_date} onChange={handleChange} required />
            <FormField label="Status" name="status" as="select" options={statusOptions} value={form.status} onChange={handleChange} />
            <div className="flex justify-end gap-3 sm:col-span-2">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
