import React from "react";
import { Eye, Plus, Trash2 } from "lucide-react";
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
import { prescriptionService } from "../services/prescriptionService";

const emptyItem = {
  medicine_name: "",
  dosage: "",
  frequency: "",
  duration: ""
};

const emptyPrescription = {
  patient_id: "",
  doctor_id: "",
  appointment_id: "",
  symptoms: "",
  diagnosis: "",
  notes: "",
  items: [{ ...emptyItem }]
};

const PAGE_SIZE = 10;

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(emptyPrescription);
  const [errors, setErrors] = useState({});
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === "admin";
  const isPatient = user?.role === "patient";
  const canManagePrescriptions = ["admin", "doctor"].includes(user?.role);
  const canViewAppointments = ["admin", "receptionist", "patient"].includes(user?.role);

  const patientMap = useMemo(() => {
    const names = Object.fromEntries(patients.map((patient) => [patient.id, patient.full_name]));
    if (isPatient) {
      prescriptions.forEach((prescription) => {
        names[prescription.patient_id] = user?.full_name || names[prescription.patient_id] || "My Profile";
      });
    }
    return names;
  }, [isPatient, patients, prescriptions, user?.full_name]);
  const doctorMap = useMemo(() => Object.fromEntries(doctors.map((doctor) => [doctor.id, doctor.full_name])), [doctors]);
  const patientOptions = patients.map((patient) => ({ value: String(patient.id), label: `${patient.patient_code} - ${patient.full_name}` }));
  const doctorOptions = doctors.map((doctor) => ({ value: String(doctor.id), label: `${doctor.doctor_code} - ${doctor.full_name}` }));
  const appointmentOptions = appointments
    .filter((appointment) => {
      const matchesPatient = !form.patient_id || String(appointment.patient_id) === form.patient_id;
      const matchesDoctor = !form.doctor_id || String(appointment.doctor_id) === form.doctor_id;
      return matchesPatient && matchesDoctor;
    })
    .map((appointment) => ({
      value: String(appointment.id),
      label: `${appointment.appointment_date} ${appointment.appointment_time?.slice(0, 5) || ""}`
    }));

  const columns = useMemo(
    () => [
      { key: "patient_id", label: "Patient", render: (row) => patientMap[row.patient_id] || row.patient_id },
      { key: "doctor_id", label: "Doctor", render: (row) => doctorMap[row.doctor_id] || row.doctor_id },
      { key: "diagnosis", label: "Diagnosis" },
      { key: "items", label: "Medicines", render: (row) => row.items?.length || 0 },
      { key: "created_at", label: "Created", render: (row) => row.created_at?.slice(0, 10) || "-" }
    ],
    [doctorMap, patientMap]
  );

  async function loadData(nextPage = page, nextSearch = activeSearch) {
    setLoading(true);
    try {
      const requests = [
        prescriptionService.list({
          skip: (nextPage - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
          search: nextSearch || undefined
        }),
        patientService.list({ limit: 200 }),
        doctorService.list({ limit: 200 })
      ];
      if (canViewAppointments) {
        requests.push(appointmentService.list({ limit: 200 }));
      }

      const [prescriptionResponse, patientResponse, doctorResponse, appointmentResponse] = await Promise.all(requests);
      setPrescriptions(prescriptionResponse.data);
      setPatients(patientResponse.data);
      setDoctors(doctorResponse.data);
      setAppointments(appointmentResponse?.data || []);
    } catch (error) {
      showToast(getApiError(error, "Failed to load prescriptions"), "error");
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
    setEditing(null);
    setForm(emptyPrescription);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(prescription) {
    setEditing(prescription);
    setForm({
      patient_id: String(prescription.patient_id),
      doctor_id: String(prescription.doctor_id),
      appointment_id: prescription.appointment_id ? String(prescription.appointment_id) : "",
      symptoms: prescription.symptoms || "",
      diagnosis: prescription.diagnosis || "",
      notes: prescription.notes || "",
      items: prescription.items?.length ? prescription.items.map((item) => ({
        medicine_name: item.medicine_name || "",
        dosage: item.dosage || "",
        frequency: item.frequency || "",
        duration: item.duration || ""
      })) : [{ ...emptyItem }]
    });
    setErrors({});
    setModalOpen(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "patient_id" || name === "doctor_id" ? { appointment_id: "" } : {})
    }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  function handleItemChange(index, event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [name]: value } : item
      ))
    }));
    setErrors((current) => ({ ...current, items: "" }));
  }

  function addItem() {
    setForm((current) => ({ ...current, items: [...current.items, { ...emptyItem }] }));
  }

  function removeItem(index) {
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  function validate() {
    const nextErrors = {};
    if (!form.patient_id) nextErrors.patient_id = "Patient is required";
    if (!form.doctor_id) nextErrors.doctor_id = "Doctor is required";
    if (!form.diagnosis.trim()) nextErrors.diagnosis = "Diagnosis is required";
    if (!form.items.length) nextErrors.items = "Add at least one medicine";
    form.items.forEach((item) => {
      if (!item.medicine_name.trim() || !item.dosage.trim() || !item.frequency.trim() || !item.duration.trim()) {
        nextErrors.items = "Complete all medicine rows";
      }
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      patient_id: Number(form.patient_id),
      doctor_id: Number(form.doctor_id),
      appointment_id: form.appointment_id ? Number(form.appointment_id) : null,
      symptoms: form.symptoms || null,
      diagnosis: form.diagnosis,
      notes: form.notes || null,
      items: form.items
    };
    try {
      if (editing) {
        await prescriptionService.update(editing.id, payload);
        showToast("Prescription updated", "success");
      } else {
        await prescriptionService.create(payload);
        showToast("Prescription created", "success");
      }
      setModalOpen(false);
      await loadData(page, activeSearch);
    } catch (error) {
      showToast(getApiError(error, "Failed to save prescription"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(prescription) {
    if (!window.confirm("Delete this prescription?")) return;
    try {
      await prescriptionService.remove(prescription.id);
      showToast("Prescription deleted", "success");
      await loadData(page, activeSearch);
    } catch (error) {
      showToast(getApiError(error, "Failed to delete prescription"), "error");
    }
  }

  function renderActions(prescription) {
    return (
      <>
        <button type="button" onClick={() => setViewing(prescription)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700" aria-label="View" title="View">
          <Eye className="h-4 w-4" />
        </button>
        {canManagePrescriptions ? (
          <button type="button" onClick={() => openEdit(prescription)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700" aria-label="Edit" title="Edit">
            <Plus className="h-4 w-4" />
          </button>
        ) : null}
        {isAdmin ? (
          <button type="button" onClick={() => handleDelete(prescription)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete" title="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
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
        title="Prescriptions"
        description="Record diagnoses and medicine instructions for patient visits."
        action={canManagePrescriptions ? (
          <button type="button" className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Prescription
          </button>
        ) : null}
      />
      <ListControls search={search} setSearch={setSearch} onSearch={handleSearch} page={page} onPrevious={() => goToPage(page - 1)} onNext={() => goToPage(page + 1)} hasNext={prescriptions.length === PAGE_SIZE} loading={loading} placeholder="Search prescriptions" />
      {loading ? (
        <LoadingSpinner label="Loading prescriptions" />
      ) : (
        <DataTable columns={columns} data={prescriptions} emptyText="No prescriptions found" actions={renderActions} />
      )}
      {viewing && (
        <Modal title="Prescription Details" onClose={() => setViewing(null)}>
          <div className="space-y-4 text-sm text-slate-700">
            <p><span className="font-bold text-slate-900">Patient:</span> {patientMap[viewing.patient_id] || viewing.patient_id}</p>
            <p><span className="font-bold text-slate-900">Doctor:</span> {doctorMap[viewing.doctor_id] || viewing.doctor_id}</p>
            <p><span className="font-bold text-slate-900">Diagnosis:</span> {viewing.diagnosis}</p>
            <p><span className="font-bold text-slate-900">Symptoms:</span> {viewing.symptoms || "-"}</p>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Medicine</th>
                    <th className="px-3 py-2">Dosage</th>
                    <th className="px-3 py-2">Frequency</th>
                    <th className="px-3 py-2">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewing.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">{item.medicine_name}</td>
                      <td className="px-3 py-2">{item.dosage}</td>
                      <td className="px-3 py-2">{item.frequency}</td>
                      <td className="px-3 py-2">{item.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p><span className="font-bold text-slate-900">Notes:</span> {viewing.notes || "-"}</p>
            <div className="flex justify-end">
              <button type="button" className="btn-secondary" onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}
      {modalOpen && (
        <Modal title={editing ? "Edit Prescription" : "Add Prescription"} onClose={() => setModalOpen(false)}>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Patient" name="patient_id" as="select" options={patientOptions} value={form.patient_id} onChange={handleChange} error={errors.patient_id} required />
              <FormField label="Doctor" name="doctor_id" as="select" options={doctorOptions} value={form.doctor_id} onChange={handleChange} error={errors.doctor_id} required />
              <FormField label="Appointment" name="appointment_id" as="select" options={appointmentOptions} value={form.appointment_id} onChange={handleChange} />
              <FormField label="Diagnosis" name="diagnosis" value={form.diagnosis} onChange={handleChange} error={errors.diagnosis} required />
              <div className="sm:col-span-2">
                <FormField label="Symptoms" name="symptoms" as="textarea" value={form.symptoms} onChange={handleChange} />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="label">Medicines</p>
                <button type="button" className="btn-secondary px-3 py-2" onClick={addItem}>
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
              {errors.items ? <p className="text-xs font-medium text-rose-600">{errors.items}</p> : null}
              {form.items.map((item, index) => (
                <div key={index} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-4">
                  <FormField label="Medicine" name="medicine_name" value={item.medicine_name} onChange={(event) => handleItemChange(index, event)} required />
                  <FormField label="Dosage" name="dosage" value={item.dosage} onChange={(event) => handleItemChange(index, event)} required />
                  <FormField label="Frequency" name="frequency" value={item.frequency} onChange={(event) => handleItemChange(index, event)} required />
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <FormField label="Duration" name="duration" value={item.duration} onChange={(event) => handleItemChange(index, event)} required />
                    <button type="button" className="mt-6 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => removeItem(index)} disabled={form.items.length === 1} aria-label="Remove medicine" title="Remove medicine">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <FormField label="Notes" name="notes" as="textarea" value={form.notes} onChange={handleChange} />
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
