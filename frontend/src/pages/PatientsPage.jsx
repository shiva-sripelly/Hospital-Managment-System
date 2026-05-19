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
import { patientService } from "../services/patientService";
import { isDigitsOnly, isTodayOrPast, isValidEmail, todayDate } from "../utils/validation";

const emptyPatient = {
  full_name: "",
  gender: "",
  dob: "",
  phone: "",
  email: "",
  address: "",
  blood_group: "",
  emergency_contact: ""
};

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" }
];

const bloodOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((value) => ({
  value,
  label: value
}));
const PAGE_SIZE = 10;

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyPatient);
  const [errors, setErrors] = useState({});
  const { user } = useAuth();
  const { showToast } = useToast();
  const canAddPatient = ["admin", "receptionist"].includes(user?.role);
  const canManagePatients = user?.role === "admin";
  const isReceptionist = user?.role === "receptionist";

  const columns = useMemo(
    () => [
      { key: "patient_code", label: "Code" },
      { key: "full_name", label: "Name" },
      { key: "gender", label: "Gender" },
      { key: "phone", label: "Phone" },
      { key: "blood_group", label: "Blood" }
    ],
    []
  );

  async function loadPatients(nextPage = page, nextSearch = activeSearch) {
    setLoading(true);
    try {
      const { data } = await patientService.list({
        skip: (nextPage - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
        search: nextSearch || undefined
      });
      setPatients(data);
    } catch (error) {
      showToast(getApiError(error, "Failed to load patients"), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatients(1, "");
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(1);
      setActiveSearch(search);
      loadPatients(1, search);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyPatient);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(patient) {
    setEditing(patient);
    setForm({
      full_name: patient.full_name || "",
      gender: patient.gender || "",
      dob: patient.dob || "",
      phone: patient.phone || "",
      email: patient.email || "",
      address: patient.address || "",
      blood_group: patient.blood_group || "",
      emergency_contact: patient.emergency_contact || ""
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
    if (!form.gender) nextErrors.gender = "Gender is required";
    if (!form.dob) nextErrors.dob = "Date of birth is required";
    else if (!isTodayOrPast(form.dob)) nextErrors.dob = "Date of birth cannot be in the future";
    if (!form.phone.trim()) nextErrors.phone = "Phone is required";
    else if (!isDigitsOnly(form.phone)) nextErrors.phone = "Phone must contain numbers only";
    else if (form.phone.length < 7 || form.phone.length > 20) nextErrors.phone = "Phone must be 7 to 20 digits";
    if (!isValidEmail(form.email)) nextErrors.email = "Enter a valid email";
    if (form.address && form.address.trim().length < 3) nextErrors.address = "Address must be at least 3 characters";
    if (form.emergency_contact && form.emergency_contact.trim().length < 2) nextErrors.emergency_contact = "Emergency contact is too short";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      ...form,
      email: form.email || null,
      blood_group: form.blood_group || null,
      address: form.address || null,
      emergency_contact: form.emergency_contact || null
    };
    try {
      if (editing) {
        await patientService.update(editing.id, payload);
        showToast("Patient updated", "success");
      } else {
        await patientService.create(payload);
        showToast("Patient created", "success");
      }
      setModalOpen(false);
      await loadPatients(page, activeSearch);
    } catch (error) {
      showToast(getApiError(error, "Failed to save patient"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(patient) {
    if (!window.confirm(`Delete ${patient.full_name}?`)) return;
    try {
      await patientService.remove(patient.id);
      showToast("Patient deleted", "success");
      await loadPatients(page, activeSearch);
    } catch (error) {
      showToast(getApiError(error, "Failed to delete patient"), "error");
    }
  }

  async function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    setActiveSearch(search);
    await loadPatients(1, search);
  }

  async function goToPage(nextPage) {
    setPage(nextPage);
    await loadPatients(nextPage, activeSearch);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isReceptionist ? "Patient Registration" : "Patients"}
        description={isReceptionist ? "Register new patient records." : "Create and manage patient records."}
        action={
          canAddPatient ? (
            <button type="button" className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add Patient
            </button>
          ) : null
        }
      />
      <ListControls
        search={search}
        setSearch={setSearch}
        onSearch={handleSearch}
        page={page}
        onPrevious={() => goToPage(page - 1)}
        onNext={() => goToPage(page + 1)}
        hasNext={patients.length === PAGE_SIZE}
        loading={loading}
        placeholder="Search patients"
      />
      {loading ? (
        <LoadingSpinner label="Loading patients" />
      ) : (
        <DataTable
          columns={columns}
          data={patients}
          emptyText="No patients found"
          onEdit={canManagePatients ? openEdit : undefined}
          onDelete={canManagePatients ? handleDelete : undefined}
        />
      )}
      {modalOpen && (
        <Modal title={editing ? "Edit Patient" : "Add Patient"} onClose={() => setModalOpen(false)}>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <FormField label="Full Name" name="full_name" value={form.full_name} onChange={handleChange} error={errors.full_name} required />
            <FormField label="Gender" name="gender" as="select" options={genderOptions} value={form.gender} onChange={handleChange} error={errors.gender} required />
            <FormField label="Date of Birth" name="dob" type="date" max={todayDate()} value={form.dob} onChange={handleChange} error={errors.dob} required />
            <FormField label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange} error={errors.phone} required />
            <FormField label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} />
            <FormField label="Blood Group" name="blood_group" as="select" options={bloodOptions} value={form.blood_group} onChange={handleChange} />
            <div className="sm:col-span-2">
              <FormField label="Address" name="address" as="textarea" value={form.address} onChange={handleChange} error={errors.address} />
            </div>
            <div className="sm:col-span-2">
              <FormField label="Emergency Contact" name="emergency_contact" value={form.emergency_contact} onChange={handleChange} error={errors.emergency_contact} />
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

