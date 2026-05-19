import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import FormField from "../components/FormField";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { getApiError } from "../services/api";
import { authService } from "../services/authService";
import { isValidEmail } from "../utils/validation";

const initialForm = {
  full_name: "",
  email: "",
  password: "",
  role: "",
  otp: ""
};

const roleOptions = [
  { value: "doctor", label: "Doctor" },
  { value: "lab_technician", label: "Lab Technician" },
  { value: "receptionist", label: "Receptionist" },
  { value: "patient", label: "Patient" }
];

export default function RegisterPage() {
  const [form, setForm] = useState(initialForm);
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

  function validateBase() {
    const nextErrors = {};
    if (!form.full_name.trim()) nextErrors.full_name = "Full name is required";
    if (!isValidEmail(form.email, true)) nextErrors.email = "Enter a valid email";
    if (!form.password || form.password.length < 8) nextErrors.password = "Password must be at least 8 characters";
    if (!form.role) nextErrors.role = "Role is required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function requestOtp(event) {
    event.preventDefault();
    if (!validateBase()) return;
    setLoading(true);
    try {
      await authService.requestRegistrationOtp({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role: form.role
      });
      setOtpSent(true);
      showToast("OTP sent to your email", "success");
    } catch (error) {
      showToast(getApiError(error, "Failed to send OTP"), "error");
    } finally {
      setLoading(false);
    }
  }

  async function completeRegistration(event) {
    event.preventDefault();
    if (!validateBase()) return;
    if (form.otp.length !== 6) {
      setErrors((current) => ({ ...current, otp: "Enter the 6 digit OTP" }));
      return;
    }
    setLoading(true);
    try {
      await authService.verifyRegistration(form);
      showToast("Registration successful. Please login.", "success");
      navigate("/login", { replace: true });
    } catch (error) {
      showToast(getApiError(error, "Registration failed"), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <section className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">Create account</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">Register</h1>
        <form className="mt-8 grid gap-4" onSubmit={completeRegistration}>
          <FormField label="Full Name" name="full_name" value={form.full_name} onChange={handleChange} error={errors.full_name} required />
          <FormField label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} required />
          <FormField label="Password" name="password" type="password" value={form.password} onChange={handleChange} error={errors.password} required />
          <FormField label="Register As" name="role" as="select" options={roleOptions} value={form.role} onChange={handleChange} error={errors.role} required />
          <button type="button" className="auth-secondary" onClick={requestOtp} disabled={loading}>
            {loading && !otpSent ? "Sending OTP..." : otpSent ? "Resend OTP" : "Click here to get OTP"}
          </button>
          {otpSent ? (
            <>
              <FormField label="OTP" name="otp" type="tel" value={form.otp} onChange={handleChange} error={errors.otp} required />
              <button type="submit" className="auth-primary" disabled={loading}>
                {loading ? "Please wait..." : "Verify OTP & Register"}
              </button>
            </>
          ) : null}
          <Link to="/login" className="auth-secondary">
            Back to Login
          </Link>
        </form>
      </section>
    </main>
  );
}
