import { api } from "./api";

export const labTestService = {
  list: (params) => api.get("/lab-tests", { params }),
  get: (id) => api.get(`/lab-tests/${id}`),
  create: (payload) => api.post("/lab-tests", payload),
  update: (id, payload) => api.put(`/lab-tests/${id}`, payload),
  remove: (id) => api.delete(`/lab-tests/${id}`)
};
