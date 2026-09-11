import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { DaftarServiceWorker } from "@/components/pwa";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Cuan — Catatan Keuangan Pribadi",
    template: "%s · Cuan",
  },
  description:
    "Pencatatan keuangan pribadi: arus kas, utang, tabungan, dan investasi dalam satu tempat.",
  manifest: "/manifest.webmanifest",
  applicationName: "Cuan",
  // iOS tidak membaca manifest; ikon dan mode standalone-nya diatur terpisah.
  appleWebApp: {
    capable: true,
    title: "Cuan",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/ikon/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // Warna bilah status mengikuti tema; nilainya disamakan dengan --background
  // pada globals.css supaya tidak ada garis warna asing di atas layar.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1c1c" },
  ],
  // Mengisi area di balik poni dan bilah gestur saat berjalan sebagai aplikasi.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground min-h-dvh antialiased`}
      >
        {children}
        <Toaster position="top-center" richColors />
        <DaftarServiceWorker />
      </body>
    </html>
  );
}
