import type { Metadata } from "next";
import { Barlow_Condensed, DM_Sans, Noto_Sans_Ethiopic } from "next/font/google";
import "./globals.css";
import "./journey.css";

const bodyFont = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const displayFont = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const ethiopicFont = Noto_Sans_Ethiopic({
  variable: "--font-ethiopic",
  subsets: ["ethiopic"],
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Shega Events — One team. Many worlds.",
  description:
    "One continuous journey through the worlds of Shega. Bermel Fest, ETFC, and Harer Ena Sengaw. One team. Many worlds. Unforgettable experiences.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable} ${ethiopicFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
