import { api } from "./api";

export const prescriptionService = {
  list: (params) => api.get("/prescriptions", { params }),
  get: (id) => api.get(`/prescriptions/${id}`),
  create: (payload) => api.post("/prescriptions", payload),
  update: (id, payload) => api.put(`/prescriptions/${id}`, payload),
  remove: (id) => api.delete(`/prescriptions/${id}`)
};
