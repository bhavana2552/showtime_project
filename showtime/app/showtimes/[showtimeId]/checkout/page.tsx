import Link from "next/link";

import CheckoutClient from "./CheckoutClient";

type CheckoutPageParams = {
  showtimeId: string;
};

type CheckoutSearchParams = {
  count?: string;
  total?: string;
  seats?: string;
  seatIds?: string;
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<CheckoutPageParams>;
  searchParams: Promise<CheckoutSearchParams>;
}) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;

  const showtimeId = Number.parseInt(resolvedParams.showtimeId, 10);
  const ticketCount = Number.parseInt(resolvedSearch.count ?? "0", 10) || 0;
  const totalAmount = Number.parseFloat(resolvedSearch.total ?? "0") || 0;
  const seatLabels =
    resolvedSearch.seats
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const seatIds =
    resolvedSearch.seatIds
      ?.split(",")
      .map((s) => Number.parseInt(s, 10))
      .filter((n) => Number.isFinite(n)) ?? [];

  if (!Number.isFinite(showtimeId)) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 text-[#E7F2EF]">
        <p className="text-sm text-[#708993]">Invalid showtime.</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#19183B] via-[#1a1a3d] to-[#1b1b3f] text-[#E7F2EF]">
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 md:px-6 lg:px-8">
        <section className="space-y-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.35em] text-[#A1C2BD]">
                Checkout
              </p>
              <h1 className="text-2xl font-semibold md:text-3xl">
                Review and confirm your booking
              </h1>
              <p className="text-sm text-[#708993]">
                Enter your email for ticket delivery and card details to confirm
                this booking.
              </p>
            </div>
            <Link
              href="/home"
              className="inline-flex items-center justify-center rounded-full bg-[#A1C2BD] px-5 py-2 text-sm font-semibold shadow-lg shadow-[#A1C2BD]/30 transition hover:bg-[#8FB3AD]"
              style={{ color: "#19183B" }}
            >
              Back to home
            </Link>
          </div>
        </section>

        <CheckoutClient
          showtimeId={showtimeId}
          ticketCount={ticketCount}
          totalAmount={totalAmount}
          seatLabels={seatLabels}
          seatIds={seatIds}
        />
      </main>
    </div>
  );
}
