import Link from "next/link";
import type { RowDataPacket } from "mysql2";

import db from "@/lib/db";

type TheaterDetail = {
  theaterId: number;
  theaterName: string;
  cityName: string;
  state: string | null;
};

type TheaterMovie = {
  showtimeId: number;
  tmdbId: number;
  title: string;
  posterUrl: string | null;
  firstStartTime: string;
};

type TheatrePageParams = {
  theaterId: string;
};

type TheatrePageSearchParams = {
  cityId?: string;
};

async function getTheaterDetail(id: number): Promise<TheaterDetail | null> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
      SELECT
        th.theater_id   AS theaterId,
        th.theater_name AS theaterName,
        c.city_name     AS cityName,
        c.state         AS state
      FROM theater th
      JOIN city c ON c.city_id = th.city_id
      WHERE th.theater_id = ?
      LIMIT 1;
    `,
    [id],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    theaterId: Number(row.theaterId),
    theaterName: String(row.theaterName),
    cityName: String(row.cityName),
    state: row.state ? String(row.state) : null,
  };
}

async function getMoviesForTheater(
  theaterId: number,
): Promise<TheaterMovie[]> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
      SELECT
        MIN(st.showtime_id)                AS showtimeId,
        tm.tmdb_id                         AS tmdbId,
        tm.title                           AS title,
        tm.poster_url                      AS posterUrl,
        MIN(st.start_time)                 AS firstStartTime
      FROM showtime st
      JOIN tmdb_movies tm ON tm.tmdb_id = st.tmdb_id
      JOIN screen sc      ON sc.screen_id = st.screen_id
      JOIN theater th     ON th.theater_id = sc.theater_id
      WHERE th.theater_id = ?
        AND DATE(st.start_time) >= '2025-12-02'
      GROUP BY tm.tmdb_id, tm.title, tm.poster_url
      ORDER BY firstStartTime;
    `,
    [theaterId],
  );

  return rows.map((row) => ({
    showtimeId: Number(row.showtimeId),
    tmdbId: Number(row.tmdbId),
    title: String(row.title),
    posterUrl: row.posterUrl ? String(row.posterUrl) : null,
    firstStartTime: new Date(row.firstStartTime as any).toISOString(),
  }));
}

export const dynamic = "force-dynamic";

export default async function TheatreDetailPage({
  params,
  searchParams,
}: {
  params: Promise<TheatrePageParams>;
  searchParams: Promise<TheatrePageSearchParams>;
}) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const theaterId = Number.parseInt(resolvedParams.theaterId, 10);

  if (!Number.isFinite(theaterId)) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 text-[#E7F2EF]">
        <p className="text-sm text-[#708993]">Invalid theatre.</p>
      </main>
    );
  }

  const [theater, movies] = await Promise.all([
    getTheaterDetail(theaterId),
    getMoviesForTheater(theaterId),
  ]);

  if (!theater) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 text-[#E7F2EF]">
        <p className="text-sm text-[#708993]">
          We couldn&apos;t find this theatre. It may have been removed.
        </p>
      </main>
    );
  }

  const backHref = resolvedSearch.cityId
    ? `/movies?cityId=${resolvedSearch.cityId}`
    : "/movies";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#19183B] via-[#1a1a3d] to-[#1b1b3f] text-[#E7F2EF]">
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 md:px-6 lg:px-8">
        {/* Header */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#A1C2BD]">
                Theatre detail
              </p>
              <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
                {theater.theaterName}
              </h1>
              <p className="mt-2 text-sm text-[#708993]">
                {theater.cityName}
                {theater.state ? `, ${theater.state}` : ""}
              </p>
            </div>
            <Link
              href={backHref}
              className="inline-flex items-center rounded-full border border-[#708993]/40 px-4 py-1.5 text-xs font-medium text-[#A1C2BD] transition hover:border-[#A1C2BD] hover:text-[#E7F2EF]"
            >
              Back to cities
            </Link>
          </div>
        </section>

        {/* Movies carousel-style grid */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">
                Featured movies at this theatre
              </h2>
              <p className="text-sm text-[#708993]">
                Browse titles now booking at this location. Select a film to
                review showtimes and continue to seat selection.
              </p>
            </div>
          </div>

          {movies.length === 0 ? (
            <div className="rounded-2xl border border-[#708993]/30 bg-[#19183B]/60 p-6 text-sm text-[#708993]">
              We don&apos;t have any upcoming movies configured for this theatre
              yet. Please check back soon.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {movies.map((movie) => (
                <article
                  key={movie.tmdbId}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[#708993]/30 bg-[#19183B]/80 shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
                >
                  {movie.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="h-72 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-72 w-full items-center justify-center bg-[#19183B] text-xs text-[#708993]">
                      Poster unavailable
                    </div>
                  )}
                  <div className="flex flex-1 flex-col px-4 py-3">
                    <h3 className="line-clamp-2 text-sm font-semibold text-[#E7F2EF]">
                      {movie.title}
                    </h3>
                    <p className="mt-1 text-xs text-[#708993]">
                      Showtimes available at this location.
                    </p>
                    <div className="mt-4">
                      <Link
                        href={`/showtimes/${movie.showtimeId}`}
                        className="inline-flex w-full items-center justify-center rounded-full bg-[#A1C2BD] px-4 py-2 text-sm font-semibold uppercase tracking-wide transition hover:bg-[#8FB3AD]"
                        style={{ color: "#19183B" }}
                      >
                        Tickets
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
