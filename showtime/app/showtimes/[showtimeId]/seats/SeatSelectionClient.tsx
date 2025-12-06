"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Seat, SeatRow, ShowtimeSummary } from "./page";

type SeatSelectionClientProps = {
  summary: ShowtimeSummary;
  seatRows: SeatRow[];
};

const TICKET_PRICE = 17; // simple flat price for now

export default function SeatSelectionClient({
  summary,
  seatRows,
}: SeatSelectionClientProps) {
  const router = useRouter();
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);

  const allSeats = useMemo(
    () =>
      seatRows.flatMap((row) =>
        row.seats.map((seat) => ({
          ...seat,
          label: `${seat.rowLabel}${seat.seatNumber}`,
        })),
      ),
    [seatRows],
  );

  const selectedSeats = useMemo(
    () => allSeats.filter((s) => selectedSeatIds.includes(s.seatId)),
    [allSeats, selectedSeatIds],
  );

  const totalPrice = selectedSeats.length * TICKET_PRICE;

  const handleToggleSeat = (seat: Seat) => {
    if (seat.status === "Booked") return;

    setSelectedSeatIds((prev) =>
      prev.includes(seat.seatId)
        ? prev.filter((id) => id !== seat.seatId)
        : [...prev, seat.seatId],
    );
  };

  const handleCheckout = () => {
    if (selectedSeats.length === 0) return;

    const seatLabels = selectedSeats.map((s) => s.label);
    const seatIds = selectedSeats.map((s) => s.seatId);

    const params = new URLSearchParams({
      count: String(selectedSeats.length),
      total: totalPrice.toFixed(2),
      seats: seatLabels.join(","),
      seatIds: seatIds.join(","),
    });

    router.push(
      `/showtimes/${summary.showtimeId}/checkout?${params.toString()}`,
    );
  };

  const renderSeat = (seat: Seat) => {
    const isBooked = seat.status === "Booked";
    const isWheelchair = seat.isWheelchair;
    const isSelected = selectedSeatIds.includes(seat.seatId);

    let classes =
      "flex h-7 w-7 items-center justify-center rounded-md border text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A1C2BD]";

    if (isBooked) {
      classes +=
        " border-[#E54B4B] bg-[#E54B4B]/80 text-[#19183B] opacity-70 cursor-not-allowed";
    } else if (isWheelchair) {
      // Wheelchair spaces stay blue, but can still be selected if you click.
      if (isSelected) {
        classes +=
          " border-[#A1C2BD] bg-[#A1C2BD] text-[#19183B] shadow-[0_0_10px_rgba(161,194,189,0.7)]";
      } else {
        classes +=
          " border-[#4F7FB7] bg-[#4F7FB7] text-[#E7F2EF] hover:bg-[#4F7FB7]/90 cursor-pointer";
      }
    } else {
      // Regular available seats
      if (isSelected) {
        // Selected = solid mint green and subtle glow
        classes +=
          " border-[#A1C2BD] bg-[#A1C2BD] text-[#19183B] shadow-[0_0_10px_rgba(161,194,189,0.9)]";
      } else {
        // Unselected = outlined / soft background
        classes +=
          " border-[#A1C2BD] bg-[#19183B] text-[#E7F2EF] hover:bg-[#A1C2BD]/15 cursor-pointer";
      }
    }

    return (
      <button
        key={`${seat.seatId}-${seat.rowLabel}${seat.seatNumber}`}
        type="button"
        className={classes}
        onClick={() => handleToggleSeat(seat)}
        aria-pressed={isSelected}
        disabled={isBooked}
      >
        {isWheelchair ? (
          <span className="text-[12px] leading-none">♿</span>
        ) : (
          <>
            {seat.rowLabel}
            {seat.seatNumber}
          </>
        )}
      </button>
    );
  };

  return (
    <section className="grid gap-10 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      {/* Screen + seat layout */}
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="h-2 w-40 rounded-full bg-gradient-to-r from-[#708993]/40 via-[#A1C2BD]/60 to-[#708993]/40" />
          <p className="text-xs uppercase tracking-[0.2em] text-[#708993]">
            Screen
          </p>
        </div>

        <div className="mx-auto max-w-xl space-y-2 rounded-2xl border border-[#708993]/30 bg-[#19183B]/60 p-4">
          {seatRows.map((row, rowIndex) => (
            <div
              key={`${row.rowLabel}-${rowIndex}`}
              className="flex items-center gap-3 text-[11px]"
            >
              <div className="w-6 text-right text-[#708993]">
                {row.rowLabel}
              </div>
              <div className="flex flex-1 justify-center">
                <div className="flex flex-wrap justify-center gap-1.5">
                  {row.seats.map((seat) => renderSeat(seat))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend + ticket summary */}
      <aside className="space-y-4">
        {/* Legend */}
        <div className="space-y-4 rounded-2xl border border-[#708993]/30 bg-[#19183B]/60 p-5 text-sm">
          <h2 className="text-base font-semibold">Seat legend</h2>
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-md border border-[#A1C2BD] bg-[#19183B]" />
              <span className="text-[#E7F2EF]">Available seat</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-md border border-[#A1C2BD] bg-[#A1C2BD]" />
              <span className="text-[#E7F2EF]">Selected seat</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-md border border-[#E54B4B] bg-[#E54B4B]/80" />
              <span className="text-[#E7F2EF]">Unavailable / booked</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-md border border-[#4F7FB7] bg-[#4F7FB7] text-[11px]">
                ♿
              </div>
              <span className="text-[#E7F2EF]">
                Wheelchair space (no step access)
              </span>
            </div>
          </div>
          <p className="mt-4 text-[11px] text-[#708993]">
            Seat availability is derived from your sample{" "}
            <code className="rounded bg-[#1b1b3f] px-1 py-0.5 text-[10px]">
              seat
            </code>{" "}
            and{" "}
            <code className="rounded bg-[#1b1b3f] px-1 py-0.5 text-[10px]">
              booking_seat
            </code>{" "}
            tables for this showtime.
          </p>
        </div>

        {/* Ticket summary / Add to Cart */}
        <div className="space-y-4 rounded-2xl border border-[#708993]/30 bg-[#19183B]/60 p-5 text-sm">
          <h2 className="text-base font-semibold">Tickets</h2>
          <p className="text-xs text-[#A1C2BD]">
            Tickets ${TICKET_PRICE.toFixed(2)} each
          </p>

          {selectedSeats.length === 0 ? (
            <p className="pt-2 text-center text-xs text-[#E7F2EF]">
              Select your seats to see ticket options.
            </p>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#E7F2EF]">
                  {selectedSeats.length} seat
                  {selectedSeats.length > 1 ? "s" : ""} selected
                </span>
                <span className="font-semibold text-[#E7F2EF]">
                  ${totalPrice.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-[#708993]">
                {selectedSeats.map((s) => s.label).join(", ")}
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={selectedSeats.length === 0}
            onClick={handleCheckout}
            className={`mt-4 flex w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
              selectedSeats.length === 0
                ? "cursor-not-allowed bg-[#708993]/40 text-[#19183B]/40"
                : "bg-[#A1C2BD] text-[#19183B] hover:bg-[#A1C2BD]/90"
            }`}
          >
            Add to Cart
          </button>
        </div>
      </aside>
    </section>
  );
}
