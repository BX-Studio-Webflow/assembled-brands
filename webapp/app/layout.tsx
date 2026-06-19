import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Brand fonts pulled from the published Assembled Brands site (Webflow CDN).
const ibmPlexSans = localFont({
  variable: "--font-sans",
  display: "swap",
  src: [
    { path: "../public/fonts/IBMPlexSans-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/IBMPlexSans-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/IBMPlexSans-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/IBMPlexSans-Bold.ttf", weight: "700", style: "normal" },
  ],
});

const documenta = localFont({
  variable: "--font-serif",
  display: "swap",
  src: [
    { path: "../public/fonts/DTLDocumentaST-Regular.otf", weight: "400", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "Assembled Brands — Application",
  description: "Complete your Assembled Brands application.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${documenta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
