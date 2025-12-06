import Link from "next/link";
import type { RowDataPacket } from "mysql2";

import db from "@/lib/db";
import BookingQr from "./BookingQr";

type ConfirmationPageParams = {
  showtimeId: string;
};

type ConfirmationSearchParams = {
  bookingId?: string;
  seats?: string;
  total?: string;
  email?: string;
};

type ShowtimeSummary = {
  movieTitle: string;
  theaterName: string;
  cityName: string;
  state: string | null;
  startTime: string;
};

async function getShowtimeSummary(
  showtimeId: number,
): Promise<ShowtimeSummary | null> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
      SELECT
        tm.title        AS movieTitle,
        th.theater_name AS theaterName,
        c.city_name     AS cityName,
        c.state         AS state,
        st.start_time   AS startTime
      FROM showtime st
      JOIN tmdb_movies tm ON tm.tmdb_id = st.tmdb_id
      JOIN screen sc      ON sc.screen_id = st.screen_id
      JOIN theater th     ON th.theater_id = sc.theater_id
      JOIN city c         ON c.city_id = th.city_id
      WHERE st.showtime_id = ?
      LIMIT 1;
    `,
    [showtimeId],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    movieTitle: String(row.movieTitle),
    theaterName: String(row.theaterName),
    cityName: String(row.cityName),
    state: row.state ? String(row.state) : null,
    startTime: new Date(row.startTime as any).toISOString(),
  };
}

function formatShowtimeLabel(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<ConfirmationPageParams>;
  searchParams: Promise<ConfirmationSearchParams>;
}) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;

  const showtimeId = Number.parseInt(resolvedParams.showtimeId, 10);
  if (!Number.isFinite(showtimeId)) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 text-[#E7F2EF]">
        <p className="text-sm text-[#708993]">Invalid showtime.</p>
      </main>
    );
  }

  const summary = await getShowtimeSummary(showtimeId);
  if (!summary) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 text-[#E7F2EF]">
        <p className="text-sm text-[#708993]">
          We couldn&apos;t find this showtime. It may have been removed.
        </p>
      </main>
    );
  }

  const bookingId = resolvedSearch.bookingId ?? "—";
  const seats = (resolvedSearch.seats ?? "").split(",").filter(Boolean);
  const total = resolvedSearch.total ?? "";
  const email = resolvedSearch.email ?? "";

  const showtimeLabel = formatShowtimeLabel(summary.startTime);

  const seatsLabel = seats.length > 0 ? seats.join(", ") : "N/A";

  // Encode booking details as JSON so scanners display text but do not try to
  // treat it as a maps URL or navigation intent.
  const qrValue = JSON.stringify({
    bookingId,
    movie: summary.movieTitle,
    theatre: summary.theaterName,
    city: summary.cityName,
    state: summary.state,
    time: showtimeLabel,
    seats: seatsLabel,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#19183B] via-[#1a1a3d] to-[#1b1b3f] text-[#E7F2EF]">
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 md:px-6 lg:px-8">
        <section className="grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#A1C2BD]">
                  Booking confirmed
                </p>
                <h1 className="mt-1 text-2xl font-semibold md:text-3xl">
                  You&apos;re all set for {summary.movieTitle}
                </h1>
                <p className="mt-2 text-sm text-[#708993]">
                  {summary.theaterName} · {summary.cityName}
                  {summary.state ? `, ${summary.state}` : ""} · {showtimeLabel}
                </p>
                <p className="mt-1 text-sm text-[#708993]">
                  We&apos;ve reserved your seats and recorded this booking in the
                  database. A confirmation can be sent to your email address.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/home"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-[#A1C2BD] px-4 py-1.5 text-xs font-semibold shadow-[0_10px_30px_rgba(161,194,189,0.4)] transition hover:bg-[#8FB3AD]"
                  style={{ color: "#19183B" }}
                >
                  Back to home
                </Link>
              </div>
            </div>

            <div className="mt-4 space-y-3 rounded-2xl border border-[#708993]/30 bg-[#19183B]/70 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#A1C2BD]">Booking ID</span>
                <span className="font-semibold text-[#E7F2EF]">
                  {bookingId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#A1C2BD]">Seats</span>
                <span className="font-semibold text-[#E7F2EF]">
                  {seats.length > 0 ? seats.join(", ") : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#A1C2BD]">Total paid</span>
                <span className="font-semibold text-[#E7F2EF]">
                  {total ? `$${total}` : "—"}
                </span>
              </div>
              {email && (
                <div className="flex items-center justify-between">
                  <span className="text-[#A1C2BD]">Tickets sent to</span>
                  <span className="font-semibold text-[#E7F2EF]">{email}</span>
                </div>
              )}
            </div>
          </div>

          <aside className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-[#708993]/35 bg-[#19183B]/70 p-6 text-sm shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
            <BookingQr value={qrValue} />
            <p className="text-center text-xs text-[#708993]">
              This QR code encodes your booking reference so it can be scanned
              quickly at the theatre entrance.
            </p>
          </aside>
        </section>
      </main>
    </div>
  );
}
