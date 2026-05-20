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
import { inventoryService, medicineService, medicineSaleService } from "../services/pharmacyService";

const PAGE_SIZE = 10;
const emptyMedicine = { medicine_code: "", medicine_name: "", category: "", manufacturer: "", stock_quantity: "0", unit_price: "0", expiry_date: "" };

function money(value) {
  return Number(value || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" });
}

export default function PharmacyPage() {
  const [medicines, setMedicines] = useState([]);
  const [sales, setSales] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyMedicine);
  const { showToast } = useToast();

  const columns = useMemo(() => [
    { key: "medicine_code", label: "Code" },
    { key: "medicine_name", label: "Medicine" },
    { key: "category", label: "Category" },
    { key: "stock_quantity", label: "Stock" },
    { key: "unit_price", label: "Price", render: (row) => money(row.unit_price) },
    { key: "expiry_date", label: "Expiry" }
  ], []);

  const saleColumns = useMemo(() => [
    { key: "id", label: "Sale ID", render: (row) => `#${row.id}` },
    { key: "patient_id", label: "Patient ID" },
    { key: "total_amount", label: "Total", render: (row) => money(row.total_amount) },
    { key: "payment_status", label: "Status" }
  ], []);

  async function loadData(nextPage = page, nextSearch = search) {
    setLoading(true);
    try {
      const [medicineResponse, saleResponse, lowStockResponse] = await Promise.all([
        medicineService.list({ skip: (nextPage - 1) * PAGE_SIZE, limit: PAGE_SIZE, search: nextSearch || undefined }),
        medicineSaleService.list({ limit: 5 }),
        inventoryService.lowStock({ threshold: 10 })
      ]);
      setMedicines(medicineResponse.data);
      setSales(saleResponse.data);
      setLowStock(lowStockResponse.data);
    } catch (error) {
      showToast(getApiError(error, "Failed to load pharmacy data"), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(1, "");
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: ["stock_quantity", "unit_price"].includes(name) ? value.replace(/[^0-9.]/g, "") : value }));
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyMedicine);
    setModalOpen(true);
  }

  function openEdit(medicine) {
    setEditing(medicine);
    setForm({
      medicine_code: medicine.medicine_code || "",
      medicine_name: medicine.medicine_name || "",
      category: medicine.category || "",
      manufacturer: medicine.manufacturer || "",
      stock_quantity: String(medicine.stock_quantity || 0),
      unit_price: String(medicine.unit_price || 0),
      expiry_date: medicine.expiry_date || ""
    });
    setModalOpen(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    const payload = { ...form, stock_quantity: Number(form.stock_quantity || 0), unit_price: Number(form.unit_price || 0), expiry_date: form.expiry_date || null, medicine_code: form.medicine_code || null };
    try {
      if (editing) await medicineService.update(editing.id, payload);
      else await medicineService.create(payload);
      showToast(editing ? "Medicine updated" : "Medicine added", "success");
      setModalOpen(false);
      await loadData(page, search);
    } catch (error) {
      showToast(getApiError(error, "Failed to save medicine"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(`Delete ${row.medicine_name}?`)) return;
    try {
      await medicineService.remove(row.id);
      showToast("Medicine deleted", "success");
      await loadData(page, search);
    } catch (error) {
      showToast(getApiError(error, "Failed to delete medicine"), "error");
    }
  }

  async function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    await loadData(1, search);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Pharmacy Dashboard" description="Manage medicines, sales, and stock alerts." action={<button type="button" className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> Add Medicine</button>} />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel p-4"><p className="label">Medicines</p><p className="mt-2 text-2xl font-bold">{medicines.length}</p></div>
        <div className="panel p-4"><p className="label">Low Stock</p><p className="mt-2 text-2xl font-bold text-amber-600">{lowStock.length}</p></div>
        <div className="panel p-4"><p className="label">Recent Sales</p><p className="mt-2 text-2xl font-bold">{sales.length}</p></div>
      </div>
      <ListControls search={search} setSearch={setSearch} onSearch={handleSearch} page={page} onPrevious={() => { setPage(page - 1); loadData(page - 1, search); }} onNext={() => { setPage(page + 1); loadData(page + 1, search); }} hasNext={medicines.length === PAGE_SIZE} loading={loading} placeholder="Search medicines" />
      {loading ? <LoadingSpinner label="Loading pharmacy" /> : <DataTable columns={columns} data={medicines} emptyText="No medicines found" onEdit={openEdit} onDelete={handleDelete} />}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">Recent Medicine Sales</h2>
        <DataTable columns={saleColumns} data={sales} emptyText="No medicine sales found" />
      </section>
      {modalOpen && (
        <Modal title={editing ? "Edit Medicine" : "Add Medicine"} onClose={() => setModalOpen(false)}>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <FormField label="Medicine Code" name="medicine_code" value={form.medicine_code} onChange={handleChange} placeholder="Auto generated" />
            <FormField label="Medicine Name" name="medicine_name" value={form.medicine_name} onChange={handleChange} required />
            <FormField label="Category" name="category" value={form.category} onChange={handleChange} required />
            <FormField label="Manufacturer" name="manufacturer" value={form.manufacturer} onChange={handleChange} />
            <FormField label="Stock Quantity" name="stock_quantity" type="number" value={form.stock_quantity} onChange={handleChange} />
            <FormField label="Unit Price" name="unit_price" type="number" value={form.unit_price} onChange={handleChange} />
            <FormField label="Expiry Date" name="expiry_date" type="date" value={form.expiry_date} onChange={handleChange} />
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
