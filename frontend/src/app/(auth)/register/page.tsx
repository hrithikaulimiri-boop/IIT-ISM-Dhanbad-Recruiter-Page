"use client";

import { useState } from "react";
import { Box, Button, Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { AxiosError } from "axios";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { companyCountries } from "@/lib/constants";

export default function RegisterPage() {
  const router = useRouter();
  const emptyContact = () => ({ name: "", designation: "", email: "", phone: "", company_name: "" });
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    company_name: "",
    street: "",
    city: "",
    country: "India",
    pincode: "",
    postal_address: "",
    phone: "",
    landline: "",
    company_website: "",
    company_social_media: "",
    company_established_year: "",
    contact_hr: { ...emptyContact(), designation: "Head of HR" },
    contact_2: emptyContact(),
    contact_3: emptyContact(),
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAutofillHR = () => {
    setForm((prev) => ({
      ...prev,
      contact_hr: {
        ...prev.contact_hr,
        name: prev.name,
        email: prev.email,
        phone: prev.phone,
      },
    }));
  };

  const handleCopyContact = (target: "contact_2" | "contact_3", source: "contact_hr" | "contact_2") => {
    const sourceData = source === "contact_hr" ? form.contact_hr : form.contact_2;
    setForm((prev) => ({
      ...prev,
      [target]: {
        ...sourceData,
      },
    }));
  };

  const normalizeWebsiteUrl = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const isWebsitePlausible = (raw: string) => {
    const u = normalizeWebsiteUrl(raw);
    try {
      const parsed = new URL(u);
      const host = parsed.hostname || "";
      if (!host) return false;
      // Allow real domains, localhost (dev), and numeric IPs
      if (host === "localhost" || host.endsWith(".local")) return true;
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
      return host.includes(".");
    } catch {
      return false;
    }
  };

  const contactOk = (c: { name: string; designation: string; email: string; phone: string }) =>
    c.name.trim().length > 0 &&
    c.designation.trim().length > 0 &&
    /^\S+@\S+\.\S+$/.test(c.email) &&
    c.phone.trim().length > 0;

  const contact3Ok =
    !form.contact_3.name.trim() && !form.contact_3.email.trim()
      ? true
      : contactOk(form.contact_3);

  const isFormValid =
    form.name.trim().length > 0 &&
    form.company_name.trim().length > 0 &&
    form.street.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.country.trim().length > 0 &&
    form.pincode.trim().length > 0 &&
    form.postal_address.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    /^\d{4}$/.test(form.company_established_year) &&
    isWebsitePlausible(form.company_website) &&
    /^\S+@\S+\.\S+$/.test(form.email) &&
    form.password.length >= 8 &&
    contactOk(form.contact_hr) &&
    contactOk(form.contact_2) &&
    contact3Ok;

  const getValidationError = () => {
    if (form.name.trim().length === 0) return "Contact name is required";
    if (form.email.trim().length === 0) return "Email is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Invalid email format";
    if (form.password.length < 8) return "Password must be at least 8 characters";
    if (form.company_name.trim().length === 0) return "Company name is required";
    if (form.street.trim().length === 0) return "Street is required";
    if (form.city.trim().length === 0) return "City is required";
    if (form.country.trim().length === 0) return "Country is required";
    if (form.pincode.trim().length === 0) return "Pincode is required";
    if (form.postal_address.trim().length === 0) return "Postal address is required";
    if (form.phone.trim().length === 0) return "Phone number is required";
    if (!/^\d{4}$/.test(form.company_established_year)) return "Establishment year must be exactly 4 digits (e.g. 1926)";
    if (!isWebsitePlausible(form.company_website)) return "Company website is invalid (e.g. company.com)";
    if (!contactOk(form.contact_hr)) return "Contact person 1 details are incomplete or email is invalid";
    if (!contactOk(form.contact_2)) return "Contact person 2 details are incomplete or email is invalid";
    if (!contact3Ok) return "Contact person 3 details are incomplete or email is invalid";
    return null;
  };

  const submit = async () => {
    setMessage("");
    setError("");

    const validationError = getValidationError();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const socialRaw = form.company_social_media.trim();
      const payload = {
        ...form,
        company_website: normalizeWebsiteUrl(form.company_website),
        company_social_media: socialRaw.includes("http") || socialRaw.includes(".")
          ? normalizeWebsiteUrl(socialRaw)
          : socialRaw,
        company_established_year: Number(form.company_established_year),
        contact_hr: {
          ...form.contact_hr,
          company_name: form.contact_hr.company_name.trim() || undefined,
        },
        contact_2: {
          ...form.contact_2,
          company_name: form.contact_2.company_name.trim() || undefined,
        },
        contact_3: {
          ...form.contact_3,
          name: form.contact_3.name.trim() || undefined,
          designation: form.contact_3.designation.trim() || undefined,
          email: form.contact_3.email.trim() || undefined,
          phone: form.contact_3.phone.trim() || undefined,
          company_name: form.contact_3.company_name.trim() || undefined,
        },
      };
      await api.post("/auth/register", payload);
      setMessage("Registration successful. You can now login.");
      setTimeout(() => router.push("/login"), 1000);
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
      const apiMessage = axiosErr.response?.data?.message;
      const validationErrors = axiosErr.response?.data?.errors;
      const firstValidationMessage = validationErrors
        ? Object.values(validationErrors).flat()[0]
        : undefined;

      const netMsg =
        axiosErr.code === "ERR_NETWORK" || !axiosErr.response
          ? "Cannot reach the API. Start the backend (php artisan serve on port 8000) and ensure NEXT_PUBLIC_API_BASE_URL matches."
          : undefined;
      setError(firstValidationMessage || apiMessage || netMsg || "Registration failed. Please check your details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
      <Paper sx={{ p: 4, width: "100%", maxWidth: 980 }}>
        <Stack spacing={2}>
          <Typography variant="h5">Recruiter Registration</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField required label="Contact Name" fullWidth inputProps={{ maxLength: 255 }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField required label="Email" fullWidth inputProps={{ maxLength: 255 }} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField required label="Password" type="password" fullWidth inputProps={{ maxLength: 128 }} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField required label="Company Name" fullWidth inputProps={{ maxLength: 255 }} value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField required label="Street" fullWidth inputProps={{ maxLength: 255 }} value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField required label="City" fullWidth inputProps={{ maxLength: 100 }} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                required
                select
                label="Country"
                fullWidth
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              >
                {companyCountries.map((country) => (
                  <MenuItem key={country} value={country}>{country}</MenuItem>
                ))}
          </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField required label="Pincode" fullWidth inputProps={{ maxLength: 20 }} value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField required label="Postal Address" fullWidth inputProps={{ maxLength: 500 }} value={form.postal_address} onChange={(e) => setForm({ ...form, postal_address: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField required label="Phone Number" fullWidth inputProps={{ maxLength: 20 }} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Landline (optional)" fullWidth inputProps={{ maxLength: 20 }} value={form.landline} onChange={(e) => setForm({ ...form, landline: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                required
                label="Company Website"
                fullWidth
                placeholder="https://company.com or company.com"
                helperText="https:// is added if missing. Localhost URLs are OK for testing."
                inputProps={{ maxLength: 255 }}
                value={form.company_website}
                onChange={(e) => setForm({ ...form, company_website: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Company Social Media (optional)" fullWidth inputProps={{ maxLength: 255 }} value={form.company_social_media} onChange={(e) => setForm({ ...form, company_social_media: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField required label="Year of Establishment" type="number" fullWidth value={form.company_established_year} onChange={(e) => setForm({ ...form, company_established_year: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle1" sx={{ mt: 1 }}>Contact persons (Head of HR required; two compulsory; third optional)</Typography>
              <Typography variant="body2" color="text.secondary">Use designation such as &quot;Head of HR&quot; or &quot;Chief Human Resources Officer&quot; for the HR lead.</Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: "center", mt: 1 }}>
                <Typography variant="subtitle2">1 — Head of HR (compulsory)</Typography>
                <Button size="small" variant="outlined" onClick={handleAutofillHR} sx={{ textTransform: 'none' }}>
                  Autofill from above registrant details
                </Button>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField required label="Name" fullWidth value={form.contact_hr.name} onChange={(e) => setForm({ ...form, contact_hr: { ...form.contact_hr, name: e.target.value } })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField required label="Designation" fullWidth value={form.contact_hr.designation} onChange={(e) => setForm({ ...form, contact_hr: { ...form.contact_hr, designation: e.target.value } })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Company name (if different)" fullWidth value={form.contact_hr.company_name} onChange={(e) => setForm({ ...form, contact_hr: { ...form.contact_hr, company_name: e.target.value } })} helperText="Leave blank to use registered company name" />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField required label="Phone" fullWidth value={form.contact_hr.phone} onChange={(e) => setForm({ ...form, contact_hr: { ...form.contact_hr, phone: e.target.value } })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField required label="Email" fullWidth value={form.contact_hr.email} onChange={(e) => setForm({ ...form, contact_hr: { ...form.contact_hr, email: e.target.value } })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: "center", mt: 1 }}>
                <Typography variant="subtitle2">2 — Second contact (compulsory)</Typography>
                <Button size="small" variant="outlined" onClick={() => handleCopyContact("contact_2", "contact_hr")} sx={{ textTransform: 'none' }}>
                  Copy from HR Lead
                </Button>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField required label="Name" fullWidth value={form.contact_2.name} onChange={(e) => setForm({ ...form, contact_2: { ...form.contact_2, name: e.target.value } })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField required label="Designation" fullWidth value={form.contact_2.designation} onChange={(e) => setForm({ ...form, contact_2: { ...form.contact_2, designation: e.target.value } })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Company name (if different)" fullWidth value={form.contact_2.company_name} onChange={(e) => setForm({ ...form, contact_2: { ...form.contact_2, company_name: e.target.value } })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField required label="Phone" fullWidth value={form.contact_2.phone} onChange={(e) => setForm({ ...form, contact_2: { ...form.contact_2, phone: e.target.value } })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField required label="Email" fullWidth value={form.contact_2.email} onChange={(e) => setForm({ ...form, contact_2: { ...form.contact_2, email: e.target.value } })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: "center", mt: 1 }}>
                <Typography variant="subtitle2">3 — Third contact (optional)</Typography>
                <Button size="small" variant="outlined" onClick={() => handleCopyContact("contact_3", "contact_2")} sx={{ textTransform: 'none' }}>
                  Copy from Second Contact
                </Button>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Name" fullWidth value={form.contact_3.name} onChange={(e) => setForm({ ...form, contact_3: { ...form.contact_3, name: e.target.value } })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Designation" fullWidth value={form.contact_3.designation} onChange={(e) => setForm({ ...form, contact_3: { ...form.contact_3, designation: e.target.value } })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Company name (if different)" fullWidth value={form.contact_3.company_name} onChange={(e) => setForm({ ...form, contact_3: { ...form.contact_3, company_name: e.target.value } })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Phone" fullWidth value={form.contact_3.phone} onChange={(e) => setForm({ ...form, contact_3: { ...form.contact_3, phone: e.target.value } })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Email" fullWidth value={form.contact_3.email} onChange={(e) => setForm({ ...form, contact_3: { ...form.contact_3, email: e.target.value } })} />
            </Grid>
          </Grid>
          {message ? <Typography color="success.main" align="center">{message}</Typography> : null}
          {error ? <Typography color="error" align="center">{error}</Typography> : null}
          <Button 
            variant="contained" 
            size="large"
            onClick={submit} 
            disabled={isSubmitting}
            sx={{ 
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1.1rem',
              boxShadow: '0 4px 14px 0 rgba(0,118,255,0.39)'
            }}
          >
            {isSubmitting ? "Submitting..." : "Create account"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
