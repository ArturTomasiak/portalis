import type { Metadata } from "next";
import {
  Inter,
  Roboto_Condensed,
  IBM_Plex_Sans,
} from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-inter",
  display: "swap",
});

const robotoCondensed = Roboto_Condensed({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-roboto-condensed",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "polaris",
  description: "Your tool for maritime logistics analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${inter.variable} ${robotoCondensed.variable} ${ibmPlexSans.variable}`} lang="en">
      {children}
    </html>
  );
}
