import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";

import db from "@/lib/db";

type CityRow = RowDataPacket & {
  city_id: number;
  city_name: string;
  state: string | null;
};

type TheaterRow = RowDataPacket & {
  theater_id: number;
  theater_name: string;
  city_id: number;
};

type ScreenRow = RowDataPacket & {
  screen_id: number;
  screen_name: string | null;
  theater_id: number;
};

type MovieRow = RowDataPacket & {
  tmdb_id: number;
  title: string;
};

export async function GET() {
  try {
    const [cityRows] = await db.query<CityRow[]>(
      `
        SELECT
          c.city_id   AS city_id,
          c.city_name AS city_name,
          c.state     AS state
        FROM city c
        ORDER BY c.city_name;
      `,
    );

    const [theaterRows] = await db.query<TheaterRow[]>(
      `
        SELECT
          th.theater_id   AS theater_id,
          th.theater_name AS theater_name,
          th.city_id      AS city_id
        FROM theater th
        ORDER BY th.theater_name;
      `,
    );

    const [screenRows] = await db.query<ScreenRow[]>(
      `
        SELECT
          sc.screen_id   AS screen_id,
          sc.screen_name AS screen_name,
          sc.theater_id  AS theater_id
        FROM screen sc
        ORDER BY sc.screen_id;
      `,
    );

    const [movieRows] = await db.query<MovieRow[]>(
      `
        SELECT
          tm.tmdb_id AS tmdb_id,
          tm.title   AS title
        FROM tmdb_movies tm
        ORDER BY tm.title;
      `,
    );

    return NextResponse.json({
      cities: cityRows.map((row) => ({
        cityId: Number(row.city_id),
        cityName: String(row.city_name),
        state: row.state ? String(row.state) : null,
      })),
      theaters: theaterRows.map((row) => ({
        theaterId: Number(row.theater_id),
        theaterName: String(row.theater_name),
        cityId: Number(row.city_id),
      })),
      screens: screenRows.map((row) => ({
        screenId: Number(row.screen_id),
        screenName: row.screen_name ? String(row.screen_name) : null,
        theaterId: Number(row.theater_id),
      })),
      movies: movieRows.map((row) => ({
        tmdbId: Number(row.tmdb_id),
        title: String(row.title),
      })),
    });
  } catch (error) {
    console.error("Admin options error:", error);
    return NextResponse.json(
      { error: "Failed to load admin options" },
      { status: 500 },
    );
  }
}
