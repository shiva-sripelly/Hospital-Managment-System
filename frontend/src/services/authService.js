import { api } from "./api";

export const authService = {
  login: (payload) => api.post("/auth/login", payload),
  register: (payload) => api.post("/auth/register", payload),
  requestRegistrationOtp: (payload) => api.post("/auth/register/request-otp", payload),
  verifyRegistration: (payload) => api.post("/auth/register/verify", payload),
  forgotPassword: (payload) => api.post("/auth/forgot-password", payload),
  resetPassword: (payload) => api.post("/auth/reset-password", payload),
  changePassword: (payload) => api.post("/auth/change-password", payload),
  profile: () => api.get("/auth/profile"),
  updateProfile: (payload) => api.put("/auth/profile", payload)
};
