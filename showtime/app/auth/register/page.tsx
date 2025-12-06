"use client";

import Link from "next/link";
import { useState } from "react";

type FormState = {
  user_name: string;
  email: string;
  phone: string;
  password: string;
};

const initialState: FormState = {
  user_name: "",
  email: "",
  phone: "",
  password: "",
};

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ??
            Object.values<string[]>(data.errors ?? {})
              .flat()
              .join(", ") ??
            "Registration failed",
        );
        return;
      }

      setSuccess("Account created successfully. You can now log in.");
      setForm(initialState);
    } catch (err) {
      console.error(err);
      setError("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="mb-8 text-center">
        <span className="inline-flex items-center rounded-full border border-[#A1C2BD]/40 bg-[#A1C2BD]/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.3em] text-[#A1C2BD]">
          Showtime
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-[#E7F2EF]">
          Create your Showtime account
        </h1>
        <p className="mt-2 max-w-md text-sm text-[#708993]">
          Reserve seats at your favorite cinemas and keep every movie night organized.
        </p>
      </div>

      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#A1C2BD]/20 bg-[#19183B]/70 p-10 shadow-[0_20px_50px_rgba(161,194,189,0.15)] backdrop-blur-lg">
        <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[#A1C2BD]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-40 w-40 rounded-full bg-[#708993]/15 blur-3xl" />
        <h2 className="relative text-2xl font-semibold text-[#E7F2EF]">
          Create an account
        </h2>
        <form className="relative mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              className="block text-xs font-semibold uppercase tracking-wide text-[#708993]"
              htmlFor="user_name"
            >
              Name
            </label>
            <input
              id="user_name"
              name="user_name"
              type="text"
              required
              placeholder="Your full name"
            className="w-full rounded-xl border border-[#A1C2BD]/15 bg-[#19183B]/80 px-4 py-3 text-[#E7F2EF] shadow-inner transition focus:border-[#A1C2BD] focus:outline-none focus:ring-2 focus:ring-[#A1C2BD]/25"
              value={form.user_name}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <label
              className="block text-xs font-semibold uppercase tracking-wide text-[#708993]"
              htmlFor="email"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
            className="w-full rounded-xl border border-[#A1C2BD]/15 bg-[#19183B]/80 px-4 py-3 text-[#E7F2EF] shadow-inner transition focus:border-[#A1C2BD] focus:outline-none focus:ring-2 focus:ring-[#A1C2BD]/25"
              value={form.email}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <label
              className="block text-xs font-semibold uppercase tracking-wide text-[#708993]"
              htmlFor="phone"
            >
              Phone (10-digit)
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="Optional, 10 digits"
              pattern="[0-9]{10}"
              inputMode="numeric"
              maxLength={10}
            className="w-full rounded-xl border border-[#A1C2BD]/15 bg-[#19183B]/80 px-4 py-3 text-[#E7F2EF] shadow-inner transition focus:border-[#A1C2BD] focus:outline-none focus:ring-2 focus:ring-[#A1C2BD]/25"
              value={form.phone}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <label
              className="block text-xs font-semibold uppercase tracking-wide text-[#708993]"
              htmlFor="password"
            >
              Password
              <span className="ml-2 text-[10px] font-normal normal-case text-[#708993]">
                (min 8 characters, include a letter and a number)
              </span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              pattern="(?=.*[A-Za-z])(?=.*\d).{8,}"
              placeholder="At least 8 characters with letters and numbers"
            className="w-full rounded-xl border border-[#A1C2BD]/15 bg-[#19183B]/80 px-4 py-3 text-[#E7F2EF] shadow-inner transition focus:border-[#A1C2BD] focus:outline-none focus:ring-2 focus:ring-[#A1C2BD]/25"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-[#A1C2BD] px-4 py-3 text-sm font-semibold uppercase tracking-wide text-[#19183B] shadow-lg shadow-[#A1C2BD]/20 transition hover:bg-[#8FB3AD] focus:outline-none focus:ring-2 focus:ring-[#A1C2BD]/40 focus:ring-offset-2 focus:ring-offset-[#19183B] disabled:cursor-not-allowed disabled:opacity-75"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        {error ? (
          <p className="relative mt-4 rounded-lg border border-[#A1C2BD]/30 bg-[#A1C2BD]/10 px-4 py-2 text-sm text-[#E7F2EF]">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="relative mt-4 rounded-lg border border-[#A1C2BD]/25 bg-[#A1C2BD]/10 px-4 py-2 text-sm text-[#E7F2EF]">
            {success}
          </p>
        ) : null}

        <p className="relative mt-8 text-center text-sm text-[#708993]">
          Already have an account?{" "}
          <Link
            className="font-semibold text-[#A1C2BD] transition hover:text-[#8FB3AD]"
            href="/auth/login"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
