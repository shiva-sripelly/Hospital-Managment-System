import { api } from "./api";

export const auditService = {
  list: (params) => api.get("/audit-logs", { params })
};
