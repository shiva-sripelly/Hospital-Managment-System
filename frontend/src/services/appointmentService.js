import { api } from "./api";

export const appointmentService = {
  list: (params) => api.get("/appointments", { params }),
  get: (id) => api.get(`/appointments/${id}`),
  create: (payload) => api.post("/appointments", payload),
  update: (id, payload) => api.put(`/appointments/${id}`, payload),
  remove: (id) => api.delete(`/appointments/${id}`)
};
