"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BookingSummary = {
  booking_id: number;
  movie_title: string;
  theater_name: string;
  city: string;
  state: string | null;
  start_time: string;
  seats: string | null;
  total_amount: string;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function BookingsPage() {
  const [email, setEmail] = useState("");
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [initialisedFromStorage, setInitialisedFromStorage] = useState(false);
  const [cancelLoadingId, setCancelLoadingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const lookup = async (targetEmail: string) => {
    setHasSearched(true);
    setError(null);
    setLoading(true);
    setBookings([]);

    try {
      const params = new URLSearchParams({ email: targetEmail });
      const response = await fetch(
        `http://localhost:8000/api/bookings?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(`Backend responded with ${response.status}`);
      }

      const data = (await response.json()) as BookingSummary[];
      setBookings(data);
    } catch (err) {
      console.error("Failed to load bookings", err);
      setError("We couldn't look up your bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async () => {
    if (!email) return;
    await lookup(email);
  };

  const handleCancelBooking = async (bookingId: number) => {
    setError(null);
    setCancelLoadingId(bookingId);
    try {
      const response = await fetch(
        `http://localhost:8000/api/bookings/${bookingId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error(`Backend responded with ${response.status}`);
      }

      // Optimistically remove from current list so the UI updates immediately.
      setBookings((prev) =>
        prev.filter((booking) => booking.booking_id !== bookingId),
      );
      setConfirmingId(null);
    } catch (err) {
      console.error("Failed to cancel booking", err);
      setError(
        "We couldn't cancel this booking. Please try again or refresh the page.",
      );
    } finally {
      setCancelLoadingId(null);
    }
  };

  // On first render, try to prefill email from login and auto-search.
  useEffect(() => {
    if (typeof window === "undefined" || initialisedFromStorage) return;
    setInitialisedFromStorage(true);
    const stored = window.localStorage.getItem("showtimeUserEmail");
    if (stored) {
      setEmail(stored);
      void lookup(stored);
    }
  }, [initialisedFromStorage]);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 md:px-6 lg:px-8 text-[#E7F2EF]">
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-[#A1C2BD]">
              Booking history
            </p>
            <h1 className="text-3xl font-semibold md:text-4xl">
              View your Showtime bookings
            </h1>
            <p className="max-w-2xl text-sm text-[#708993]">
              Enter the email address you used at checkout to see past and
              upcoming bookings. We&apos;ll match it against your confirmation
              emails.
            </p>
          </div>
          <Link
            href="/home"
            className="inline-flex items-center justify-center rounded-full bg-[#A1C2BD] px-5 py-2 text-sm font-semibold shadow-lg shadow-[#A1C2BD]/30 transition hover:bg-[#8FB3AD]"
            style={{ color: "#19183B" }}
          >
            Back to home
          </Link>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-full border border-[#708993]/40 bg-[#1b1b3f] px-4 py-2 text-sm text-[#E7F2EF] outline-none ring-0 transition focus:border-[#A1C2BD]"
          />
          <button
            type="button"
            onClick={handleLookup}
            disabled={loading || !email}
            className="inline-flex items-center justify-center rounded-full bg-[#A1C2BD] px-6 py-2 text-sm font-semibold text-[#19183B] shadow-lg shadow-[#A1C2BD]/20 transition hover:bg-[#8FB3AD] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Loading..." : "Find my bookings"}
          </button>
        </div>
        {error && (
          <p className="text-sm text-[#E54B4B]">
            {error}
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Results</h2>
        {!hasSearched ? (
          <p className="text-sm text-[#708993]">
            Enter your email above to see your booking history.
          </p>
        ) : bookings.length === 0 ? (
          <p className="text-sm text-[#708993]">
            We couldn&apos;t find any bookings for this email yet. Make sure
            you typed it correctly or try another address.
          </p>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <article
                key={booking.booking_id}
                className="flex flex-col gap-3 rounded-2xl border border-[#708993]/30 bg-[#19183B]/70 p-4 text-sm shadow-[0_16px_40px_rgba(0,0,0,0.35)] md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#A1C2BD]">
                    Booking #{booking.booking_id}
                  </p>
                  <h3 className="text-base font-semibold text-[#E7F2EF]">
                    {booking.movie_title}
                  </h3>
                  <p className="text-xs text-[#708993]">
                    {booking.theater_name} · {booking.city}
                    {booking.state ? `, ${booking.state}` : ""} ·{" "}
                    {formatDateTime(booking.start_time)}
                  </p>
                  <p className="text-xs text-[#A1C2BD]">
                    Seats:{" "}
                    <span className="text-[#E7F2EF]">
                      {booking.seats || "N/A"}
                    </span>
                  </p>
                </div>
                <div className="flex items-end justify-between gap-4 md:flex-col md:items-end">
                  <p className="text-xs text-[#A1C2BD]">
                    Total paid{" "}
                    <span className="ml-1 text-sm font-semibold text-[#E7F2EF]">
                      ${booking.total_amount}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setConfirmingId(booking.booking_id)}
                    className="inline-flex items-center justify-center rounded-full border border-[#E54B4B]/70 px-4 py-1.5 text-xs font-semibold text-[#E54B4B] transition hover:bg-[#E54B4B]/10"
                  >
                    Cancel booking
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {confirmingId !== null && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#19183B] p-6 text-sm shadow-xl border border-[#708993]/40">
            <h2 className="text-base font-semibold mb-2">
              Cancel this booking?
            </h2>
            <p className="mb-4 text-xs text-[#708993]">
              This will release the reserved seats so they can be booked again.
              You won&apos;t be able to undo this action from the app.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmingId(null)}
                className="rounded-full border border-[#708993]/40 px-4 py-1.5 text-xs font-medium text-[#A1C2BD] hover:border-[#A1C2BD] hover:text-[#E7F2EF]"
                disabled={cancelLoadingId !== null}
              >
                Keep booking
              </button>
              <button
                type="button"
                onClick={() =>
                  confirmingId !== null &&
                  handleCancelBooking(confirmingId as number)
                }
                disabled={cancelLoadingId !== null}
                className="rounded-full bg-[#E54B4B] px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-[#E54B4B]/30 transition hover:bg-[#c53a3a] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {cancelLoadingId === confirmingId
                  ? "Cancelling..."
                  : "Yes, cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
