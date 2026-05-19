import { api } from "./api";

export const billingService = {
  list: (params) => api.get("/billing", { params }),
  get: (id) => api.get(`/billing/${id}`),
  create: (payload) => api.post("/billing", payload),
  update: (id, payload) => api.put(`/billing/${id}`, payload),
  remove: (id) => api.delete(`/billing/${id}`),
  invoiceUrl: (id) => `${api.defaults.baseURL}/billing/${id}/invoice`
};
