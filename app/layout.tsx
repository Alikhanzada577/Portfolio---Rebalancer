import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { themeScript } from "@/lib/theme";
import "./globals.css";

// The app's only typeface, in exactly three weights: thin (Manrope's lightest, 200), normal (400) and bold (700).
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["200", "400", "700"] });

export const metadata: Metadata = {
  title: { default: "Rebalancer", template: "%s · Rebalancer" },
  description: "Keep your portfolio on target across your brokerages in one click.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the inline script adds the `dark` class to <html> before React hydrates.
    <html lang="en" className={`${manrope.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
