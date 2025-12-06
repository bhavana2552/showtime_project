"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const ADMIN_EMAIL = "bhavanaburugupally@gmail.com";

type City = {
  cityId: number;
  cityName: string;
  state: string | null;
};

type Theater = {
  theaterId: number;
  theaterName: string;
  cityId: number;
};

type Screen = {
  screenId: number;
  screenName: string | null;
  theaterId: number;
};

type Movie = {
  tmdbId: number;
  title: string;
};

type AdminOptionsResponse = {
  cities: City[];
  theaters: Theater[];
  screens: Screen[];
  movies: Movie[];
};

export default function AdminPage() {
  const [initialised, setInitialised] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>("");

  const [options, setOptions] = useState<AdminOptionsResponse | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [cityId, setCityId] = useState<number | "">("");
  const [theaterId, setTheaterId] = useState<number | "">("");
  const [screenId, setScreenId] = useState<number | "">("");
  const [tmdbId, setTmdbId] = useState<number | "">("");
  const [startDateTime, setStartDateTime] = useState<string>("");
  const [minDateTime, setMinDateTime] = useState<string>("");
  const [basePrice, setBasePrice] = useState<string>("");
  const [movieLanguage, setMovieLanguage] = useState<string>("English");
  const [movieFormat, setMovieFormat] = useState<string>("Standard");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (initialised) return;
    setInitialised(true);

    if (typeof window === "undefined") return;

    const storedEmail = window.localStorage.getItem("showtimeUserEmail") ?? "";
    setAdminEmail(storedEmail);

    const isAdminUser =
      storedEmail.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
    setIsAdmin(isAdminUser);

    if (!isAdminUser) {
      return;
    }

    const loadOptions = async () => {
      try {
        setLoadingOptions(true);
        setOptionsError(null);
        const res = await fetch("/api/admin/options");
        const data = (await res.json()) as AdminOptionsResponse;

        if (!res.ok) {
          throw new Error(
            (data as any)?.error ?? "Failed to load admin options",
          );
        }

        setOptions(data);
      } catch (err: any) {
        console.error(err);
        setOptionsError(err.message ?? "Failed to load admin options");
      } finally {
        setLoadingOptions(false);
      }
    };

    void loadOptions();
  }, [initialised]);

  const filteredTheaters = useMemo(() => {
    if (!options) return [];
    if (cityId === "") return options.theaters;
    return options.theaters.filter((t) => t.cityId === cityId);
  }, [options, cityId]);

  const filteredScreens = useMemo(() => {
    if (!options) return [];
    if (theaterId === "") return options.screens;
    return options.screens.filter((s) => s.theaterId === theaterId);
  }, [options, theaterId]);

  // Compute the minimum allowed datetime (today, current time) for the picker
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    setMinDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!options) {
      setSubmitError("Admin data not loaded yet.");
      return;
    }

    if (
      cityId === "" ||
      theaterId === "" ||
      screenId === "" ||
      tmdbId === "" ||
      !startDateTime ||
      !basePrice
    ) {
      setSubmitError("Please fill in all required fields.");
      return;
    }

    const numericPrice = Number(basePrice);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setSubmitError("Base price must be a positive number.");
      return;
    }

    // Convert datetime-local (YYYY-MM-DDTHH:MM) to MySQL DATETIME (YYYY-MM-DD HH:MM:SS)
    const mysqlDateTime = startDateTime.replace("T", " ") + ":00";

    try {
      setSubmitting(true);

      const res = await fetch("/api/admin/showtimes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminEmail,
          tmdbId: Number(tmdbId),
          screenId: Number(screenId),
          startTime: mysqlDateTime,
          basePrice: numericPrice,
          movieLanguage,
          movieFormat,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message =
          data?.error ??
          (data?.errors
            ? Object.values<string[]>(data.errors).flat().join(", ")
            : "Failed to create showtime");
        setSubmitError(message);
        return;
      }

      setSubmitSuccess(`Showtime created with ID ${data.showtimeId}.`);
      setStartDateTime("");
      setBasePrice("");
    } catch (err) {
      console.error(err);
      setSubmitError("Unexpected error while creating showtime.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isAdmin === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#19183B] text-[#E7F2EF]">
        <p className="text-sm text-[#708993]">Checking admin access…</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#19183B] text-[#E7F2EF]">
        <div className="max-w-md rounded-3xl border border-[#708993]/40 bg-[#19183B]/80 p-8 text-center shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
          <h1 className="text-2xl font-semibold">Admin access required</h1>
          <p className="mt-3 text-sm text-[#708993]">
            This page is restricted to the administrative account only. Sign in
            with <span className="font-mono">{ADMIN_EMAIL}</span> to manage
            showtimes.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/home"
              className="inline-flex items-center rounded-full border border-[#A1C2BD]/40 bg-[#A1C2BD] px-4 py-1.5 text-xs font-semibold shadow-lg shadow-[#A1C2BD]/20 transition hover:bg-[#8FB3AD]"
              style={{ color: "#19183B" }}
            >
              Back to home
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center rounded-full bg-[#A1C2BD] px-4 py-1.5 text-xs font-semibold transition hover:bg-[#8FB3AD]"
              style={{ color: "#19183B" }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#19183B] via-[#1a1a3d] to-[#1b1b3f] text-[#E7F2EF]">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Admin – Manage showtimes</h1>
            <p className="text-sm text-[#708993]">
              Signed in as{" "}
              <span className="font-mono text-[#A1C2BD]">{adminEmail}</span>.
              Use this panel to add new showtimes to existing screens and
              movies.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/home"
              className="inline-flex items-center rounded-full border border-[#708993]/40 px-4 py-1.5 text-xs font-medium text-[#A1C2BD] transition hover:border-[#A1C2BD] hover:text-[#E7F2EF]"
            >
              Back to home
            </Link>
            <Link
              href="/movies"
              className="inline-flex items-center rounded-full border border-[#708993]/40 px-4 py-1.5 text-xs font-medium text-[#A1C2BD] transition hover:border-[#A1C2BD] hover:text-[#E7F2EF]"
            >
              Browse by city
            </Link>
          </div>
        </header>

        <section className="rounded-3xl border border-[#708993]/40 bg-[#19183B]/70 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
          <h2 className="text-lg font-semibold">Add a new showtime</h2>
          <p className="mt-1 text-sm text-[#708993]">
            Choose a city, theatre, and screen, then attach an existing movie
            from TMDb and configure language, format, and base price.
          </p>

          {loadingOptions ? (
            <p className="mt-4 text-sm text-[#708993]">
              Loading cinema data for admin tools…
            </p>
          ) : optionsError ? (
            <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-100">
              {optionsError}
            </p>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[#708993]">
                    City
                  </label>
                  <select
                    className="w-full rounded-xl border border-[#A1C2BD]/20 bg-[#19183B]/80 px-3 py-2 text-sm text-[#E7F2EF] focus:border-[#A1C2BD] focus:outline-none focus:ring-2 focus:ring-[#A1C2BD]/25"
                    value={cityId}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCityId(value ? Number(value) : "");
                      setTheaterId("");
                      setScreenId("");
                    }}
                  >
                    <option value="">Select city</option>
                    {options?.cities.map((city) => (
                      <option key={city.cityId} value={city.cityId}>
                        {city.cityName}
                        {city.state ? `, ${city.state}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[#708993]">
                    Theatre
                  </label>
                  <select
                    className="w-full rounded-xl border border-[#A1C2BD]/20 bg-[#19183B]/80 px-3 py-2 text-sm text-[#E7F2EF] focus:border-[#A1C2BD] focus:outline-none focus:ring-2 focus:ring-[#A1C2BD]/25"
                    value={theaterId}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTheaterId(value ? Number(value) : "");
                      setScreenId("");
                    }}
                    disabled={!cityId}
                  >
                    <option value="">Select theatre</option>
                    {filteredTheaters.map((theater) => (
                      <option key={theater.theaterId} value={theater.theaterId}>
                        {theater.theaterName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[#708993]">
                    Screen
                  </label>
                  <select
                    className="w-full rounded-xl border border-[#A1C2BD]/20 bg-[#19183B]/80 px-3 py-2 text-sm text-[#E7F2EF] focus:border-[#A1C2BD] focus:outline-none focus:ring-2 focus:ring-[#A1C2BD]/25"
                    value={screenId}
                    onChange={(e) =>
                      setScreenId(e.target.value ? Number(e.target.value) : "")
                    }
                    disabled={!theaterId}
                  >
                    <option value="">Select screen</option>
                    {filteredScreens.map((screen) => (
                      <option key={screen.screenId} value={screen.screenId}>
                        {screen.screenName
                          ? `${screen.screenName} (ID ${screen.screenId})`
                          : `Screen ${screen.screenId}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[#708993]">
                    Movie
                  </label>
                  <select
                    className="w-full rounded-xl border border-[#A1C2BD]/20 bg-[#19183B]/80 px-3 py-2 text-sm text-[#E7F2EF] focus:border-[#A1C2BD] focus:outline-none focus:ring-2 focus:ring-[#A1C2BD]/25"
                    value={tmdbId}
                    onChange={(e) =>
                      setTmdbId(e.target.value ? Number(e.target.value) : "")
                    }
                  >
                    <option value="">Select movie</option>
                    {options?.movies.map((movie) => (
                      <option key={movie.tmdbId} value={movie.tmdbId}>
                        {movie.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[#708993]">
                    Date &amp; time
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-xl border border-[#A1C2BD]/20 bg-[#19183B]/80 px-3 py-2 text-sm text-[#E7F2EF] focus:border-[#A1C2BD] focus:outline-none focus:ring-2 focus:ring-[#A1C2BD]/25"
                    value={startDateTime}
                    onChange={(e) => setStartDateTime(e.target.value)}
                    min={minDateTime || undefined}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[#708993]">
                    Base price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-xl border border-[#A1C2BD]/20 bg-[#19183B]/80 px-3 py-2 text-sm text-[#E7F2EF] focus:border-[#A1C2BD] focus:outline-none focus:ring-2 focus:ring-[#A1C2BD]/25"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[#708993]">
                    Language
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-[#A1C2BD]/20 bg-[#19183B]/80 px-3 py-2 text-sm text-[#E7F2EF] focus:border-[#A1C2BD] focus:outline-none focus:ring-2 focus:ring-[#A1C2BD]/25"
                    value={movieLanguage}
                    onChange={(e) => setMovieLanguage(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-[#708993]">
                    Format
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-[#A1C2BD]/20 bg-[#19183B]/80 px-3 py-2 text-sm text-[#E7F2EF] focus:border-[#A1C2BD] focus:outline-none focus:ring-2 focus:ring-[#A1C2BD]/25"
                    value={movieFormat}
                    onChange={(e) => setMovieFormat(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 inline-flex items-center justify-center rounded-full bg-[#A1C2BD] px-6 py-2 text-sm font-semibold text-[#19183B] shadow-lg shadow-[#A1C2BD]/20 transition hover:bg-[#8FB3AD] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={submitting}
              >
                {submitting ? "Creating showtime…" : "Create showtime"}
              </button>

              {submitError ? (
                <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-100">
                  {submitError}
                </p>
              ) : null}

              {submitSuccess ? (
                <p className="mt-3 rounded-lg border border-[#A1C2BD]/40 bg-[#A1C2BD]/10 px-4 py-2 text-sm text-[#E7F2EF]">
                  {submitSuccess}
                </p>
              ) : null}
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
