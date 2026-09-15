import type { Metadata } from "next";
import { Hanuman, Kantumruy_Pro } from "next/font/google";
import "./globals.css";

const hanuman = Hanuman({
  variable: "--font-hanuman",
  weight: ["100", "300", "400", "700", "900"],
  subsets: ["khmer"],
});

const kantumruyPro = Kantumruy_Pro({
  variable: "--font-kantumruy-pro",
  weight: ["100", "200", "300", "400", "500", "600", "700"],
  subsets: ["khmer"],
});

export const metadata: Metadata = {
  title: "Wedding Gift Registry",
  description: "Cambodian Wedding Cash/Gift Registry",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${hanuman.variable} ${kantumruyPro.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
