import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import FormField from "../components/FormField";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { getApiError } from "../services/api";
import { authService } from "../services/authService";
import { isDigitsOnly, isTodayOrPast, isValidEmail, todayDate } from "../utils/validation";

const initialForm = {
  full_name: "",
  email: "",
  phone: "",
  gender: "",
  dob: "",
  blood_group: "",
  address: "",
  emergency_contact: "",
  password: "",
  confirm_password: "",
  role: "patient",
  otp: ""
};

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" }
];

const bloodOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((value) => ({
  value,
  label: value
}));

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
    const nextValue = name === "otp"
      ? value.replace(/\D/g, "").slice(0, 6)
      : name === "phone"
        ? value.replace(/\D/g, "").slice(0, 20)
        : value;
    setForm((current) => ({ ...current, [name]: nextValue }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  function registrationPayload() {
    return {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone,
      gender: form.gender,
      dob: form.dob,
      blood_group: form.blood_group || null,
      address: form.address.trim() || null,
      emergency_contact: form.emergency_contact.trim() || null,
      password: form.password,
      role: form.role
    };
  }

  function validateBase() {
    const nextErrors = {};
    if (!form.full_name.trim()) nextErrors.full_name = "Full name is required";
    else if (form.full_name.trim().length < 2) nextErrors.full_name = "Full name must be at least 2 characters";
    if (!isValidEmail(form.email, true)) nextErrors.email = "Enter a valid email";
    if (!form.phone.trim()) nextErrors.phone = "Phone is required";
    else if (!isDigitsOnly(form.phone)) nextErrors.phone = "Phone must contain numbers only";
    else if (form.phone.length < 7 || form.phone.length > 20) nextErrors.phone = "Phone must be 7 to 20 digits";
    if (!form.gender) nextErrors.gender = "Gender is required";
    if (!form.dob) nextErrors.dob = "Date of birth is required";
    else if (!isTodayOrPast(form.dob)) nextErrors.dob = "Date of birth cannot be in the future";
    if (form.address && form.address.trim().length < 3) nextErrors.address = "Address must be at least 3 characters";
    if (form.emergency_contact && form.emergency_contact.trim().length < 2) nextErrors.emergency_contact = "Emergency contact is too short";
    if (!form.password || form.password.length < 8) nextErrors.password = "Password must be at least 8 characters";
    if (form.confirm_password !== form.password) nextErrors.confirm_password = "Passwords do not match";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function requestOtp(event) {
    event.preventDefault();
    if (!validateBase()) return;
    setLoading(true);
    try {
      await authService.requestRegistrationOtp(registrationPayload());
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
      await authService.verifyRegistration({ ...registrationPayload(), otp: form.otp });
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
      <section className="w-full max-w-3xl rounded-2xl bg-white p-8 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <p className="text-sm font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">Create account</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">Patient Registration</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Create your secure login and patient profile together.
        </p>
        <form className="mt-8 grid gap-4 sm:grid-cols-2" onSubmit={completeRegistration}>
          <FormField label="Full Name" name="full_name" value={form.full_name} onChange={handleChange} error={errors.full_name} required />
          <FormField label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} required />
          <FormField label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange} error={errors.phone} required />
          <FormField label="Gender" name="gender" as="select" options={genderOptions} value={form.gender} onChange={handleChange} error={errors.gender} required />
          <FormField label="Date of Birth" name="dob" type="date" max={todayDate()} value={form.dob} onChange={handleChange} error={errors.dob} required />
          <FormField label="Blood Group" name="blood_group" as="select" options={bloodOptions} value={form.blood_group} onChange={handleChange} />
          <div className="sm:col-span-2">
            <FormField label="Address" name="address" as="textarea" value={form.address} onChange={handleChange} error={errors.address} />
          </div>
          <div className="sm:col-span-2">
            <FormField label="Emergency Contact" name="emergency_contact" value={form.emergency_contact} onChange={handleChange} error={errors.emergency_contact} placeholder="Name and phone number" />
          </div>
          <FormField label="Password" name="password" type="password" value={form.password} onChange={handleChange} error={errors.password} required />
          <FormField label="Confirm Password" name="confirm_password" type="password" value={form.confirm_password} onChange={handleChange} error={errors.confirm_password} required />
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 sm:col-span-2">
            Account type: Patient
          </div>
          <button type="button" className="auth-secondary sm:col-span-2" onClick={requestOtp} disabled={loading}>
            {loading && !otpSent ? "Sending OTP..." : otpSent ? "Resend OTP" : "Click here to get OTP"}
          </button>
          {otpSent ? (
            <>
              <FormField label="OTP" name="otp" type="tel" value={form.otp} onChange={handleChange} error={errors.otp} required />
              <div className="flex items-end">
                <button type="submit" className="auth-primary w-full" disabled={loading || form.otp.length !== 6}>
                  {loading ? "Please wait..." : "Verify OTP & Register"}
                </button>
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:col-span-2">
                OTP expires in 10 minutes. Resend OTP if the code expires.
              </p>
            </>
          ) : null}
          <Link to="/login" className="auth-secondary sm:col-span-2">
            Back to Login
          </Link>
        </form>
      </section>
    </main>
  );
}
