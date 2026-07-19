import type { Metadata } from "next";
import { DevLinkProvider } from "../../webflow/DevLinkProvider";
import { Navbar } from "../../webflow/Navbar";
import { Footer } from "../../webflow/Footer";
import SiteRuntime from "./site-runtime";
import "../../webflow/css/global.css";
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
      <body>
        {/* Navbar davranışı/görünümü + link hover efekti CDN kütüphanesinden gelir */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/core/nav.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/effects/link-underline.css"
        />
        <DevLinkProvider>
          <Navbar />
          {children}
          <Footer />
        </DevLinkProvider>
        <SiteRuntime />
      </body>
    </html>
  );
}
