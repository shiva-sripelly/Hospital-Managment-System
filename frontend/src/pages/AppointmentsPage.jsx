import React from "react";
import { CheckCircle2, Eye, FileText, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DataTable from "../components/DataTable";
import FormField from "../components/FormField";
import ListControls from "../components/ListControls";
import LoadingSpinner from "../components/LoadingSpinner";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { appointmentService } from "../services/appointmentService";
import { getApiError } from "../services/api";
import { doctorService } from "../services/doctorService";
import { patientService } from "../services/patientService";
import { currentTime, isCurrentOrFutureTime, isTodayOrFuture, todayDate } from "../utils/validation";

const emptyAppointment = {
  patient_id: "",
  doctor_id: "",
  appointment_date: "",
  appointment_time: "",
  status: "scheduled",
  notes: ""
};

const statusOptions = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" }
];
const PAGE_SIZE = 10;

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(emptyAppointment);
  const [errors, setErrors] = useState({});
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === "admin";
  const isReceptionist = user?.role === "receptionist";
  const isDoctor = user?.role === "doctor";
  const isPatient = user?.role === "patient";
  const canAddAppointment = isAdmin || isReceptionist || isPatient;
  const canManageAppointments = isAdmin || isReceptionist;

  const patientMap = useMemo(() => Object.fromEntries(patients.map((patient) => [patient.id, patient.full_name])), [patients]);
  const doctorMap = useMemo(() => Object.fromEntries(doctors.map((doctor) => [doctor.id, doctor.full_name])), [doctors]);
  const patientOptions = patients.map((patient) => ({ value: String(patient.id), label: `${patient.patient_code} - ${patient.full_name}` }));
  const doctorOptions = doctors.map((doctor) => ({ value: String(doctor.id), label: `${doctor.doctor_code} - ${doctor.full_name}` }));

  const columns = useMemo(
    () => [
      { key: "patient_id", label: "Patient", render: (row) => patientMap[row.patient_id] || row.patient_id },
      { key: "doctor_id", label: "Doctor", render: (row) => doctorMap[row.doctor_id] || row.doctor_id },
      { key: "appointment_date", label: "Date" },
      { key: "appointment_time", label: "Time" },
      {
        key: "status",
        label: "Status",
        render: (row) => (
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold capitalize text-brand-700">
            {row.status}
          </span>
        )
      }
    ],
    [doctorMap, patientMap]
  );

  async function loadData(nextPage = page, nextSearch = activeSearch) {
    setLoading(true);
    try {
      const [appointmentResponse, patientResponse, doctorResponse] = await Promise.all([
        appointmentService.list({
          skip: (nextPage - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
          search: nextSearch || undefined
        }),
        patientService.list({ limit: 200 }),
        doctorService.list({ limit: 200 })
      ]);
      setAppointments(appointmentResponse.data);
      setPatients(patientResponse.data);
      setDoctors(doctorResponse.data);
    } catch (error) {
      showToast(getApiError(error, "Failed to load appointments"), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(1, "");
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(1);
      setActiveSearch(search);
      loadData(1, search);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  function openCreate() {
    if (!canAddAppointment) return;
    setEditing(null);
    setForm(emptyAppointment);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(appointment) {
    setEditing(appointment);
    setForm({
      patient_id: String(appointment.patient_id),
      doctor_id: String(appointment.doctor_id),
      appointment_date: appointment.appointment_date || "",
      appointment_time: appointment.appointment_time?.slice(0, 5) || "",
      status: appointment.status || "scheduled",
      notes: appointment.notes || ""
    });
    setErrors({});
    setModalOpen(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  function validate() {
    const nextErrors = {};
    if (isDoctor && editing) {
      if (!form.status) nextErrors.status = "Status is required";
    } else {
      if (!form.patient_id) nextErrors.patient_id = "Patient is required";
      if (!form.doctor_id) nextErrors.doctor_id = "Doctor is required";
      if (!form.appointment_date) nextErrors.appointment_date = "Date is required";
      else if (!isTodayOrFuture(form.appointment_date)) nextErrors.appointment_date = "Appointment date cannot be in the past";
      if (!form.appointment_time) nextErrors.appointment_time = "Time is required";
      else if (!isCurrentOrFutureTime(form.appointment_date, form.appointment_time)) nextErrors.appointment_time = "Appointment time cannot be in the past";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = isDoctor && editing
      ? {
          status: form.status,
          notes: form.notes || null
        }
      : {
          patient_id: Number(form.patient_id),
          doctor_id: Number(form.doctor_id),
          appointment_date: form.appointment_date,
          appointment_time: form.appointment_time,
          status: form.status,
          notes: form.notes || null
        };
    try {
      if (editing) {
        await appointmentService.update(editing.id, payload);
        showToast("Appointment updated", "success");
      } else {
        await appointmentService.create(payload);
        showToast("Appointment created", "success");
      }
      setModalOpen(false);
      await loadData(page, activeSearch);
    } catch (error) {
      showToast(getApiError(error, "Failed to save appointment"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(appointment) {
    if (!window.confirm("Delete this appointment?")) return;
    try {
      await appointmentService.remove(appointment.id);
      showToast("Appointment deleted", "success");
      await loadData(page, activeSearch);
    } catch (error) {
      showToast(getApiError(error, "Failed to delete appointment"), "error");
    }
  }

  async function markCompleted(appointment) {
    try {
      await appointmentService.update(appointment.id, { status: "completed" });
      showToast("Appointment marked completed", "success");
      await loadData(page, activeSearch);
    } catch (error) {
      showToast(getApiError(error, "Failed to update appointment"), "error");
    }
  }

  function renderDoctorActions(appointment) {
    return (
      <>
        <button
          type="button"
          onClick={() => setViewing(appointment)}
          className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
          aria-label="View Details"
          title="View Details"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => openEdit(appointment)}
          className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
          aria-label="Add Notes"
          title="Add Notes"
        >
          <FileText className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => markCompleted(appointment)}
          className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          aria-label="Mark Completed"
          title="Mark Completed"
        >
          <CheckCircle2 className="h-4 w-4" />
        </button>
      </>
    );
  }

  async function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    setActiveSearch(search);
    await loadData(1, search);
  }

  async function goToPage(nextPage) {
    setPage(nextPage);
    await loadData(nextPage, activeSearch);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description="Book and manage patient appointments."
        action={
          canAddAppointment ? (
            <button type="button" className="btn-primary" onClick={openCreate}>
              <Plus className="h-4 w-4" /> {isPatient ? "Request Appointment" : "Add Appointment"}
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
        hasNext={appointments.length === PAGE_SIZE}
        loading={loading}
        placeholder="Search appointments"
      />
      {loading ? (
        <LoadingSpinner label="Loading appointments" />
      ) : (
        <DataTable
          columns={columns}
          data={appointments}
          emptyText="No appointments found"
          onEdit={canManageAppointments ? openEdit : undefined}
          onDelete={isAdmin ? handleDelete : undefined}
          actions={isDoctor ? renderDoctorActions : undefined}
        />
      )}
      {viewing && (
        <Modal title="Appointment Details" onClose={() => setViewing(null)}>
          <div className="space-y-3 text-sm text-slate-700">
            <p><span className="font-bold text-slate-900">Patient:</span> {patientMap[viewing.patient_id] || viewing.patient_id}</p>
            <p><span className="font-bold text-slate-900">Doctor:</span> {doctorMap[viewing.doctor_id] || viewing.doctor_id}</p>
            <p><span className="font-bold text-slate-900">Date:</span> {viewing.appointment_date}</p>
            <p><span className="font-bold text-slate-900">Time:</span> {viewing.appointment_time}</p>
            <p><span className="font-bold text-slate-900">Status:</span> {viewing.status}</p>
            <p><span className="font-bold text-slate-900">Notes:</span> {viewing.notes || "-"}</p>
            <div className="flex justify-end">
              <button type="button" className="btn-secondary" onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}
      {modalOpen && (
        <Modal title={isDoctor && editing ? "Update Appointment" : editing ? "Edit Appointment" : "Add Appointment"} onClose={() => setModalOpen(false)}>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            {!(isDoctor && editing) && (
              <>
                <FormField label="Patient" name="patient_id" as="select" options={patientOptions} value={form.patient_id} onChange={handleChange} error={errors.patient_id} required />
                <FormField label="Doctor" name="doctor_id" as="select" options={doctorOptions} value={form.doctor_id} onChange={handleChange} error={errors.doctor_id} required />
                <FormField label="Date" name="appointment_date" type="date" min={todayDate()} value={form.appointment_date} onChange={handleChange} error={errors.appointment_date} required />
                <FormField label="Time" name="appointment_time" type="time" min={form.appointment_date === todayDate() ? currentTime() : undefined} value={form.appointment_time} onChange={handleChange} error={errors.appointment_time} required />
              </>
            )}
            <FormField label="Status" name="status" as="select" options={statusOptions} value={form.status} onChange={handleChange} />
            <div className="sm:col-span-2">
              <FormField label="Notes" name="notes" as="textarea" value={form.notes} onChange={handleChange} />
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

