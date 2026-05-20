import React, { useEffect, useMemo, useState } from "react";
import DataTable from "../components/DataTable";
import ListControls from "../components/ListControls";
import LoadingSpinner from "../components/LoadingSpinner";
import PageHeader from "../components/PageHeader";
import { useToast } from "../hooks/useToast";
import { getApiError } from "../services/api";
import { auditService } from "../services/auditService";

const PAGE_SIZE = 10;

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const columns = useMemo(() => [
    { key: "created_at", label: "Date", render: (row) => new Date(row.created_at).toLocaleString() },
    { key: "user_id", label: "User ID" },
    { key: "action", label: "Action" },
    { key: "module_name", label: "Module" },
    { key: "description", label: "Description" }
  ], []);

  async function loadData(nextPage = page, moduleName = search) {
    setLoading(true);
    try {
      const { data } = await auditService.list({ skip: (nextPage - 1) * PAGE_SIZE, limit: PAGE_SIZE, module_name: moduleName || undefined });
      setLogs(data);
    } catch (error) {
      showToast(getApiError(error, "Failed to load audit logs"), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(1, ""); }, []);

  async function handleSearch(event) {
    event.preventDefault();
    setPage(1);
    await loadData(1, search);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="Review tracked create, update, and delete activity." />
      <ListControls search={search} setSearch={setSearch} onSearch={handleSearch} page={page} onPrevious={() => { setPage(page - 1); loadData(page - 1, search); }} onNext={() => { setPage(page + 1); loadData(page + 1, search); }} hasNext={logs.length === PAGE_SIZE} loading={loading} placeholder="Filter by module" />
      {loading ? <LoadingSpinner label="Loading audit logs" /> : <DataTable columns={columns} data={logs} emptyText="No audit logs found" />}
    </div>
  );
}
