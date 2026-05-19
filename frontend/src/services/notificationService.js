import { api } from "./api";

export const notificationService = {
  list: (params) => api.get("/notifications", { params }),
  markRead: (id) => api.put(`/notifications/read/${id}`),
  websocketUrl: () => {
    const baseUrl = api.defaults.baseURL || window.location.origin;
    const wsBaseUrl = baseUrl.replace(/^http/, "ws");
    return `${wsBaseUrl}/notifications/ws`;
  }
};
