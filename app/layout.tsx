import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "SEO Assistant by Rabbit Rank | AI-Powered SEO Expert",
  description: "Your intelligent SEO companion. Get expert advice on keyword research, technical SEO, content optimization, and link building strategies.",
  keywords: ["SEO", "search engine optimization", "keyword research", "digital marketing", "Rabbit Rank"],
  authors: [{ name: "Rabbit Rank" }],
  openGraph: {
    title: "SEO Assistant by Rabbit Rank",
    description: "AI-Powered SEO Expert for data-driven search optimization",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
