import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "Luxury Weather",
  description: "Production-ready weather app with glassmorphism UX",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Luxury Weather"
  },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.svg" }],
    icon: [{ url: "/icons/icon.svg" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#040712"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body className={`${inter.variable} min-h-screen font-sans antialiased`}>
        <div className="mesh-background" aria-hidden="true" />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
