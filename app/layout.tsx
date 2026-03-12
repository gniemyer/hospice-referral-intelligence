import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hospice Referral Intelligence",
  description:
    "Capture voice notes from referral visits and turn them into structured call logs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
