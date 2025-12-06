import Link from "next/link";
import type { RowDataPacket } from "mysql2";

import db from "@/lib/db";

type ShowtimePageParams = {
  showtimeId: string;
};

type ShowtimePageSearchParams = {
  date?: string;
};

type MovieDetails = {
  tmdbId: number;
  title: string;
  overview: string | null;
  releaseDate: string | null;
  movieLanguage: string | null;
  rating: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  theaterId: number;
  theaterName: string;
  cityName: string;
  state: string | null;
};

type ShowDate = {
  isoDate: string; // YYYY-MM-DD
};

type ShowtimeSlot = {
  showtimeId: number;
  startTime: string; // ISO
  basePrice: number | null;
  movieLanguage: string | null;
  movieFormat: string | null;
};

async function getShowtimeContext(
  showtimeId: number,
): Promise<MovieDetails | null> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
      SELECT
        st.showtime_id           AS showtimeId,
        tm.tmdb_id               AS tmdbId,
        tm.title                 AS title,
        tm.overview              AS overview,
        tm.release_date          AS releaseDate,
        tm.movie_language        AS movieLanguage,
        tm.rating                AS rating,
        tm.poster_url            AS posterUrl,
        tm.backdrop_url          AS backdropUrl,
        th.theater_id            AS theaterId,
        th.theater_name          AS theaterName,
        c.city_name              AS cityName,
        c.state                  AS state
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
    tmdbId: Number(row.tmdbId),
    title: String(row.title),
    overview: row.overview ? String(row.overview) : null,
    releaseDate: row.releaseDate ? String(row.releaseDate) : null,
    movieLanguage: row.movieLanguage ? String(row.movieLanguage) : null,
    rating:
      row.rating === null || row.rating === undefined
        ? null
        : Number(row.rating),
    posterUrl: row.posterUrl ? String(row.posterUrl) : null,
    backdropUrl: row.backdropUrl ? String(row.backdropUrl) : null,
    theaterId: Number(row.theaterId),
    theaterName: String(row.theaterName),
    cityName: String(row.cityName),
    state: row.state ? String(row.state) : null,
  };
}

async function getAvailableDatesForMovieAtTheater(
  theaterId: number,
  tmdbId: number,
): Promise<ShowDate[]> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
      SELECT DISTINCT
        DATE(st.start_time) AS showDate
      FROM showtime st
      JOIN screen sc ON sc.screen_id = st.screen_id
      WHERE sc.theater_id = ?
        AND st.tmdb_id = ?
        -- Only show dates from Dec 2 onward
        AND DATE(st.start_time) >= '2025-12-02'
      ORDER BY showDate;
    `,
    [theaterId, tmdbId],
  );

  return rows
    .filter((row) => row.showDate)
    .map((row) => {
      const d = row.showDate as Date; // MySQL DATE → JS Date at local midnight
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return { isoDate: `${year}-${month}-${day}` }; // YYYY-MM-DD in local time
    });
}

async function getShowtimesForDate(
  theaterId: number,
  tmdbId: number,
  isoDate: string,
): Promise<ShowtimeSlot[]> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
      SELECT
        st.showtime_id    AS showtimeId,
        st.start_time     AS startTime,
        st.base_price     AS basePrice,
        st.movie_language AS movieLanguage,
        st.movie_format   AS movieFormat
      FROM showtime st
      JOIN screen sc ON sc.screen_id = st.screen_id
      WHERE sc.theater_id = ?
        AND st.tmdb_id = ?
        AND DATE(st.start_time) = ?
      ORDER BY st.start_time;
    `,
    [theaterId, tmdbId, isoDate],
  );

  return rows.map((row) => ({
    showtimeId: Number(row.showtimeId),
    startTime: new Date(row.startTime as any).toISOString(),
    basePrice:
      row.basePrice === null || row.basePrice === undefined
        ? null
        : Number(row.basePrice),
    movieLanguage: row.movieLanguage ? String(row.movieLanguage) : null,
    movieFormat: row.movieFormat ? String(row.movieFormat) : null,
  }));
}

function formatDateLabel(isoDate: string): { dayShort: string; fullLabel: string } {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d); // local date, avoids UTC shift
  const dayShort = date.toLocaleDateString("en-US", {
    weekday: "short",
  });

  const fullLabel = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });

  return { dayShort, fullLabel };
}

function formatTimeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export const dynamic = "force-dynamic";

