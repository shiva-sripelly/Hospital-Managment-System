import { api } from "./api";

export const staffService = {
  list: (params) => api.get("/staff", { params }),
  get: (id) => api.get(`/staff/${id}`),
  create: (payload) => api.post("/staff", payload),
  update: (id, payload) => api.put(`/staff/${id}`, payload),
  remove: (id) => api.delete(`/staff/${id}`)
};

export const payrollService = {
  list: (params) => api.get("/payroll", { params }),
  get: (id) => api.get(`/payroll/${id}`),
  generate: (payload) => api.post("/payroll/generate", payload)
};
