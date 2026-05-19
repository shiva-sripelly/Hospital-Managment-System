import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import FormField from "../components/FormField";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { getApiError } from "../services/api";
import { authService } from "../services/authService";
import { isValidEmail } from "../utils/validation";

export default function ForgotPasswordPage() {
  const [form, setForm] = useState({ email: "", otp: "", new_password: "" });
  const [errors, setErrors] = useState({});
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function handleChange(event) {
    const { name, value } = event.target;
    const nextValue = name === "otp" ? value.replace(/\D/g, "").slice(0, 6) : value;
    setForm((current) => ({ ...current, [name]: nextValue }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  async function requestOtp(event) {
    event.preventDefault();
    if (!isValidEmail(form.email, true)) {
      setErrors({ email: "Enter a valid registered email" });
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPassword({ email: form.email });
      setOtpSent(true);
      showToast("Password reset OTP sent", "success");
    } catch (error) {
      showToast(getApiError(error, "Failed to send OTP"), "error");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!isValidEmail(form.email, true)) nextErrors.email = "Enter a valid registered email";
    if (form.otp.length !== 6) nextErrors.otp = "Enter the 6 digit OTP";
    if (!form.new_password || form.new_password.length < 8) nextErrors.new_password = "Password must be at least 8 characters";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      await authService.resetPassword(form);
      showToast("Password reset successful. Please login.", "success");
      navigate("/login", { replace: true });
    } catch (error) {
      showToast(getApiError(error, "Password reset failed"), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <section className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">Account recovery</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">Forgot Password</h1>
        <form className="mt-8 grid gap-4" onSubmit={otpSent ? resetPassword : requestOtp}>
          <FormField label="Registered Email" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} required />
          {otpSent ? (
            <>
              <FormField label="OTP" name="otp" type="tel" value={form.otp} onChange={handleChange} error={errors.otp} required />
              <FormField label="New Password" name="new_password" type="password" value={form.new_password} onChange={handleChange} error={errors.new_password} required />
            </>
          ) : null}
          <button type="submit" className="auth-primary" disabled={loading}>
            {loading ? "Please wait..." : otpSent ? "Reset Password" : "Send OTP"}
          </button>
          <Link to="/login" className="auth-secondary">
            Back to Login
          </Link>
        </form>
      </section>
    </main>
  );
}
