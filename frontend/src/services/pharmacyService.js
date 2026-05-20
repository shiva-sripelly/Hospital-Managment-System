import { api } from "./api";

export const medicineService = {
  list: (params) => api.get("/medicines", { params }),
  get: (id) => api.get(`/medicines/${id}`),
  create: (payload) => api.post("/medicines", payload),
  update: (id, payload) => api.put(`/medicines/${id}`, payload),
  remove: (id) => api.delete(`/medicines/${id}`)
};

export const medicineSaleService = {
  list: (params) => api.get("/medicine-sales", { params }),
  get: (id) => api.get(`/medicine-sales/${id}`),
  create: (payload) => api.post("/medicine-sales", payload)
};

export const inventoryService = {
  logs: (params) => api.get("/inventory/logs", { params }),
  createLog: (payload) => api.post("/inventory/logs", payload),
  lowStock: (params) => api.get("/inventory/low-stock", { params })
};
