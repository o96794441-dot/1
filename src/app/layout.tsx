import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "OLK Films - شاهد أفضل الأفلام والمسلسلات مجاناً",
  description: "منصة OLK Films لمشاهدة أحدث الأفلام والمسلسلات العربية والأجنبية مجاناً بجودة عالية",
  keywords: ["أفلام", "مسلسلات", "مشاهدة", "مجاني", "عربي", "OLK Films"],
};

// ضع Publisher ID الخاص بك من Google AdSense هنا
const ADSENSE_PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_ID || "ca-pub-4178695051565643";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        {/* Google AdSense Script */}
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${tajawal.variable} font-sans antialiased flex flex-col min-h-screen`} suppressHydrationWarning>
        <Navbar />
        <main className="flex-1 pt-16">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

