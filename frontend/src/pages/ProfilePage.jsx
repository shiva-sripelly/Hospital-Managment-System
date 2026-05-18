import React, { useEffect, useState } from "react";
import { Edit3, Mail, ShieldCheck, UserCircle2 } from "lucide-react";
import FormField from "../components/FormField";
import LoadingSpinner from "../components/LoadingSpinner";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { authService } from "../services/authService";
import { getApiError } from "../services/api";
import { isValidEmail } from "../utils/validation";

export default function ProfilePage() {
  const { user, updateStoredUser } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState(user);
  const [form, setForm] = useState({ full_name: user?.full_name || "", email: user?.email || "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(!user);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data } = await authService.profile();
        setProfile(data);
        setForm({ full_name: data.full_name || "", email: data.email || "" });
        updateStoredUser(data);
      } catch (error) {
        showToast(getApiError(error, "Failed to load profile"), "error");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
  }

  function validate() {
    const nextErrors = {};
    if (!form.full_name.trim()) nextErrors.full_name = "Full name is required";
    else if (form.full_name.trim().length < 2) nextErrors.full_name = "Full name must be at least 2 characters";
    if (!isValidEmail(form.email, true)) nextErrors.email = "Enter a valid email";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const { data } = await authService.updateProfile({
        full_name: form.full_name,
        email: form.email
      });
      setProfile(data);
      updateStoredUser(data);
      setEditing(false);
      showToast("Profile updated", "success");
    } catch (error) {
      showToast(getApiError(error, "Failed to update profile"), "error");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setForm({ full_name: profile?.full_name || "", email: profile?.email || "" });
    setErrors({});
    setEditing(false);
  }

  if (loading) return <LoadingSpinner label="Loading profile" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="View and update your account information."
        action={
          !editing ? (
            <button type="button" className="btn-primary" onClick={() => setEditing(true)}>
              <Edit3 className="h-4 w-4" /> Edit Profile
            </button>
          ) : null
        }
      />

      <section className="panel overflow-hidden">
        <div className="border-b border-slate-200 bg-brand-50 px-6 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-brand-600 text-white shadow-sm">
              <UserCircle2 className="h-12 w-12" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-950">{profile?.full_name}</h2>
              <p className="mt-1 text-sm font-medium capitalize text-slate-500">{profile?.role}</p>
            </div>
          </div>
        </div>

        {editing ? (
          <form className="grid gap-4 p-6 sm:grid-cols-2" onSubmit={handleSubmit}>
            <FormField label="Full Name" name="full_name" value={form.full_name} onChange={handleChange} error={errors.full_name} required />
            <FormField label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} required />
            <div className="flex justify-end gap-3 sm:col-span-2">
              <button type="button" className="btn-secondary" onClick={cancelEdit}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save Profile"}</button>
            </div>
          </form>
        ) : (
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3 text-slate-500">
                <UserCircle2 className="h-5 w-5 text-brand-600" />
                <span className="text-xs font-bold uppercase">Full Name</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-950">{profile?.full_name}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3 text-slate-500">
                <Mail className="h-5 w-5 text-brand-600" />
                <span className="text-xs font-bold uppercase">Email</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-950">{profile?.email}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3 text-slate-500">
                <ShieldCheck className="h-5 w-5 text-brand-600" />
                <span className="text-xs font-bold uppercase">Role</span>
              </div>
              <p className="mt-2 text-sm font-semibold capitalize text-slate-950">{profile?.role}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3 text-slate-500">
                <ShieldCheck className="h-5 w-5 text-brand-600" />
                <span className="text-xs font-bold uppercase">Account Status</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-950">{profile?.is_active ? "Active" : "Inactive"}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
