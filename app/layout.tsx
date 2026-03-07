import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://dishoomfilms.com"),
  title: {
    default: "Dishoom — Bollywood Reviews, Rankings & News",
    template: "%s | Dishoom",
  },
  description:
    "Bollywood's definitive film guide. 4,000+ Hindi films ranked and reviewed — from 1950s classics to today's blockbusters.",
  openGraph: {
    type: "website",
    siteName: "Dishoom",
    locale: "en_IN",
    url: "https://dishoomfilms.com",
    title: "Dishoom — Bollywood Reviews, Rankings & News",
    description:
      "Bollywood's definitive film guide. 4,000+ Hindi films ranked and reviewed — from 1950s classics to today's blockbusters.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dishoom — Bollywood Reviews, Rankings & News",
    description:
      "Bollywood's definitive film guide. 4,000+ Hindi films ranked and reviewed.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body>
        <Header />
        <div className="site-wrapper" style={{ minHeight: "calc(100vh - 85px)" }}>
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
