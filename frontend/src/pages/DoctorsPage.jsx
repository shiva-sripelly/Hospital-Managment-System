import React from "react";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DataTable from "../components/DataTable";
import FormField from "../components/FormField";
import ListControls from "../components/ListControls";
import LoadingSpinner from "../components/LoadingSpinner";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { getApiError } from "../services/api";
import { doctorService } from "../services/doctorService";
import { isDigitsOnly, isValidEmail } from "../utils/validation";

const emptyDoctor = {
  full_name: "",
  specialization: "",
  experience: "",
  phone: "",
  email: "",
  consultation_fee: "",
  available_days: ""
};
const PAGE_SIZE = 10;

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyDoctor);
  const [errors, setErrors] = useState({});
  const { user } = useAuth();
  const { showToast } = useToast();
  const canManageDoctors = user?.role === "admin";

  const columns = useMemo(
    () => [
      { key: "doctor_code", label: "Code" },
      { key: "full_name", label: "Name" },
      { key: "specialization", label: "Specialization" },
      { key: "experience", label: "Experience" },
      { key: "consultation_fee", label: "Fee", render: (row) => `₹${Number(row.consultation_fee).toFixed(2)}` }
    ],
    []
  );

  async function loadDoctors(nextPage = page, nextSearch = activeSearch) {
    setLoading(true);
    try {
      const { data } = await doctorService.list({
        skip: (nextPage - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
        search: nextSearch || undefined
      });
      setDoctors(data);
    } catch (error) {
      showToast(getApiError(error, "Failed to load doctors"), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDoctors(1, "");
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(1);
      setActiveSearch(search);
      loadDoctors(1, search);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  function openCreate() {
    if (!canManageDoctors) return;
    setEditing(null);
    setForm(emptyDoctor);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(doctor) {
    setEditing(doctor);
    setForm({
      full_name: doctor.full_name || "",
      specialization: doctor.specialization || "",
      experience: doctor.experience ?? "",
      phone: doctor.phone || "",
      email: doctor.email || "",
      consultation_fee: doctor.consultation_fee ?? "",
      available_days: doctor.available_days || ""
    });
    setErrors({});
    setModalOpen(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    const nextValue = name === "phone" ? value.replace(/\D/g, "") : value;
    setForm((current) => ({ ...current, [name]: nextValue }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  function validate() {
    const nextErrors = {};
    if (!form.full_name.trim()) nextErrors.full_name = "Full name is required";
    else if (form.full_name.trim().length < 2) nextErrors.full_name = "Full name must be at least 2 characters";
    if (!form.specialization.trim()) nextErrors.specialization = "Specialization is required";
    else if (form.specialization.trim().length < 2) nextErrors.specialization = "Specialization must be at least 2 characters";
    if (!String(form.experience).trim()) nextErrors.experience = "Experience is required";
    else if (!Number.isInteger(Number(form.experience)) || Number(form.experience) < 0 || Number(form.experience) > 80) nextErrors.experience = "Experience must be 0 to 80 years";
    if (!form.phone.trim()) nextErrors.phone = "Phone is required";
    else if (!isDigitsOnly(form.phone)) nextErrors.phone = "Phone must contain numbers only";
    else if (form.phone.length < 7 || form.phone.length > 20) nextErrors.phone = "Phone must be 7 to 20 digits";
    if (!isValidEmail(form.email, true)) nextErrors.email = "Enter a valid email";
    if (!String(form.consultation_fee).trim()) nextErrors.consultation_fee = "Consultation fee is required";
    else if (Number(form.consultation_fee) < 0) nextErrors.consultation_fee = "Consultation fee cannot be negative";
    if (!form.available_days.trim()) nextErrors.available_days = "Available days are required";
    else if (form.available_days.trim().length < 2) nextErrors.available_days = "Available days are too short";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      ...form,
      experience: Number(form.experience),
      consultation_fee: Number(form.consultation_fee)
    };
    try {
      if (editing) {
        await doctorService.update(editing.id, payload);
        showToast("Doctor updated", "success");
      } else {
        await doctorService.create(payload);
        showToast("Doctor created", "success");
      }
      setModalOpen(false);
      await loadDoctors(page, activeSearch);
    } catch (error) {
      showToast(getApiError(error, "Failed to save doctor"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(doctor) {
    if (!window.confirm(`Delete ${doctor.full_name}?`)) return;
    try {
      await doctorService.remove(doctor.id);
      showToast("Doctor deleted", "success");
      await loadDoctors(page, activeSearch);
    } catch (error) {
      showToast(getApiError(error, "Failed to delete doctor"), "error");
    }
  }

  async function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    setActiveSearch(search);
    await loadDoctors(1, search);
  }

  async function goToPage(nextPage) {
    setPage(nextPage);
    await loadDoctors(nextPage, activeSearch);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctors"
        description="Manage doctor profiles, schedules, and consultation fees."
        action={
          <button
            type="button"
            className={canManageDoctors ? "btn-primary" : "btn-secondary cursor-not-allowed opacity-60"}
            onClick={openCreate}
            disabled={!canManageDoctors}
            title={canManageDoctors ? "Add Doctor" : "Only admins can add doctor records"}
          >
            <Plus className="h-4 w-4" /> Add Doctor
          </button>
        }
      />
      <ListControls
        search={search}
        setSearch={setSearch}
        onSearch={handleSearch}
        page={page}
        onPrevious={() => goToPage(page - 1)}
        onNext={() => goToPage(page + 1)}
        hasNext={doctors.length === PAGE_SIZE}
        loading={loading}
        placeholder="Search doctors"
      />
      {loading ? (
        <LoadingSpinner label="Loading doctors" />
      ) : (
        <DataTable
          columns={columns}
          data={doctors}
          emptyText="No doctors found"
          onEdit={canManageDoctors ? openEdit : undefined}
          onDelete={canManageDoctors ? handleDelete : undefined}
        />
      )}
      {modalOpen && (
        <Modal title={editing ? "Edit Doctor" : "Add Doctor"} onClose={() => setModalOpen(false)}>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <FormField label="Full Name" name="full_name" value={form.full_name} onChange={handleChange} error={errors.full_name} required />
            <FormField label="Specialization" name="specialization" value={form.specialization} onChange={handleChange} error={errors.specialization} required />
            <FormField label="Experience" name="experience" type="number" min="0" value={form.experience} onChange={handleChange} error={errors.experience} required />
            <FormField label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange} error={errors.phone} required />
            <FormField label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} required />
            <FormField label="Consultation Fee" name="consultation_fee" type="number" min="0" value={form.consultation_fee} onChange={handleChange} error={errors.consultation_fee} required />
            <div className="sm:col-span-2">
              <FormField label="Available Days" name="available_days" value={form.available_days} onChange={handleChange} error={errors.available_days} placeholder="Monday, Wednesday, Friday" required />
            </div>
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

