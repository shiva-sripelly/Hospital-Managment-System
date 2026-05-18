import React from "react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, Mail, Stethoscope } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { getApiError } from "../services/api";

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { isAuthenticated, login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  function validate() {
    const nextErrors = {};
    if (!isEmail(form.email)) nextErrors.email = "Enter a valid email address";
    if (!form.password) nextErrors.password = "Password is required";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login({ email: form.email, password: form.password });
      showToast("Login successful", "success");
      navigate("/", { replace: true });
    } catch (error) {
      showToast(getApiError(error, "Login failed"), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-soft lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex min-h-[420px] flex-col justify-between bg-brand-600 p-8 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold">HMS</p>
              <p className="text-sm text-brand-100">Care Operations</p>
            </div>
          </div>
          <div>
            <h1 className="max-w-sm text-4xl font-bold leading-tight">Hospital workflows, one clean command center.</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-brand-100">
              Manage patients, doctors, appointments, and operational stats from a single light workspace.
            </p>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-wide text-brand-600">Welcome back</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-950">Sign in</h2>
          </div>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="space-y-1.5">
              <span className="label">Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className={`field pl-9 ${errors.email ? "border-rose-300" : ""}`}
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="admin@example.com"
                />
              </div>
              {errors.email ? <span className="text-xs font-medium text-rose-600">{errors.email}</span> : null}
            </label>
            <label className="space-y-1.5">
              <span className="label">Password</span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className={`field pl-9 pr-10 ${errors.password ? "border-rose-300" : ""}`}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="password123"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password ? <span className="text-xs font-medium text-rose-600">{errors.password}</span> : null}
            </label>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </button>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Link to="/register" className="btn-secondary flex-1">
                Register
              </Link>
              <Link to="/forgot-password" className="btn-secondary flex-1">
                Forgot Password
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

