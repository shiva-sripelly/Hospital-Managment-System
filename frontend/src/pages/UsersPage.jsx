import React from "react";
import { useEffect, useMemo, useState } from "react";
import DataTable from "../components/DataTable";
import FormField from "../components/FormField";
import ListControls from "../components/ListControls";
import LoadingSpinner from "../components/LoadingSpinner";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { useToast } from "../hooks/useToast";
import { getApiError } from "../services/api";
import { userService } from "../services/userService";
import { isValidEmail } from "../utils/validation";

const roleOptions = ["admin", "receptionist", "doctor", "patient"].map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1)
}));
const PAGE_SIZE = 10;

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    role: "receptionist",
    is_active: true,
    password: ""
  });
  const [errors, setErrors] = useState({});
  const { showToast } = useToast();

  const columns = useMemo(
    () => [
      { key: "full_name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role", render: (row) => <span className="capitalize">{row.role}</span> },
      {
        key: "is_active",
        label: "Status",
        render: (row) => (
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            {row.is_active ? "Active" : "Inactive"}
          </span>
        )
      }
    ],
    []
  );

  async function loadUsers(nextPage = page, nextSearch = activeSearch) {
    setLoading(true);
    try {
      const { data } = await userService.list({
        skip: (nextPage - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
        search: nextSearch || undefined
      });
      setUsers(data);
    } catch (error) {
      showToast(getApiError(error, "Failed to load users"), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers(1, "");
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(1);
      setActiveSearch(search);
      loadUsers(1, search);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  function openEdit(user) {
    setEditing(user);
    setForm({
      full_name: user.full_name || "",
      email: user.email || "",
      role: user.role || "receptionist",
      is_active: Boolean(user.is_active),
      password: ""
    });
    setErrors({});
  }

  function handleChange(event) {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  function validate() {
    const nextErrors = {};
    if (!form.full_name.trim()) nextErrors.full_name = "Full name is required";
    else if (form.full_name.trim().length < 2) nextErrors.full_name = "Full name must be at least 2 characters";
    if (!isValidEmail(form.email, true)) nextErrors.email = "Enter a valid email";
    if (!form.role) nextErrors.role = "Role is required";
    if (form.password && form.password.length < 8) nextErrors.password = "Password must be at least 8 characters";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      full_name: form.full_name,
      email: form.email,
      role: form.role,
      is_active: form.is_active
    };
    if (form.password) payload.password = form.password;

    try {
      await userService.update(editing.id, payload);
      showToast("User updated", "success");
      setEditing(null);
      await loadUsers(page, activeSearch);
    } catch (error) {
      showToast(getApiError(error, "Failed to update user"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Delete ${user.full_name}?`)) return;
    try {
      await userService.remove(user.id);
      showToast("User deleted", "success");
      await loadUsers(page, activeSearch);
    } catch (error) {
      showToast(getApiError(error, "Failed to delete user"), "error");
    }
  }

  async function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    setActiveSearch(search);
    await loadUsers(1, search);
  }

  async function goToPage(nextPage) {
    setPage(nextPage);
    await loadUsers(nextPage, activeSearch);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Manage user roles and account access." />
      <ListControls
        search={search}
        setSearch={setSearch}
        onSearch={handleSearch}
        page={page}
        onPrevious={() => goToPage(page - 1)}
        onNext={() => goToPage(page + 1)}
        hasNext={users.length === PAGE_SIZE}
        loading={loading}
        placeholder="Search users"
      />
      {loading ? (
        <LoadingSpinner label="Loading users" />
      ) : (
        <DataTable
          columns={columns}
          data={users}
          emptyText="No users found"
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      {editing && (
        <Modal title="Edit User" onClose={() => setEditing(null)}>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <FormField label="Full Name" name="full_name" value={form.full_name} onChange={handleChange} error={errors.full_name} required />
            <FormField label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} required />
            <FormField label="Role" name="role" as="select" options={roleOptions} value={form.role} onChange={handleChange} error={errors.role} required />
            <FormField label="New Password" name="password" type="password" value={form.password} onChange={handleChange} error={errors.password} placeholder="Leave blank to keep current" />
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
              Active user
            </label>
            <div className="flex justify-end gap-3 sm:col-span-2">
              <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
