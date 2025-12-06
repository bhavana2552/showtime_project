import Link from "next/link";
import type { RowDataPacket } from "mysql2";

import db from "@/lib/db";

type UpcomingShow = {
  showtimeId: number;
  title: string;
  posterUrl: string | null;
  theater: string;
  city: string;
  startTime: string;
  basePrice: number;
};

type CitySummary = {
  cityId: number;
  cityName: string;
  state: string | null;
};

async function getUpcomingShowtimes(): Promise<UpcomingShow[]> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
      SELECT
        st.showtime_id AS showtimeId,
        tm.title,
        tm.poster_url AS posterUrl,
        th.theater_name AS theater,
        c.city_name AS city,
        st.start_time AS startTime,
        st.base_price AS basePrice
      FROM showtime st
      JOIN tmdb_movies tm ON tm.tmdb_id = st.tmdb_id
      JOIN screen sc ON sc.screen_id = st.screen_id
      JOIN theater th ON th.theater_id = sc.theater_id
      JOIN city c ON c.city_id = th.city_id
      WHERE st.start_time >= NOW()
      ORDER BY st.start_time
      LIMIT 6;
    `,
  );

  return rows.map((row) => ({
    showtimeId: Number(row.showtimeId),
    title: String(row.title),
    posterUrl: row.posterUrl ? String(row.posterUrl) : null,
    theater: String(row.theater),
    city: String(row.city),
    startTime: new Date(row.startTime).toISOString(),
    basePrice: Number(row.basePrice),
  }));
}

async function getCitySummaries(): Promise<CitySummary[]> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
      SELECT
        c.city_id AS cityId,
        c.city_name AS cityName,
        c.state
      FROM city c
      ORDER BY c.city_name
      LIMIT 6;
    `,
  );

  return rows.map((row) => ({
    cityId: Number(row.cityId),
    cityName: String(row.cityName),
    state: row.state ? String(row.state) : null,
  }));
}

