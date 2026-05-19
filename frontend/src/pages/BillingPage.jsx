import React from "react";
import { Download, Edit3, Plus, Trash2 } from "lucide-react";
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
import { billingService } from "../services/billingService";
import { patientService } from "../services/patientService";

const emptyBill = {
  bill_number: "",
  patient_id: "",
  appointment_id: "",
  consultation_fee: "0",
  lab_fee: "0",
  medicine_fee: "0",
  payment_status: "pending",
  payment_method: ""
};

const paymentStatusOptions = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" }
];

const paymentMethodOptions = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "upi", label: "UPI" },
  { value: "insurance", label: "Insurance" }
];

const PAGE_SIZE = 10;

function money(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR"
  });
}

export default function BillingPage() {
  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyBill);
  const [errors, setErrors] = useState({});
  const { user } = useAuth();
  const { showToast } = useToast();
  const isPatient = user?.role === "patient";
  const canManageBills = ["admin", "receptionist"].includes(user?.role);
  const isAdmin = user?.role === "admin";

  const patientMap = useMemo(() => {
    const names = Object.fromEntries(patients.map((patient) => [patient.id, patient.full_name]));
    if (isPatient) {
      bills.forEach((bill) => {
        names[bill.patient_id] = user?.full_name || names[bill.patient_id] || "My Profile";
      });
    }
    return names;
  }, [bills, isPatient, patients, user?.full_name]);
  const patientOptions = patients.map((patient) => ({ value: String(patient.id), label: `${patient.patient_code} - ${patient.full_name}` }));
  const appointmentOptions = appointments
    .filter((appointment) => !form.patient_id || String(appointment.patient_id) === form.patient_id)
    .map((appointment) => ({
      value: String(appointment.id),
      label: `${appointment.appointment_date} ${appointment.appointment_time?.slice(0, 5) || ""}`
    }));
  const totalAmount = Number(form.consultation_fee || 0) + Number(form.lab_fee || 0) + Number(form.medicine_fee || 0);

  const columns = useMemo(
    () => [
      { key: "bill_number", label: "Bill No" },
      { key: "patient_id", label: "Patient", render: (row) => patientMap[row.patient_id] || row.patient_id },
      { key: "total_amount", label: "Total", render: (row) => money(row.total_amount) },
      {
        key: "payment_status",
        label: "Status",
        render: (row) => (
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold capitalize text-brand-700">
            {row.payment_status}
          </span>
        )
      },
      { key: "payment_method", label: "Method", render: (row) => row.payment_method || "-" }
    ],
    [patientMap]
  );

  function renderActions(bill) {
    return (
      <>
        <a
          href={billingService.invoiceUrl(bill.id)}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
          aria-label="Open invoice"
          title="Open invoice"
        >
          <Download className="h-4 w-4" />
        </a>
        {canManageBills ? (
          <button
            type="button"
            onClick={() => openEdit(bill)}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            aria-label="Edit"
            title="Edit"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        ) : null}
        {isAdmin ? (
          <button
            type="button"
            onClick={() => handleDelete(bill)}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            aria-label="Delete"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </>
    );
  }

  async function loadData(nextPage = page, nextSearch = activeSearch) {
    setLoading(true);
    try {
      const [billResponse, patientResponse, appointmentResponse] = await Promise.all([
        billingService.list({
          skip: (nextPage - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
          search: nextSearch || undefined
        }),
        patientService.list({ limit: 200 }),
        appointmentService.list({ limit: 200 })
      ]);
      setBills(billResponse.data);
      setPatients(patientResponse.data);
      setAppointments(appointmentResponse.data);
    } catch (error) {
      showToast(getApiError(error, "Failed to load bills"), "error");
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
    setForm(emptyBill);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(bill) {
    setEditing(bill);
    setForm({
      bill_number: bill.bill_number || "",
      patient_id: String(bill.patient_id),
      appointment_id: bill.appointment_id ? String(bill.appointment_id) : "",
      consultation_fee: String(bill.consultation_fee || 0),
      lab_fee: String(bill.lab_fee || 0),
      medicine_fee: String(bill.medicine_fee || 0),
      payment_status: bill.payment_status || "pending",
      payment_method: bill.payment_method || ""
    });
    setErrors({});
    setModalOpen(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: ["consultation_fee", "lab_fee", "medicine_fee"].includes(name) ? value.replace(/[^0-9.]/g, "") : value,
      ...(name === "patient_id" ? { appointment_id: "" } : {})
    }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  function validate() {
    const nextErrors = {};
    if (!form.patient_id) nextErrors.patient_id = "Patient is required";
    ["consultation_fee", "lab_fee", "medicine_fee"].forEach((field) => {
      if (Number(form[field] || 0) < 0) nextErrors[field] = "Fee cannot be negative";
    });
    if (form.payment_status === "paid" && !form.payment_method) nextErrors.payment_method = "Payment method is required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const payload = {
      bill_number: form.bill_number || null,
      patient_id: Number(form.patient_id),
      appointment_id: form.appointment_id ? Number(form.appointment_id) : null,
      consultation_fee: Number(form.consultation_fee || 0),
      lab_fee: Number(form.lab_fee || 0),
      medicine_fee: Number(form.medicine_fee || 0),
      total_amount: totalAmount,
      payment_status: form.payment_status,
      payment_method: form.payment_method || null
    };
    try {
      if (editing) {
        await billingService.update(editing.id, payload);
        showToast("Bill updated", "success");
      } else {
        await billingService.create(payload);
        showToast("Bill created", "success");
      }
      setModalOpen(false);
      await loadData(page, activeSearch);
    } catch (error) {
      showToast(getApiError(error, "Failed to save bill"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(bill) {
    if (!window.confirm(`Delete ${bill.bill_number}?`)) return;
    try {
      await billingService.remove(bill.id);
      showToast("Bill deleted", "success");
      await loadData(page, activeSearch);
    } catch (error) {
      showToast(getApiError(error, "Failed to delete bill"), "error");
    }
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
        title="Billing"
        description="Create bills, track patient charges, and update payment status."
        action={canManageBills ? (
          <button type="button" className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Bill
          </button>
        ) : null}
      />
      <ListControls search={search} setSearch={setSearch} onSearch={handleSearch} page={page} onPrevious={() => goToPage(page - 1)} onNext={() => goToPage(page + 1)} hasNext={bills.length === PAGE_SIZE} loading={loading} placeholder="Search bills" />
      {loading ? (
        <LoadingSpinner label="Loading bills" />
      ) : (
        <DataTable columns={columns} data={bills} emptyText="No bills found" actions={renderActions} />
      )}
      {modalOpen && (
        <Modal title={editing ? "Edit Bill" : "Add Bill"} onClose={() => setModalOpen(false)}>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <FormField label="Bill Number" name="bill_number" value={form.bill_number} onChange={handleChange} placeholder="Auto generated" />
            <FormField label="Patient" name="patient_id" as="select" options={patientOptions} value={form.patient_id} onChange={handleChange} error={errors.patient_id} required />
            <FormField label="Appointment" name="appointment_id" as="select" options={appointmentOptions} value={form.appointment_id} onChange={handleChange} />
            <FormField label="Consultation Fee" name="consultation_fee" type="number" value={form.consultation_fee} onChange={handleChange} error={errors.consultation_fee} />
            <FormField label="Lab Fee" name="lab_fee" type="number" value={form.lab_fee} onChange={handleChange} error={errors.lab_fee} />
            <FormField label="Medicine Fee" name="medicine_fee" type="number" value={form.medicine_fee} onChange={handleChange} error={errors.medicine_fee} />
            <FormField label="Payment Status" name="payment_status" as="select" options={paymentStatusOptions} value={form.payment_status} onChange={handleChange} />
            <FormField label="Payment Method" name="payment_method" as="select" options={paymentMethodOptions} value={form.payment_method} onChange={handleChange} error={errors.payment_method} />
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 sm:col-span-2">
              Total: {money(totalAmount)}
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
