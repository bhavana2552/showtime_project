"use client";

import QRCode from "react-qr-code";

type BookingQrProps = {
  value: string;
};

export default function BookingQr({ value }: BookingQrProps) {
  return (
    <div className="flex h-40 w-40 items-center justify-center rounded-2xl border border-[#A1C2BD]/40 bg-[#19183B] shadow-[0_0_40px_rgba(161,194,189,0.25)]">
      <div className="rounded-xl bg-[#19183B] p-2">
        <QRCode
          value={value}
          size={128}
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          bgColor="transparent"
          fgColor="#E7F2EF"
        />
      </div>
    </div>
  );
}
