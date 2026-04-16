import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Raleway } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

const raleway = Raleway({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-raleway",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#1E1F2E",
};

export const metadata: Metadata = {
  title: "Backstage | Bar Excellence",
  description: "Events preparation and dispatch system",
  applicationName: "Backstage",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicons/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [
      { url: "/favicons/apple-icon-57x57.png", sizes: "57x57" },
      { url: "/favicons/apple-icon-60x60.png", sizes: "60x60" },
      { url: "/favicons/apple-icon-72x72.png", sizes: "72x72" },
      { url: "/favicons/apple-icon-76x76.png", sizes: "76x76" },
      { url: "/favicons/apple-icon-114x114.png", sizes: "114x114" },
      { url: "/favicons/apple-icon-120x120.png", sizes: "120x120" },
      { url: "/favicons/apple-icon-144x144.png", sizes: "144x144" },
      { url: "/favicons/apple-icon-152x152.png", sizes: "152x152" },
      { url: "/favicons/apple-icon-180x180.png", sizes: "180x180" },
    ],
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/favicons/apple-icon-precomposed.png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${raleway.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
