import { api } from "./api";

export const reportsService = {
  revenue: (params) => api.get("/reports/revenue", { params }),
  patientSummary: (params) => api.get("/reports/patient-summary", { params }),
  doctorPerformance: (params) => api.get("/reports/doctor-performance", { params }),
  inventory: (params) => api.get("/reports/inventory-report", { params }),
  exportReport: (path, exportType) => api.get(path, {
    params: { export: exportType },
    responseType: "blob"
  })
};
