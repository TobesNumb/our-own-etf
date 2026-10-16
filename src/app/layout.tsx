import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/TopNav";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: { default: config.appNaam, template: `%s · ${config.appNaam}` },
  description: "Volgt de aandelen uit de lezing van 16 oktober 2026.",
};

const themeScript = `(function(){try{var t=localStorage.getItem('koerslijst-thema');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl-BE" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="min-h-screen">
        <TopNav />
        <main className="mx-auto w-full max-w-[1180px] px-4 pb-16 pt-6 sm:px-6">{children}</main>
        <footer className="mx-auto max-w-[1180px] px-4 pb-8 text-center text-xs text-muted sm:px-6">
          Koersen via Yahoo Finance, 15 tot 20 minuten vertraagd. Geen beleggingsadvies.
        </footer>
      </body>
    </html>
  );
}
