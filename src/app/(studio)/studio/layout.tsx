import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { ReactNode } from "react";

import StudioShell from "@/components/studio/StudioShell";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SpinLive Studio — DJ Dashboard",
  description:
    "Creator control room for live DJ streaming, bookings and earnings.",
};

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${outfit.variable} dark studio-root h-screen overflow-hidden font-sans antialiased`}
    >
      <StudioShell>{children}</StudioShell>
    </div>
  );
}
