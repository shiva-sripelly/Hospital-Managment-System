import React, { useEffect, useMemo, useState } from "react";
import DataTable from "../components/DataTable";
import LoadingSpinner from "../components/LoadingSpinner";
import PageHeader from "../components/PageHeader";
import { useToast } from "../hooks/useToast";
import { getApiError } from "../services/api";
import { inventoryService } from "../services/pharmacyService";

const actionLabels = {
  stock_in: "Stock In",
  stock_out: "Stock Out",
  sale: "Sale",
  adjustment: "Adjustment"
};

export default function InventoryPage() {
  const [logs, setLogs] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const logColumns = useMemo(() => [
    { key: "medicine_id", label: "Medicine ID" },
    { key: "action_type", label: "Action", render: (row) => actionLabels[row.action_type] || row.action_type },
    { key: "quantity", label: "Quantity" },
    { key: "remarks", label: "Remarks" },
    { key: "created_at", label: "Date", render: (row) => new Date(row.created_at).toLocaleString() }
  ], []);
  const stockColumns = useMemo(() => [
    { key: "medicine_code", label: "Code" },
    { key: "medicine_name", label: "Medicine" },
    { key: "stock_quantity", label: "Stock" },
    { key: "expiry_date", label: "Expiry" }
  ], []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [logsResponse, lowStockResponse] = await Promise.all([
          inventoryService.logs({ limit: 100 }),
          inventoryService.lowStock({ threshold: 10 })
        ]);
        setLogs(logsResponse.data);
        setLowStock(lowStockResponse.data);
      } catch (error) {
        showToast(getApiError(error, "Failed to load inventory"), "error");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory Management" description="Track stock movement and low stock alerts." />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel p-4"><p className="label">Inventory Logs</p><p className="mt-2 text-2xl font-bold">{logs.length}</p></div>
        <div className="panel p-4"><p className="label">Low Stock Alerts</p><p className="mt-2 text-2xl font-bold text-amber-600">{lowStock.length}</p></div>
      </div>
      {loading ? <LoadingSpinner label="Loading inventory" /> : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">Low Stock</h2>
            <DataTable columns={stockColumns} data={lowStock} emptyText="No low stock medicines" />
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950 dark:text-slate-50">Inventory Logs</h2>
            <DataTable columns={logColumns} data={logs} emptyText="No inventory logs found" />
          </section>
        </>
      )}
    </div>
  );
}
