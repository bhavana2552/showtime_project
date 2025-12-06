import Link from "next/link";
import type { RowDataPacket } from "mysql2";

import db from "@/lib/db";

type City = {
  cityId: number;
  cityName: string;
  state: string | null;
};

type MovieListing = {
  tmdbId: number;
  title: string;
  posterUrl: string | null;
};

type TheaterListing = {
  theaterId: number;
  theaterName: string;
  cityName: string;
  state: string | null;
};

type TheaterShowtime = {
  showtimeId: number;
  title: string;
  posterUrl: string | null;
  startTime: string;
  screenName: string | null;
  basePrice: number;
};

type MoviesPageSearchParams = {
  cityId?: string;
  theaterId?: string;
};

async function getCities(): Promise<City[]> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
      SELECT
        c.city_id   AS cityId,
        c.city_name AS cityName,
        c.state     AS state
      FROM city c
      ORDER BY c.city_name;
    `,
  );

  const cities = rows.map((row) => ({
    cityId: Number(row.cityId),
    cityName: String(row.cityName ?? ""),
    state: row.state ? String(row.state) : null,
  }));

  // Filter out any cities that have an empty name so we don't render a blank pill
  return cities.filter((city) => city.cityName.trim().length > 0);
}

async function getMoviesForCity(cityId: number): Promise<MovieListing[]> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
      SELECT
        MIN(tm.tmdb_id)        AS tmdbId,
        tm.title               AS title,
        MIN(tm.poster_url)     AS posterUrl
      FROM showtime st
      JOIN tmdb_movies tm ON tm.tmdb_id = st.tmdb_id
      JOIN screen sc      ON sc.screen_id = st.screen_id
      JOIN theater th     ON th.theater_id = sc.theater_id
      JOIN city c         ON c.city_id = th.city_id
      WHERE c.city_id = ?
        AND st.start_time >= NOW()
      GROUP BY tm.title
      ORDER BY tm.title;
    `,
    [cityId],
  );

  return rows.map((row) => ({
    tmdbId: Number(row.tmdbId),
    title: String(row.title),
    posterUrl: row.posterUrl ? String(row.posterUrl) : null,
  }));
}

async function getTheatersForCity(cityId: number): Promise<TheaterListing[]> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
      SELECT
        th.theater_id   AS theaterId,
        th.theater_name AS theaterName,
        c.city_name     AS cityName,
        c.state         AS state
      FROM theater th
      JOIN city c ON c.city_id = th.city_id
      WHERE c.city_id = ?
      ORDER BY th.theater_name;
    `,
    [cityId],
  );

  return rows.map((row) => ({
    theaterId: Number(row.theaterId),
    theaterName: String(row.theaterName),
    cityName: String(row.cityName),
    state: row.state ? String(row.state) : null,
  }));
}

async function getShowtimesForTheater(
  theaterId: number,
): Promise<TheaterShowtime[]> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
      SELECT
        MIN(st.showtime_id)      AS showtimeId,
        tm.title                 AS title,
        MIN(tm.poster_url)       AS posterUrl,
        MIN(st.start_time)       AS startTime,
        MIN(sc.screen_name)      AS screenName,
        MIN(st.base_price)       AS basePrice
      FROM showtime st
      JOIN tmdb_movies tm ON tm.tmdb_id = st.tmdb_id
      JOIN screen sc      ON sc.screen_id = st.screen_id
      JOIN theater th     ON th.theater_id = sc.theater_id
      WHERE th.theater_id = ?
        AND st.start_time >= NOW()
      GROUP BY tm.tmdb_id, tm.title
      ORDER BY MIN(st.start_time);
    `,
    [theaterId],
  );

  return rows.map((row) => ({
    showtimeId: Number(row.showtimeId),
    title: String(row.title),
    posterUrl: row.posterUrl ? String(row.posterUrl) : null,
    startTime: new Date(row.startTime as any).toISOString(),
    screenName: row.screenName ? String(row.screenName) : null,
    basePrice: Number(row.basePrice),
  }));
}

