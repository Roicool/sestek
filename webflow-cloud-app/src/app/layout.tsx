import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sestek Demo Hub",
  description: "Sestek demo pages and services",
  robots: { index: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
