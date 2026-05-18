import { api } from "./api";

export const doctorService = {
  list: (params) => api.get("/doctors", { params }),
  get: (id) => api.get(`/doctors/${id}`),
  create: (payload) => api.post("/doctors", payload),
  update: (id, payload) => api.put(`/doctors/${id}`, payload),
  remove: (id) => api.delete(`/doctors/${id}`)
};