function formatDateTime(isoString: string) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [upcoming, cities] = await Promise.all([
    getUpcomingShowtimes(),
    getCitySummaries(),
  ]);

  const highlight = upcoming[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#19183B] via-[#1a1a3d] to-[#1b1b3f] text-[#E7F2EF]">
      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-12 md:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-[#A1C2BD]/15 bg-gradient-to-br from-[#19183B]/60 via-[#19183B]/80 to-[#19183B]/90 p-10 shadow-[0_30px_80px_rgba(161,194,189,0.15)]">
          <div className="flex justify-end">
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-full border border-[#708993]/40 px-5 py-2 text-sm font-medium text-[#A1C2BD] transition hover:border-[#A1C2BD] hover:text-[#E7F2EF]"
            >
              Sign out
            </Link>
          </div>
          <div className="mt-6 flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-4">
              <p className="text-xs uppercase tracking-[0.35em] text-[#A1C2BD]">
                Now Booking
              </p>
              <h1 className="font-display text-3xl md:text-5xl font-semibold leading-tight tracking-tight text-[#E7F2EF]">
                <span className="block md:inline-block">Reserve the</span>{" "}
                <span className="block md:inline-block bg-gradient-to-r from-[#E7F2EF] via-[#A1C2BD] to-[#E7F2EF] bg-clip-text text-transparent">
                  perfect screening
                </span>{" "}
                <span className="block md:inline-block">with tailored schedules</span>{" "}
                <span className="block md:inline-block">and</span>{" "}
                <span className="block md:inline-block bg-gradient-to-r from-[#A1C2BD] via-[#E7F2EF] to-[#A1C2BD] bg-clip-text text-transparent">
                  luxury seating.
                </span>
              </h1>
              <p className="text-sm text-[#708993]">
                Browse what's playing across your favorite cinemas. Choose formats, confirm seats, and keep bookings synced in one place.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/movies"
                  className="inline-flex items-center justify-center rounded-full bg-[#A1C2BD] px-6 py-2 text-sm font-semibold shadow-lg shadow-[#A1C2BD]/20 transition hover:bg-[#8FB3AD] text-[#19183B]"
                  style={{ color: "#19183B" }}
                >
                  Browse showtimes
                </Link>
                <Link
                  href="/bookings"
                  className="inline-flex items-center justify-center rounded-full border border-[#A1C2BD]/40 px-6 py-2 text-sm font-medium text-[#A1C2BD] transition hover:border-[#A1C2BD] hover:text-[#E7F2EF]"
                >
                  View my bookings
                </Link>
              </div>
            </div>
            {highlight ? (
              <div className="w-full max-w-sm space-y-3 rounded-3xl border border-[#A1C2BD]/20 bg-[#19183B]/60 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
                <p className="text-xs uppercase tracking-[0.25em] text-[#A1C2BD]">
                  Featured engagement
                </p>
                <h2 className="text-xl font-semibold text-[#E7F2EF]">{highlight.title}</h2>
                <p className="text-sm text-[#708993]">
                  {highlight.theater}, {highlight.city}
                </p>
                <p className="text-sm font-medium text-[#A1C2BD]">
                  {formatDateTime(highlight.startTime)} · from ${highlight.basePrice.toFixed(2)}
                </p>
                <Link
                  href={`/showtimes/${highlight.showtimeId}`}
                className="inline-flex items-center justify-center rounded-full bg-[#A1C2BD] px-4 py-2 text-sm font-semibold text-[#19183B] transition hover:bg-[#8FB3AD]"
                style={{ color: "#19183B" }}
                >
                  Reserve premium seats
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-[#E7F2EF]">Now booking</h2>
              <p className="text-sm text-[#708993]">
                Upcoming engagements across our theatres. Tap a title to inspect formats and seats.
              </p>
            </div>
            <Link
              href="/movies"
              className="ml-auto text-sm font-medium text-[#A1C2BD] hover:text-[#E7F2EF]"
            >
              See all listings →
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-[#708993]/30 bg-[#19183B]/50 p-6 text-[#708993]">
                We're syncing schedules. Please check back shortly for the latest showtimes.
              </div>
            ) : (
              upcoming.map((show) => (
                <Link
                  key={show.showtimeId}
                  href={`/showtimes/${show.showtimeId}`}
                  className="group overflow-hidden rounded-2xl border border-[#708993]/30 bg-[#19183B]/70 transition hover:border-[#A1C2BD]/60 hover:shadow-[0_20px_40px_rgba(161,194,189,0.15)]"
                >
                  {show.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={show.posterUrl}
                      alt={show.title}
                      className="h-72 w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-72 w-full items-center justify-center bg-[#19183B] text-[#708993]">
                      Poster unavailable
                    </div>
                  )}
                  <div className="space-y-1 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.25em] text-[#A1C2BD]">
                      Featured
                    </p>
                    <h3 className="text-lg font-semibold text-[#E7F2EF]">{show.title}</h3>
                    <p className="text-sm text-[#708993]">
                      {show.theater} · {show.city}
                    </p>
                    <p className="text-sm font-medium text-[#A1C2BD]">
                      {formatDateTime(show.startTime)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <article className="rounded-2xl border border-[#708993]/30 bg-[#19183B]/60 p-6">
            <h3 className="text-lg font-semibold text-[#E7F2EF]">Premium formats</h3>
            <p className="mt-2 text-sm text-[#708993]">
              Filter by IMAX, XD, Dolby, or recliner lounges.
            </p>
          </article>
          <article className="rounded-2xl border border-[#708993]/30 bg-[#19183B]/60 p-6">
            <h3 className="text-lg font-semibold text-[#E7F2EF]">Flexible bookings</h3>
            <p className="mt-2 text-sm text-[#708993]">
              Review tickets and resend confirmations in one tap.
            </p>
          </article>
          <article className="rounded-2xl border border-[#708993]/30 bg-[#19183B]/60 p-6">
            <h3 className="text-lg font-semibold text-[#E7F2EF]">Customer Support</h3>
            <p className="mt-2 text-sm text-[#708993]">
              Need group reservations or accessible seating? Our guest services team is ready to assist.
            </p>
          </article>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#E7F2EF]">Where we're playing</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((city) => (
              <div
                key={city.cityId}
                className="rounded-2xl border border-[#708993]/30 bg-[#19183B]/70 p-5"
              >
                <p className="text-sm uppercase tracking-[0.3em] text-[#A1C2BD]">
                  {city.state ?? "United States"}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[#E7F2EF]">{city.cityName}</h3>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
