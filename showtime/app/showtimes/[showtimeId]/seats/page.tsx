import Link from "next/link";
import type { RowDataPacket } from "mysql2";

import db from "@/lib/db";
import SeatSelectionClient from "./SeatSelectionClient";

type SeatsPageParams = {
  showtimeId: string;
};

export type ShowtimeSummary = {
  showtimeId: number;
  startTime: string;
  movieTitle: string;
  theaterId: number;
  theaterName: string;
  cityName: string;
  state: string | null;
  screenName: string | null;
};

export type SeatStatus = "Available" | "Booked";

export type Seat = {
  seatId: number;
  rowLabel: string;
  seatNumber: number;
  isWheelchair: boolean;
  status: SeatStatus;
};

export type SeatRow = {
  rowLabel: string;
  seats: Seat[];
};

async function getShowtimeSummary(
  showtimeId: number,
): Promise<ShowtimeSummary | null> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
      SELECT
        st.showtime_id          AS showtimeId,
        st.start_time           AS startTime,
        tm.title                AS movieTitle,
        th.theater_id           AS theaterId,
        th.theater_name         AS theaterName,
        c.city_name             AS cityName,
        c.state                 AS state,
        sc.screen_name          AS screenName
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
    showtimeId: Number(row.showtimeId),
    startTime: new Date(row.startTime as any).toISOString(),
    movieTitle: String(row.movieTitle),
    theaterId: Number(row.theaterId),
    theaterName: String(row.theaterName),
    cityName: String(row.cityName),
    state: row.state ? String(row.state) : null,
    screenName: row.screenName ? String(row.screenName) : null,
  };
}

async function getSeatLayoutForShowtime(
  showtimeId: number,
): Promise<SeatRow[]> {
  const [rows] = await db.query<RowDataPacket[]>(
    `
      SELECT
        s.seat_id                         AS seatId,
        s.seat_row                        AS seatRow,
        s.seat_number                     AS seatNumber,
        s.is_wheelchair                   AS isWheelchair,
        CASE
          WHEN b.showtime_id IS NOT NULL
               AND bs.seat_status = 'Booked'
          THEN 'Booked'
          ELSE 'Available'
        END                               AS seatStatus
      FROM showtime st
      JOIN screen sc       ON sc.screen_id = st.screen_id
      JOIN seat s          ON s.screen_id = sc.screen_id
      LEFT JOIN booking_seat bs
        ON bs.seat_id = s.seat_id
      LEFT JOIN booking b
        ON b.booking_id = bs.booking_id
       AND b.showtime_id = st.showtime_id
      WHERE st.showtime_id = ?
      ORDER BY s.seat_row, s.seat_number;
    `,
    [showtimeId],
  );

  // First, collapse any duplicate DB rows for the same logical seat.
  // Some seed data has multiple rows with the same (row, number), or multiple
  // booking_seat entries pointing at the same seat. We want ONE seat per
  // (rowLabel, seatNumber), marked Booked if *any* row says Booked.
  const seatByKey = new Map<string, Seat>();

  rows.forEach((row) => {
    const seatId = Number(row.seatId);
    const rowLabel = String(row.seatRow);
    const seatNumber = Number(row.seatNumber);
    const currentStatus: SeatStatus =
      row.seatStatus === "Booked" ? "Booked" : "Available";

    const key = `${rowLabel}-${seatNumber}`;
    const existing = seatByKey.get(key);

    if (existing) {
      // Keep it marked as Booked if any entry is booked.
      if (currentStatus === "Booked") {
        existing.status = "Booked";
      }
    } else {
      seatByKey.set(key, {
        seatId,
        rowLabel,
        seatNumber,
        isWheelchair: Boolean(row.isWheelchair),
        status: currentStatus,
      });
    }
  });

  const byRow = new Map<string, Seat[]>();

  Array.from(seatByKey.values()).forEach((seat) => {
    if (!byRow.has(seat.rowLabel)) {
      byRow.set(seat.rowLabel, []);
    }
    byRow.get(seat.rowLabel)!.push(seat);
  });

  const seatRows: SeatRow[] = Array.from(byRow.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([rowLabel, seats]) => ({
      rowLabel,
      seats: seats.sort((a, b) => a.seatNumber - b.seatNumber),
    }));

  // Apply a symmetric wheelchair seating pattern for visual clarity:
  // - Use the middle one or two rows
  // - Use a cluster of seats near the horizontal center of those rows
  if (seatRows.length > 0) {
    const totalRows = seatRows.length;
    const maxSeatsPerRow = Math.max(
      ...seatRows.map((row) => row.seats.length),
    );

    const centerRowStart = Math.max(0, Math.floor(totalRows / 2) - 1);
    const centerRowEnd = Math.min(totalRows - 1, centerRowStart + 1);

    const centerSeatStart = Math.max(0, Math.floor(maxSeatsPerRow / 2) - 2);
    const centerSeatEnd = Math.min(maxSeatsPerRow - 1, centerSeatStart + 3);

    return seatRows.map((row, rowIndex) => {
      const inCenterRow =
        rowIndex >= centerRowStart && rowIndex <= centerRowEnd;

      const seatsWithPattern = row.seats.map((seat, seatIndex) => {
        const inCenterCluster =
          inCenterRow &&
          seatIndex >= centerSeatStart &&
          seatIndex <= centerSeatEnd;

        return {
          ...seat,
          isWheelchair: inCenterCluster,
        };
      });

      return {
        ...row,
        seats: seatsWithPattern,
      };
    });
  }

  return seatRows;
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
  return `${date} \u00b7 ${time}`;
}

export const dynamic = "force-dynamic";

export default async function SeatsPage({
  params,
}: {
  params: Promise<SeatsPageParams>;
}) {
  const resolvedParams = await params;

  const showtimeId = Number.parseInt(resolvedParams.showtimeId, 10);
  if (!Number.isFinite(showtimeId)) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 text-[#E7F2EF]">
        <p className="text-sm text-[#708993]">Invalid showtime.</p>
      </main>
    );
  }

  const [summary, seatRows] = await Promise.all([
    getShowtimeSummary(showtimeId),
    getSeatLayoutForShowtime(showtimeId),
  ]);

  if (!summary) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 text-[#E7F2EF]">
        <p className="text-sm text-[#708993]">
          We couldn&apos;t find this showtime. It may have been removed.
        </p>
      </main>
    );
  }

  const showtimeLabel = formatShowtimeLabel(summary.startTime);
  const backHref = `/theatres/${summary.theaterId}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#19183B] via-[#1a1a3d] to-[#1b1b3f] text-[#E7F2EF]">
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 md:px-6 lg:px-8">
        {/* Header with movie and theatre */}
        <section className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#A1C2BD]">
                Seat selection
              </p>
              <h1 className="text-2xl font-semibold md:text-3xl">
                {summary.movieTitle}
              </h1>
              <p className="text-sm text-[#708993]">
                {summary.theaterName} &middot; {summary.cityName}
                {summary.state ? `, ${summary.state}` : ""}{" "}
                {summary.screenName ? `· ${summary.screenName}` : ""}
              </p>
              <p className="text-xs text-[#A1C2BD]">{showtimeLabel}</p>
            </div>
            <Link
              href={backHref}
              className="inline-flex items-center rounded-full border border-[#708993]/40 px-4 py-1.5 text-xs font-medium text-[#A1C2BD] transition hover:border-[#A1C2BD] hover:text-[#E7F2EF]"
            >
              Back to theatre
            </Link>
          </div>
        </section>

        <SeatSelectionClient summary={summary} seatRows={seatRows} />
      </main>
    </div>
  );
}
