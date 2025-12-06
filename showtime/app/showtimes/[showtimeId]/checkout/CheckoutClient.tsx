"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CheckoutClientProps = {
  showtimeId: number;
  ticketCount: number;
  totalAmount: number;
  seatLabels: string[];
  seatIds: number[];
};

export default function CheckoutClient({
  showtimeId,
  ticketCount,
  totalAmount,
  seatLabels,
  seatIds,
}: CheckoutClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [status, setStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lockToAccountEmail, setLockToAccountEmail] = useState(false);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [monthError, setMonthError] = useState<string | null>(null);
  const [yearError, setYearError] = useState<string | null>(null);
  const [cvvError, setCvvError] = useState<string | null>(null);

  // Prefer the logged-in user's email for safety and consistency.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("showtimeUserEmail");
    if (stored) {
      setEmail(stored);
      setLockToAccountEmail(true);
    }
  }, []);

  const handleCompletePurchase = async () => {
    // Make sure clicks always trigger our own validation / logic.
    console.log("[Checkout] Complete purchase clicked");

    // Reset field-level errors before validating.
    setEmailError(null);
    setNameError(null);
    setCardError(null);
    setMonthError(null);
    setYearError(null);
    setCvvError(null);
    setError(null);

    let hasError = false;

    // Basic validation with clear messages under each field
    if (!email) {
      setEmailError("Please enter the email address for ticket delivery.");
      hasError = true;
    }
    if (!nameOnCard) {
      setNameError("Please enter the name on the card.");
      hasError = true;
    }
    const normalizedCard = cardNumber.replace(/\s+/g, "");
    if (!/^\d{16}$/.test(normalizedCard)) {
      setCardError("Please enter a 16‑digit card number (mock data is fine).");
      hasError = true;
    }
    if (!/^\d{2}$/.test(expMonth)) {
      setMonthError("Enter month as MM.");
      hasError = true;
    } else {
      const monthNum = Number(expMonth);
      if (monthNum < 1 || monthNum > 12) {
        setMonthError("Month must be between 01 and 12.");
        hasError = true;
      }
    }

    const current = new Date();
    const currentYearYY = current.getFullYear() % 100;
    const currentMonth = current.getMonth() + 1;

    if (!/^\d{2}$/.test(expYear)) {
      setYearError("Enter year as YY.");
      hasError = true;
    } else {
      const yearNum = Number(expYear);
      const monthNum = Number(expMonth || "0");
      if (
        yearNum < currentYearYY ||
        (yearNum === currentYearYY && monthNum < currentMonth)
      ) {
        setYearError("Expiration date must be in the future.");
        hasError = true;
      }
    }

    if (!/^\d{3}$/.test(cvv)) {
      setCvvError("Please enter a 3‑digit CVV.");
      hasError = true;
    }

    if (ticketCount === 0) {
      setError(
        "We couldn\u2019t detect any selected tickets. Go back and pick seats.",
      );
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setStatus("processing");
    setError(null);

    try {
      const response = await fetch("http://localhost:8000/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          showtime_id: showtimeId,
          email,
          // Seat IDs are optional for now; if we have them we send them;
          // otherwise the backend will still create a booking without
          // booking_seat rows.
          seat_ids: seatIds ?? [],
          total_amount: totalAmount,
          payment_method: "Credit Card",
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend responded with ${response.status}`);
      }

      const data: { booking_id: number } = await response.json();
      setBookingId(data.booking_id);
      setStatus("success");

      const seatsParam = encodeURIComponent(seatLabels.join(","));
      const emailParam = encodeURIComponent(email);
      const totalParam = totalAmount.toFixed(2);

      router.push(
        `/showtimes/${showtimeId}/confirmation?bookingId=${data.booking_id}&seats=${seatsParam}&total=${totalParam}&email=${emailParam}`,
      );
    } catch (err) {
      console.error("Checkout failed", err);
      setStatus("error");
      setError(
        "We couldn\u2019t complete your booking. Please check your details and try again.",
      );
    }
  };

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      {/* Ticket delivery + payment form */}
      <form
        // Prevent default browser form submission; we handle everything in
        // `handleCompletePurchase` so that clicks are never blocked.
        onSubmit={(event) => event.preventDefault()}
        className="space-y-8 rounded-3xl border border-[#708993]/35 bg-[#19183B]/70 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
      >
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Ticket delivery</h2>
          <p className="text-xs text-[#708993]">
            We&apos;ll send your booking confirmation and QR codes to this
            address.
          </p>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#A1C2BD]">
              Email address
            </label>
            <input
              type="email"
              // We validate in JavaScript instead of using the browser's
              // built‑in `required` blocking, so the button always responds
              // to clicks and shows our own error message.
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={lockToAccountEmail}
              className="w-full rounded-lg border border-[#708993]/40 bg-[#1b1b3f] px-3 py-2 text-sm text-[#E7F2EF] outline-none ring-0 transition focus:border-[#A1C2BD]"
              placeholder="you@example.com"
            />
            {lockToAccountEmail && (
              <p className="text-[11px] text-[#708993]">
                Using your account email for this booking. To book with a
                different email, log out and sign in with that address first.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-4 border-t border-[#708993]/30 pt-6">
          <h2 className="text-lg font-semibold">Payment information</h2>
          <p className="text-xs text-[#708993]">
            Use a credit or debit card to confirm this booking.
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#A1C2BD]">
                Name on card
              </label>
              <input
                type="text"
                value={nameOnCard}
                onChange={(e) => setNameOnCard(e.target.value)}
                className="w-full rounded-lg border border-[#708993]/40 bg-[#1b1b3f] px-3 py-2 text-sm text-[#E7F2EF] outline-none focus:border-[#A1C2BD]"
                placeholder="Full name"
              />
              {nameError && (
                <p className="text-[11px] text-[#E54B4B]">{nameError}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#A1C2BD]">
                Card number
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full rounded-lg border border-[#708993]/40 bg-[#1b1b3f] px-3 py-2 text-sm text-[#E7F2EF] outline-none focus:border-[#A1C2BD]"
                placeholder="1234 5678 9012 3456"
              />
              {cardError && (
                <p className="text-[11px] text-[#E54B4B]">{cardError}</p>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#A1C2BD]">
                  Expiration month
                </label>
                <input
                  type="text"
                  value={expMonth}
                  onChange={(e) => setExpMonth(e.target.value)}
                  className="w-full rounded-lg border border-[#708993]/40 bg-[#1b1b3f] px-3 py-2 text-sm text-[#E7F2EF] outline-none focus:border-[#A1C2BD]"
                  placeholder="MM"
                />
                {monthError && (
                  <p className="text-[11px] text-[#E54B4B]">{monthError}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#A1C2BD]">
                  Expiration year
                </label>
                <input
                  type="text"
                  value={expYear}
                  onChange={(e) => setExpYear(e.target.value)}
                  className="w-full rounded-lg border border-[#708993]/40 bg-[#1b1b3f] px-3 py-2 text-sm text-[#E7F2EF] outline-none focus:border-[#A1C2BD]"
                  placeholder="YY"
                />
                {yearError && (
                  <p className="text-[11px] text-[#E54B4B]">{yearError}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-[#A1C2BD]">
                  CVV
                </label>
                <input
                  type="password"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  className="w-full rounded-lg border border-[#708993]/40 bg-[#1b1b3f] px-3 py-2 text-sm text-[#E7F2EF] outline-none focus:border-[#A1C2BD]"
                  placeholder="123"
                />
                {cvvError && (
                  <p className="text-[11px] text-[#E54B4B]">{cvvError}</p>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCompletePurchase}
            disabled={status === "processing"}
            className={`mt-4 flex w-full cursor-pointer items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition ${
              status === "processing"
                ? "cursor-wait bg-[#708993]/60 text-[#19183B]/80"
                : "bg-[#A1C2BD] text-[#19183B] hover:bg-[#A1C2BD]/90"
            }`}
          >
            {status === "processing"
              ? "Processing..."
              : status === "success"
                ? "Booking confirmed"
                : "Complete purchase"}
          </button>

          {status === "success" && bookingId !== null && (
            <p className="pt-2 text-center text-xs text-[#A1C2BD]">
              Booking #{bookingId} is confirmed. Your tickets and QR codes will
              be available in your account and by email.
            </p>
          )}

          {status === "error" && error && (
            <p className="pt-2 text-center text-xs text-[#E54B4B]">{error}</p>
          )}
        </section>
      </form>

      {/* Order summary */}
      <aside className="space-y-4 rounded-3xl border border-[#708993]/35 bg-[#19183B]/70 p-6 text-sm shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
        <h2 className="text-lg font-semibold">Order summary</h2>
        {ticketCount === 0 ? (
          <p className="text-xs text-[#708993]">
            No seats in your cart. Please go back and choose seats.
          </p>
        ) : (
          <>
            <div className="mt-2 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#A1C2BD]">Tickets</span>
                <span className="text-[#E7F2EF]">
                  {ticketCount} ticket{ticketCount > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#A1C2BD]">Seat selection</span>
                <span className="text-[#E7F2EF]">
                  {seatLabels.join(", ") || "N/A"}
                </span>
              </div>
            </div>

            <div className="mt-4 border-t border-[#708993]/30 pt-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#A1C2BD]">Subtotal</span>
                <span className="text-[#E7F2EF]">
                  ${totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#A1C2BD]">Booking fee</span>
                <span className="text-[#E7F2EF]">$0.00</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm font-semibold">
                <span className="text-[#E7F2EF]">Total</span>
                <span className="text-[#E7F2EF]">
                  ${totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
