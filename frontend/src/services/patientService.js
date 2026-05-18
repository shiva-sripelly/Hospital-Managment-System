import { api } from "./api";

export const patientService = {
  list: (params) => api.get("/patients", { params }),
  get: (id) => api.get(`/patients/${id}`),
  create: (payload) => api.post("/patients", payload),
  update: (id, payload) => api.put(`/patients/${id}`, payload),
  remove: (id) => api.delete(`/patients/${id}`)
};
