import React from "react";
import { Eye, FileUp, Trash2 } from "lucide-react";
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
import { medicalRecordService } from "../services/medicalRecordService";
import { patientService } from "../services/patientService";

const PAGE_SIZE = 10;

const fileTypeOptions = [
  { value: "", label: "All Types" },
  { value: "pdf", label: "PDF" },
  { value: "image", label: "Images" },
  { value: "text", label: "Text" }
];

function formatDate(value) {
  return value ? new Date(value).toLocaleString("en-IN") : "-";
}

function fileUrl(path) {
  if (!path) return "";
  return `${api.defaults.baseURL}${path}`;
}

function readableFileType(value) {
  if (!value) return "-";
  if (value.includes("pdf")) return "PDF";
  if (value.includes("image")) return "Image";
  if (value.includes("text")) return "Text";
  return value;
}

function isPdf(record) {
  return record?.file_type?.includes("pdf") || record?.file_name?.toLowerCase().endsWith(".pdf");
}

export default function MedicalRecordsPage() {
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [fileType, setFileType] = useState("");
  const [activeFileType, setActiveFileType] = useState("");
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState({ patient_id: "", file: null });
  const [errors, setErrors] = useState({});
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === "admin";
  const isPatient = user?.role === "patient";
  const canUpload = ["admin", "receptionist", "doctor"].includes(user?.role);

  const patientMap = useMemo(() => {
    const names = Object.fromEntries(patients.map((patient) => [patient.id, patient.full_name]));
    if (isPatient) {
      records.forEach((record) => {
        names[record.patient_id] = user?.full_name || names[record.patient_id] || "My Profile";
      });
    }
    return names;
  }, [isPatient, patients, records, user?.full_name]);
  const patientOptions = patients.map((patient) => ({ value: String(patient.id), label: `${patient.patient_code} - ${patient.full_name}` }));

  const columns = useMemo(
    () => [
      { key: "patient_id", label: "Patient", render: (row) => patientMap[row.patient_id] || row.patient_id },
      { key: "file_name", label: "File" },
      { key: "file_type", label: "Type", render: (row) => readableFileType(row.file_type) },
      { key: "uploaded_by", label: "Uploaded By", render: (row) => `User #${row.uploaded_by}` },
      { key: "created_at", label: "Created", render: (row) => row.created_at?.slice(0, 10) || "-" }
    ],
    [patientMap]
  );

  async function loadData(nextPage = page, nextSearch = activeSearch, nextFileType = activeFileType) {
    setLoading(true);
    try {
      const [recordResponse, patientResponse] = await Promise.all([
        medicalRecordService.list({
          skip: (nextPage - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
          search: nextSearch || undefined,
          file_type: nextFileType || undefined
        }),
        patientService.list({ limit: 200 })
      ]);
      setRecords(recordResponse.data);
      setPatients(patientResponse.data);
    } catch (error) {
      showToast(getApiError(error, "Failed to load medical records"), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(1, "", "");
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(1);
      setActiveSearch(search);
      setActiveFileType(fileType);
      loadData(1, search, fileType);
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [search, fileType]);

  function openUpload() {
    setForm({ patient_id: "", file: null });
    setErrors({});
    setUploadOpen(true);
  }

  function handleChange(event) {
    const { name, value, files } = event.target;
    setForm((current) => ({ ...current, [name]: files ? files[0] : value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  function validate() {
    const nextErrors = {};
    if (!form.patient_id) nextErrors.patient_id = "Patient is required";
    if (!form.file) nextErrors.file = "File is required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleUpload(event) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await medicalRecordService.upload(Number(form.patient_id), form.file);
      showToast("Medical record uploaded", "success");
      setUploadOpen(false);
      await loadData(page, activeSearch, activeFileType);
    } catch (error) {
      showToast(getApiError(error, "Failed to upload medical record"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record) {
    if (!window.confirm(`Delete ${record.file_name}?`)) return;
    try {
      await medicalRecordService.remove(record.id);
      showToast("Medical record deleted", "success");
      await loadData(page, activeSearch, activeFileType);
    } catch (error) {
      showToast(getApiError(error, "Failed to delete medical record"), "error");
    }
  }

  function renderActions(record) {
    return (
      <>
        <button type="button" onClick={() => setViewing(record)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700" aria-label="View" title="View">
          <Eye className="h-4 w-4" />
        </button>
        {isAdmin ? (
          <button type="button" onClick={() => handleDelete(record)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete" title="Delete">
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
    setActiveFileType(fileType);
    await loadData(1, search, fileType);
  }

  async function goToPage(nextPage) {
    setPage(nextPage);
    await loadData(nextPage, activeSearch, activeFileType);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medical Records"
        description="Upload patient documents, preview PDFs, and review record details."
        action={canUpload ? (
          <button type="button" className="btn-primary" onClick={openUpload}>
            <FileUp className="h-4 w-4" /> Upload Record
          </button>
        ) : null}
      />
      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        <ListControls search={search} setSearch={setSearch} onSearch={handleSearch} page={page} onPrevious={() => goToPage(page - 1)} onNext={() => goToPage(page + 1)} hasNext={records.length === PAGE_SIZE} loading={loading} placeholder="Search medical records" />
        <div className="panel p-4">
          <FormField label="File Type" name="file_type" as="select" options={fileTypeOptions} value={fileType} onChange={(event) => setFileType(event.target.value)} />
        </div>
      </div>
      {loading ? (
        <LoadingSpinner label="Loading medical records" />
      ) : (
        <DataTable columns={columns} data={records} emptyText="No medical records found" actions={renderActions} />
      )}

      {uploadOpen && (
        <Modal title="Upload Medical Record" onClose={() => setUploadOpen(false)}>
          <form className="grid gap-4" onSubmit={handleUpload}>
            <FormField label="Patient" name="patient_id" as="select" options={patientOptions} value={form.patient_id} onChange={handleChange} error={errors.patient_id} required />
            <label className="space-y-1.5">
              <span className="label">File</span>
              <input name="file" type="file" onChange={handleChange} className={`field ${errors.file ? "border-rose-300 focus:border-rose-500 focus:ring-rose-100" : ""}`} accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx" />
              {errors.file ? <span className="text-xs font-medium text-rose-600">{errors.file}</span> : null}
            </label>
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setUploadOpen(false)}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Uploading..." : "Upload"}</button>
            </div>
          </form>
        </Modal>
      )}

      {viewing && (
        <Modal title="Medical Record" onClose={() => setViewing(null)}>
          <div className="space-y-5">
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Record Summary</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950">{viewing.file_name}</h2>
                </div>
                <div className="text-sm text-slate-500 sm:text-right">
                  <p className="font-bold text-slate-900">Record #{viewing.id}</p>
                  <p>{formatDate(viewing.created_at)}</p>
                </div>
              </div>
              <div className="grid gap-4 py-4 text-sm sm:grid-cols-2">
                <p><span className="font-bold text-slate-900">Patient:</span> {patientMap[viewing.patient_id] || viewing.patient_id}</p>
                <p><span className="font-bold text-slate-900">Type:</span> {readableFileType(viewing.file_type)}</p>
                <p><span className="font-bold text-slate-900">Uploaded By:</span> User #{viewing.uploaded_by}</p>
                <p><span className="font-bold text-slate-900">Path:</span> {viewing.file_path}</p>
              </div>
              <div className="flex justify-end">
                <a className="btn-secondary" href={fileUrl(viewing.file_path)} target="_blank" rel="noreferrer">Open File</a>
              </div>
            </section>
            {isPdf(viewing) ? (
              <iframe title={viewing.file_name} src={fileUrl(viewing.file_path)} className="h-[520px] w-full rounded-lg border border-slate-200" />
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">
                Preview is available for PDF files. Open this file in a new tab to view it.
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
