import { api } from "./api";

export const labTestService = {
  list: (params) => api.get("/lab-tests", { params }),
  get: (id) => api.get(`/lab-tests/${id}`),
  create: (payload) => api.post("/lab-tests", payload),
  update: (id, payload) => api.put(`/lab-tests/${id}`, payload),
  uploadReportFile: (id, formData) => api.post(`/lab-tests/${id}/report-file`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  }),
  remove: (id) => api.delete(`/lab-tests/${id}`)
};