export default async function ShowtimeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<ShowtimePageParams>;
  searchParams: Promise<ShowtimePageSearchParams>;
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

  const movieContext = await getShowtimeContext(showtimeId);

  if (!movieContext) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 text-[#E7F2EF]">
        <p className="text-sm text-[#708993]">
          We couldn&apos;t find this showtime. It may have been removed.
        </p>
      </main>
    );
  }

  const [availableDates, showtimesForSelected] = await (async () => {
    const dates = await getAvailableDatesForMovieAtTheater(
      movieContext.theaterId,
      movieContext.tmdbId,
    );

    if (dates.length === 0) {
      return [dates, [] as ShowtimeSlot[]] as const;
    }

    const requestedDate = resolvedSearch.date;
    const hasRequested =
      requestedDate && dates.some((d) => d.isoDate === requestedDate);

    const effectiveDate = hasRequested ? requestedDate! : dates[0].isoDate;

    const slots = await getShowtimesForDate(
      movieContext.theaterId,
      movieContext.tmdbId,
      effectiveDate,
    );

    return [dates, slots] as const;
  })();

  const selectedDate =
    resolvedSearch.date &&
    availableDates.some((d) => d.isoDate === resolvedSearch.date)
      ? resolvedSearch.date
      : availableDates[0]?.isoDate ?? null;

  const backHref = `/theatres/${movieContext.theaterId}`;

  const ratingText =
    movieContext.rating !== null
      ? `${movieContext.rating.toFixed(1)} TMDb rating`
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#19183B] via-[#1a1a3d] to-[#1b1b3f] text-[#E7F2EF]">
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 md:px-6 lg:px-8">
        {/* Movie hero */}
        <section className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="relative overflow-hidden rounded-3xl border border-[#708993]/40 bg-[#19183B]/70 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
            {movieContext.posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={movieContext.posterUrl}
                alt={movieContext.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-[#708993]">
                Poster unavailable
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#A1C2BD]">
                  Now booking at
                </p>
                <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
                  {movieContext.title}
                </h1>
                <p className="mt-2 text-sm text-[#708993]">
                  {movieContext.theaterName} &middot; {movieContext.cityName}
                  {movieContext.state ? `, ${movieContext.state}` : ""}
                </p>
              </div>
              <Link
                href={backHref}
                className="inline-flex items-center rounded-full border border-[#708993]/40 px-4 py-1.5 text-xs font-medium text-[#A1C2BD] transition hover:border-[#A1C2BD] hover:text-[#E7F2EF]"
              >
                Back to theatre
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[#A1C2BD]">
              {movieContext.movieLanguage && (
                <span className="rounded-full border border-[#708993]/40 px-3 py-1">
                  {movieContext.movieLanguage.toUpperCase()}
                </span>
              )}
              {movieContext.releaseDate && (
                <span className="rounded-full border border-[#708993]/40 px-3 py-1">
                  Released{" "}
                  {new Date(movieContext.releaseDate).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    },
                  )}
                </span>
              )}
              {ratingText && (
                <span className="rounded-full border border-[#708993]/40 px-3 py-1">
                  {ratingText}
                </span>
              )}
            </div>

            {movieContext.overview && (
              <p className="mt-2 text-sm leading-relaxed text-[#E7F2EF]/90">
                {movieContext.overview}
              </p>
            )}
          </div>
        </section>

        {/* Date selector and showtimes */}
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Select a date</h2>
              <p className="text-sm text-[#708993]">
                Choose a day to see available showtimes at this theatre.
              </p>
            </div>
          </div>

          {availableDates.length === 0 ? (
            <div className="rounded-2xl border border-[#708993]/30 bg-[#19183B]/60 p-6 text-sm text-[#708993]">
              We don&apos;t have any showtimes configured for this title at this
              theatre yet.
            </div>
          ) : (
            <>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {availableDates.map((date) => {
                  const isActive = selectedDate === date.isoDate;
                  const { fullLabel } = formatDateLabel(date.isoDate);

                  return (
                    <Link
                      key={date.isoDate}
                      href={`/showtimes/${showtimeId}?date=${date.isoDate}`}
                      className={[
                        "min-w-[120px] rounded-full border px-4 py-2 text-xs font-semibold transition",
                        isActive
                          ? "border-[#A1C2BD] bg-[#A1C2BD] shadow-[0_0_24px_rgba(161,194,189,0.45)]"
                          : "border-[#708993]/40 text-[#A1C2BD] hover:border-[#A1C2BD] hover:text-[#E7F2EF]",
                      ].join(" ")}
                      style={isActive ? { color: "#19183B" } : undefined}
                    >
                      {fullLabel}
                    </Link>
                  );
                })}
              </div>

              <div className="space-y-3 rounded-2xl border border-[#708993]/30 bg-[#19183B]/60 p-6">
                {selectedDate && showtimesForSelected.length === 0 ? (
                  <p className="text-sm text-[#708993]">
                    There are no showtimes configured for this date.
                  </p>
                ) : (
                  <>
                    <p className="text-xs uppercase tracking-[0.25em] text-[#708993]">
                      Showtimes
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {showtimesForSelected.map((slot) => (
                        <Link
                          key={slot.showtimeId}
                          href={`/showtimes/${slot.showtimeId}/seats`}
                          className="inline-flex min-w-[96px] items-center justify-center rounded-full border border-[#A1C2BD] bg-transparent px-4 py-2 text-xs font-semibold text-[#A1C2BD] transition hover:bg-[#A1C2BD] hover:text-[#19183B]"
                        >
                          {formatTimeLabel(slot.startTime)}
                          {slot.movieFormat && (
                            <span className="ml-2 text-[10px] uppercase text-[#E7F2EF]/80">
                              {slot.movieFormat}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] text-[#708993]">
                      Times are taken directly from your configured showtimes
                      table and may represent sample or past dates for this
                      project demo.
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
