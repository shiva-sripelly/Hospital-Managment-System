import React from "react";
import { Plus, RefreshCw, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DataTable from "../components/DataTable";
import FormField from "../components/FormField";
import ListControls from "../components/ListControls";
import LoadingSpinner from "../components/LoadingSpinner";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { api, getApiError } from "../services/api";
import { doctorService } from "../services/doctorService";
import { labTestService } from "../services/labTestService";
import { patientService } from "../services/patientService";

const emptyLabTest = {
  patient_id: "",
  doctor_id: "",
  test_name: "",
  test_status: "requested",
  report_file: "",
  remarks: ""
};

const statusOptions = [
  { value: "requested", label: "Requested" },
  { value: "sample_collected", label: "Sample Collected" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" }
];

const PAGE_SIZE = 10;

function statusLabel(value) {
  return statusOptions.find((option) => option.value === value)?.label || value;
}

export default function LabReportsPage({ mode = "default" }) {
  const [labTests, setLabTests] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyLabTest);
  const [reportFile, setReportFile] = useState(null);
  const [errors, setErrors] = useState({});
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === "admin";
  const isDoctor = user?.role === "doctor";
  const isLabTechnician = user?.role === "lab_technician";
  const isPatient = user?.role === "patient";
  const canCreateRequest = isAdmin || isDoctor;
  const canEditReports = isAdmin || isDoctor || isLabTechnician;
  const canUpdateReportFields = isAdmin || isLabTechnician;
  const isUploadMode = mode === "upload";
  const isStatusMode = mode === "status";
  const pageTitle = mode === "upload" ? "Lab Report Upload" : mode === "status" ? "Test Status Update" : "Lab Reports";
  const pageDescription = mode === "upload"
    ? "Upload report references for requested laboratory tests."
    : mode === "status"
      ? "Update laboratory test progress and completion status."
      : "Create lab requests, upload report references, and update test status.";

  const patientMap = useMemo(() => {
    const names = Object.fromEntries(patients.map((patient) => [patient.id, patient.full_name]));
    labTests.forEach((test) => {
      if (test.patient_name) names[test.patient_id] = test.patient_name;
    });
    if (isPatient) {
      labTests.forEach((test) => {
        names[test.patient_id] = user?.full_name || names[test.patient_id] || "My Profile";
      });
    }
    return names;
  }, [isPatient, labTests, patients, user?.full_name]);
  const doctorMap = useMemo(() => {
    const names = Object.fromEntries(doctors.map((doctor) => [doctor.id, doctor.full_name]));
    labTests.forEach((test) => {
      if (test.doctor_name) names[test.doctor_id] = test.doctor_name;
    });
    return names;
  }, [doctors, labTests]);
  const currentDoctor = useMemo(() => doctors.find((doctor) => doctor.email === user?.email), [doctors, user?.email]);
  const patientOptions = patients.map((patient) => ({ value: String(patient.id), label: `${patient.patient_code} - ${patient.full_name}` }));
  const doctorOptions = doctors.map((doctor) => ({ value: String(doctor.id), label: `${doctor.doctor_code} - ${doctor.full_name}` }));

  const columns = useMemo(
    () => {
      const baseColumns = [
        { key: "patient_id", label: "Patient", render: (row) => patientMap[row.patient_id] || row.patient_id },
        { key: "doctor_id", label: "Doctor", render: (row) => doctorMap[row.doctor_id] || row.doctor_id },
        { key: "test_name", label: "Test" }
      ];
      const statusColumn = {
        key: "test_status",
        label: "Status",
        render: (row) => (
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
            {statusLabel(row.test_status)}
          </span>
        )
      };
      const reportColumn = {
        key: "report_file",
        label: "Report",
        render: (row) => row.report_file ? (
          <a
            href={row.report_file.startsWith("http") ? row.report_file : `${api.defaults.baseURL}${row.report_file}`}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-brand-700 hover:text-brand-800"
          >
            View file
          </a>
        ) : "-"
      };
      const createdColumn = { key: "created_at", label: "Created", render: (row) => row.created_at?.slice(0, 10) || "-" };

      if (isUploadMode) return [...baseColumns, reportColumn, createdColumn];
      if (isStatusMode) return [...baseColumns, statusColumn, createdColumn];
      return [...baseColumns, statusColumn, reportColumn, createdColumn];
    },
    [doctorMap, isStatusMode, isUploadMode, patientMap]
  );

  async function loadData(nextPage = page, nextSearch = activeSearch) {
    setLoading(true);
    try {
      const shouldLoadPatients = isAdmin || isDoctor;
      const [labResponse, patientResponse, doctorResponse] = await Promise.all([
        labTestService.list({
          skip: (nextPage - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
          search: nextSearch || undefined
        }),
        shouldLoadPatients ? patientService.list({ limit: 200 }) : Promise.resolve({ data: [] }),
        doctorService.list({ limit: 200 })
      ]);
      setLabTests(labResponse.data);
      setPatients(patientResponse.data);
      setDoctors(doctorResponse.data);
    } catch (error) {
      showToast(getApiError(error, "Failed to load lab reports"), "error");
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
    setForm({
      ...emptyLabTest,
      doctor_id: isDoctor && currentDoctor ? String(currentDoctor.id) : ""
    });
    setReportFile(null);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(labTest) {
    setEditing(labTest);
    setForm({
      patient_id: String(labTest.patient_id),
      doctor_id: String(labTest.doctor_id),
      test_name: labTest.test_name || "",
      test_status: labTest.test_status || "requested",
      report_file: labTest.report_file || "",
      remarks: labTest.remarks || ""
    });
    setReportFile(null);
    setErrors({});
    setModalOpen(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  function handleReportFileChange(event) {
    const file = event.target.files?.[0] || null;
    setReportFile(file);
    setErrors((current) => ({ ...current, report_file: "" }));
  }

  function validate() {
    const nextErrors = {};
    if (!isLabTechnician) {
      if (!form.patient_id) nextErrors.patient_id = "Patient is required";
      if (!form.doctor_id) nextErrors.doctor_id = "Doctor is required";
      if (!form.test_name.trim()) nextErrors.test_name = "Test name is required";
    }
    if (isUploadMode && !reportFile) {
      nextErrors.report_file = "Report file is required";
    }
    if (canUpdateReportFields && !isStatusMode && form.test_status === "completed" && !form.report_file.trim()) {
      nextErrors.report_file = "Report file is required when completed";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const basePayload = {
      patient_id: Number(form.patient_id),
      doctor_id: Number(form.doctor_id),
      test_name: form.test_name,
      test_status: form.test_status,
      report_file: form.report_file || null,
      remarks: form.remarks || null
    };
    let payload = basePayload;
    if (editing && isLabTechnician && isUploadMode) {
      payload = {
        report_file: form.report_file || null,
        remarks: form.remarks || null
      };
    } else if (editing && isLabTechnician && isStatusMode) {
      payload = {
        test_status: form.test_status,
        remarks: form.remarks || null
      };
    }
    if (editing && isDoctor) {
      payload = {
        test_name: form.test_name,
        remarks: form.remarks || null
      };
    }

    try {
      if (editing && isUploadMode) {
        const uploadPayload = new FormData();
        uploadPayload.append("file", reportFile);
        if (form.remarks) uploadPayload.append("remarks", form.remarks);
        await labTestService.uploadReportFile(editing.id, uploadPayload);
        showToast("Lab report uploaded", "success");
      } else if (editing) {
        await labTestService.update(editing.id, payload);
        showToast("Lab report updated", "success");
      } else {
        await labTestService.create(basePayload);
        showToast("Lab request created", "success");
      }
      setModalOpen(false);
      await loadData(page, activeSearch);
    } catch (error) {
      showToast(getApiError(error, "Failed to save lab report"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(labTest) {
    if (!window.confirm(`Delete ${labTest.test_name}?`)) return;
    try {
      await labTestService.remove(labTest.id);
      showToast("Lab report deleted", "success");
      await loadData(page, activeSearch);
    } catch (error) {
      showToast(getApiError(error, "Failed to delete lab report"), "error");
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

  function renderLabTechnicianActions(labTest) {
    if (isUploadMode) {
      return (
        <button type="button" onClick={() => openEdit(labTest)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700" aria-label="Upload Report" title="Upload Report">
          <UploadCloud className="h-4 w-4" />
          Upload
        </button>
      );
    }
    if (isStatusMode) {
      return (
        <button type="button" onClick={() => openEdit(labTest)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700" aria-label="Update Status" title="Update Status">
          <RefreshCw className="h-4 w-4" />
          Status
        </button>
      );
    }
    return undefined;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        action={canCreateRequest ? (
          <button type="button" className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Lab Request
          </button>
        ) : null}
      />
      <ListControls search={search} setSearch={setSearch} onSearch={handleSearch} page={page} onPrevious={() => goToPage(page - 1)} onNext={() => goToPage(page + 1)} hasNext={labTests.length === PAGE_SIZE} loading={loading} placeholder="Search lab reports" />
      {loading ? (
        <LoadingSpinner label="Loading lab reports" />
      ) : (
        <DataTable
          columns={columns}
          data={labTests}
          emptyText={isUploadMode ? "No lab reports ready for upload" : isStatusMode ? "No lab tests found" : "No lab reports found"}
          actions={isLabTechnician ? renderLabTechnicianActions : undefined}
          onEdit={!isLabTechnician && canEditReports ? openEdit : undefined}
          onDelete={isAdmin ? handleDelete : undefined}
        />
      )}
      {modalOpen && (
        <Modal title={editing ? "Edit Lab Report" : "Add Lab Request"} onClose={() => setModalOpen(false)}>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            {isLabTechnician && editing ? (
              <>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span className="label">Patient</span>
                  <p className="mt-1 font-semibold text-slate-900">{patientMap[Number(form.patient_id)] || form.patient_id}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span className="label">Doctor</span>
                  <p className="mt-1 font-semibold text-slate-900">{doctorMap[Number(form.doctor_id)] || form.doctor_id}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span className="label">Test Name</span>
                  <p className="mt-1 font-semibold text-slate-900">{form.test_name}</p>
                </div>
              </>
            ) : (
              <>
                <FormField label="Patient" name="patient_id" as="select" options={patientOptions} value={form.patient_id} onChange={handleChange} error={errors.patient_id} required />
                <FormField label="Doctor" name="doctor_id" as="select" options={doctorOptions} value={form.doctor_id} onChange={handleChange} error={errors.doctor_id} required />
                <FormField label="Test Name" name="test_name" value={form.test_name} onChange={handleChange} error={errors.test_name} required />
              </>
            )}
            {isUploadMode ? (
              <label className="space-y-1.5" htmlFor="report_file_upload">
                <span className="label">Report File</span>
                <input
                  id="report_file_upload"
                  name="report_file_upload"
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  onChange={handleReportFileChange}
                  required
                  className={`field file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-bold file:text-brand-700 hover:file:bg-brand-100 ${errors.report_file ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100" : ""}`}
                />
                {reportFile ? <span className="text-xs font-medium text-slate-500">{reportFile.name}</span> : null}
                {form.report_file ? (
                  <a
                    href={form.report_file.startsWith("http") ? form.report_file : `${api.defaults.baseURL}${form.report_file}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-xs font-bold text-brand-700 hover:text-brand-800"
                  >
                    View current report
                  </a>
                ) : null}
                {errors.report_file ? <span className="text-xs font-medium text-rose-600">{errors.report_file}</span> : null}
              </label>
            ) : isStatusMode ? (
              <FormField label="Status" name="test_status" as="select" options={statusOptions} value={form.test_status} onChange={handleChange} />
            ) : canUpdateReportFields ? (
              <>
                <FormField label="Status" name="test_status" as="select" options={statusOptions} value={form.test_status} onChange={handleChange} />
                <FormField label="Report File" name="report_file" value={form.report_file} onChange={handleChange} error={errors.report_file} placeholder="report.pdf or report URL" />
              </>
            ) : editing ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span className="label">Status</span>
                <p className="mt-1 font-semibold text-slate-900">{statusLabel(form.test_status)}</p>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <FormField label="Remarks" name="remarks" as="textarea" value={form.remarks} onChange={handleChange} />
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
