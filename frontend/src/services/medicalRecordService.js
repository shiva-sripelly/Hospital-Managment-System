import { api } from "./api";

export const medicalRecordService = {
  list: (params) => api.get("/medical-records", { params }),
  get: (id) => api.get(`/medical-records/${id}`),
  upload: (patientId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/medical-records", formData, {
      params: { patient_id: patientId },
      headers: { "Content-Type": "multipart/form-data" }
    });
  },
  remove: (id) => api.delete(`/medical-records/${id}`)
};