export const dynamic = "force-dynamic";

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<MoviesPageSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  let cities: City[] = [];
  try {
    cities = await getCities();
  } catch (error) {
    console.error("Failed to load cities from database", error);
    return (
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 md:px-6 lg:px-8 text-[#E7F2EF]">
        <h1 className="text-2xl font-semibold">Browse showtimes</h1>
        <p className="text-sm text-[#708993]">
          We couldn&apos;t reach the database to load cities. Please make sure your
          MySQL server is running and your connection details in
          <code className="mx-1 rounded bg-[#1b1b3f] px-1 py-0.5 text-[11px]">
            .env.local
          </code>
          are correct, then refresh this page.
        </p>
      </main>
    );
  }

  if (cities.length === 0) {
    return (
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 md:px-6 lg:px-8 text-[#E7F2EF]">
        <h1 className="text-2xl font-semibold">Browse showtimes</h1>
        <p className="text-sm text-[#708993]">
          We couldn&apos;t find any cities configured yet. Please check your
          database and try again.
        </p>
      </main>
    );
  }

  const defaultCityId = cities[0].cityId;
  const selectedCityId =
    Number(resolvedSearchParams?.cityId ?? defaultCityId) || defaultCityId;
  const selectedCity =
    cities.find((city) => city.cityId === selectedCityId) ?? cities[0];

  const theaters = await getTheatersForCity(selectedCity.cityId);

  const defaultTheaterId = theaters[0]?.theaterId;
  const selectedTheaterId =
    defaultTheaterId !== undefined
      ? Number(resolvedSearchParams?.theaterId ?? defaultTheaterId) || defaultTheaterId
      : undefined;

  const selectedTheater =
    selectedTheaterId !== undefined
      ? theaters.find((t) => t.theaterId === selectedTheaterId) ?? theaters[0]
      : undefined;

  const movies = await getMoviesForCity(selectedCity.cityId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#19183B] via-[#1a1a3d] to-[#1b1b3f] text-[#E7F2EF]">
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 md:px-6 lg:px-8">
        {/* City selector */}
        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#A1C2BD]">
                Browse showtimes
              </p>
              <h1 className="mt-2 text-3xl font-semibold md:text-4xl">
                Now playing by city
              </h1>
              <p className="mt-2 text-sm text-[#708993]">
                Choose a city to see what&apos;s on the schedule and reserve
                tickets.
              </p>
            </div>
            <Link
              href="/home"
              className="inline-flex items-center rounded-full border border-[#708993]/40 px-4 py-1.5 text-xs font-medium text-[#A1C2BD] transition hover:border-[#A1C2BD] hover:text-[#E7F2EF]"
            >
              Back to home
            </Link>
          </div>

          <div className="flex flex-wrap gap-3 border-b border-[#708993]/40 pb-3">
            {cities.map((city) => {
              const cityLabel =
                city.cityName && city.cityName.trim().length > 0
                  ? city.state
                    ? `${city.cityName}, ${city.state}`
                    : city.cityName
                  : "All cities";
              const isActive = city.cityId === selectedCity.cityId;
              return (
                <Link
                  key={city.cityId}
                  href={`/movies?cityId=${city.cityId}`}
                  className={[
                    "inline-flex items-center rounded-full px-4 py-1.5 text-sm transition",
                    isActive
                      ? "border border-[#A1C2BD] bg-[#A1C2BD] font-semibold shadow-[0_0_20px_rgba(161,194,189,0.4)]"
                      : "border border-[#708993]/40 text-[#A1C2BD] hover:border-[#A1C2BD] hover:text-[#E7F2EF]",
                  ].join(" ")}
                  style={isActive ? { color: "#19183B" } : undefined}
                >
                  {cityLabel}
                </Link>
              );
            })}
          </div>
        </section>

        {/* Theaters in selected city */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">
                Theatres in {selectedCity.cityName}
              </h2>
              <p className="text-sm text-[#708993]">
                Choose a theatre to continue reviewing formats and showtimes.
              </p>
            </div>
          </div>

          {theaters.length === 0 ? (
            <div className="rounded-2xl border border-[#708993]/30 bg-[#19183B]/60 p-6 text-sm text-[#708993]">
              We don&apos;t have any theatres configured in this city yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {theaters.map((theater) => {
                const isSelected =
                  selectedTheater && theater.theaterId === selectedTheater.theaterId;
                return (
                  <Link
                    key={theater.theaterId}
                    href={`/theatres/${theater.theaterId}?cityId=${selectedCity.cityId}`}
                    className={[
                      "flex items-center justify-between rounded-2xl px-5 py-4 transition shadow-[0_12px_30px_rgba(0,0,0,0.35)]",
                      isSelected
                        ? "border border-[#A1C2BD] bg-[#19183B]/90"
                        : "border border-[#708993]/30 bg-[#19183B]/80 hover:border-[#A1C2BD]/60",
                    ].join(" ")}
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-[#E7F2EF]">
                        {theater.theaterName}
                      </h3>
                      <p className="mt-1 text-xs text-[#708993]">
                        {theater.cityName}
                        {theater.state ? `, ${theater.state}` : ""}
                      </p>
                    </div>
                    <span className="ml-4 text-lg text-[#A1C2BD]">&rsaquo;</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Movies grid */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">
                Now playing in {selectedCity.cityName}
              </h2>
              <p className="text-sm text-[#708993]">
                Select a title to review showtimes and reserve seats.
              </p>
            </div>
          </div>

          {movies.length === 0 ? (
            <div className="rounded-2xl border border-[#708993]/30 bg-[#19183B]/60 p-6 text-sm text-[#708993]">
              We don&apos;t have any active showtimes in this city right now.
              Try another city or check back soon.
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
                    <div className="flex h-72 w-full items-center justify-center bg-[#19183B] text-[#708993]">
                      Poster unavailable
                    </div>
                  )}
                  <div className="flex flex-1 flex-col px-4 py-3">
                    <h3 className="line-clamp-2 text-sm font-semibold">
                      {movie.title}
                    </h3>
                    <p className="mt-3 text-xs text-[#708993]">
                      Select a theatre above to view showtimes for this title.
                    </p>
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
