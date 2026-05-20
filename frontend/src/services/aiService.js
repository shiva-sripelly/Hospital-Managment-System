import { api } from "./api";

export const aiService = {
  patientRisk: (params) => api.get("/ai/patient-risk", { params }),
  recommendations: (params) => api.get("/ai/recommendation", { params })
};
