import { api } from "./api";

export const userService = {
  list: (params) => api.get("/users", { params }),
  update: (id, payload) => api.put(`/users/${id}`, payload),
  remove: (id) => api.delete(`/users/${id}`)
};
