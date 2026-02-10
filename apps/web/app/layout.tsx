import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { appMetadata } from "@oumoul/config";
import { colors } from "@oumoul/ui";
import { AuthRoot } from "../context/auth-root";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: appMetadata.name,
  description: appMetadata.mission,
  metadataBase: new URL("https://oumouls.app"),
  openGraph: {
    title: appMetadata.name,
    description: appMetadata.mission,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={appMetadata.defaultLocale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{
          minHeight: "100vh",
          background: `radial-gradient(circle at top, ${colors.primary} 0, rgba(244, 194, 194, 0.4) 30%, transparent 60%), ${colors.background}`,
          color: colors.neutral900,
        }}
      >
        <AuthRoot>{children}</AuthRoot>
      </body>
    </html>
  );
}
