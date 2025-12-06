import { NextResponse } from "next/server";
import { z } from "zod";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

import db from "@/lib/db";

const ADMIN_EMAIL = "bhavanaburugupally@gmail.com";

const CreateShowtimeSchema = z.object({
  adminEmail: z.string().email(),
  tmdbId: z.number().int().positive(),
  screenId: z.number().int().positive(),
  startTime: z.string().min(1), // "YYYY-MM-DD HH:MM:SS"
  basePrice: z.number().positive(),
  movieLanguage: z.string().min(1),
  movieFormat: z.string().min(1),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = CreateShowtimeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const payload = parsed.data;

  if (payload.adminEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json(
      { error: "You are not authorized to create showtimes." },
      { status: 403 },
    );
  }

  const { tmdbId, screenId, startTime, basePrice, movieLanguage, movieFormat } =
    payload;

  try {
    // Ensure referenced movie and screen exist.
    type CheckRow = RowDataPacket & { exists_flag: number };

    const [movieRows] = await db.query<CheckRow[]>(
      "SELECT COUNT(*) AS exists_flag FROM tmdb_movies WHERE tmdb_id = ?",
      [tmdbId],
    );

    if (!movieRows[0] || Number(movieRows[0].exists_flag) === 0) {
      return NextResponse.json(
        { error: "Selected movie does not exist in tmdb_movies." },
        { status: 400 },
      );
    }

    const [screenRows] = await db.query<CheckRow[]>(
      "SELECT COUNT(*) AS exists_flag FROM screen WHERE screen_id = ?",
      [screenId],
    );

    if (!screenRows[0] || Number(screenRows[0].exists_flag) === 0) {
      return NextResponse.json(
        { error: "Selected screen does not exist." },
        { status: 400 },
      );
    }

    const [result] = await db.execute<ResultSetHeader>(
      `
        INSERT INTO showtime (
          tmdb_id,
          screen_id,
          start_time,
          base_price,
          movie_language,
          movie_format
        )
        VALUES (?, ?, ?, ?, ?, ?);
      `,
      [tmdbId, screenId, startTime, basePrice, movieLanguage, movieFormat],
    );

    return NextResponse.json(
      {
        showtimeId: result.insertId,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create admin showtime error:", error);
    return NextResponse.json(
      { error: "Failed to create showtime" },
      { status: 500 },
    );
  }
}

