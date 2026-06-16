import "./globals.css";
import Link from "next/link";
import SupportButton from "../components/SupportButton";
import PWARegister from "../components/PWARegister";
import Analytics from "../components/Analytics";
import InstallPrompt from "../components/InstallPrompt";
import PullToRefresh from "../components/PullToRefresh";
import { SITE_URL, SITE_NAME } from "../lib/site";

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a4da2" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1626" },
  ],
};

const TITLE = "Lazio24 — la tua giornata biancoceleste";
const DESCRIPTION =
  "Lazio24: tutte le notizie sulla S.S. Lazio delle ultime 24 ore, raccolte dalle principali fonti, sintetizzate e aggiornate in continuo.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  icons: {
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body className="min-h-screen text-slate-800 antialiased dark:text-slate-200">
        <PWARegister />
        <Analytics />
        <InstallPrompt />
        <PullToRefresh />
        {/* Header a tutta larghezza; contenuto e footer incolonnati al centro */}
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-night-border dark:bg-night-bg/90">
          <div className="mx-auto flex max-w-[640px] items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <img
                  src="/logo-mark.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-auto"
                />
                <div className="leading-tight">
                  <span className="text-lg font-bold tracking-tight">
                    <span className="text-lazio-blue dark:text-sky-400">Lazio</span>
                    <span className="text-[#2f7ec4] dark:text-sky-300">24</span>
                    <span className="text-slate-500 dark:text-slate-400">.news</span>
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    La tua giornata biancoceleste
                  </p>
                </div>
              </div>
              <SupportButton variant="header" />
            </div>
          </header>

        <main className="mx-auto max-w-[640px] px-4 py-4">{children}</main>

        <footer className="mx-auto max-w-[640px] px-4 pb-10 pt-6 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            <div className="mb-4 flex justify-center">
              <SupportButton variant="header" />
            </div>
            Lazio24 è un aggregatore: ogni notizia rimanda alla fonte
            originale.
            <br />
            Le sintesi sono generate automaticamente: possibili imprecisioni,
            fa fede la fonte.
            <br />
            Sito non ufficiale, non affiliato alla S.S. Lazio.
            <span className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1">
              <Link href="/cosa-e" className="hover:text-lazio-blue hover:underline dark:hover:text-sky-400">
                Cos’è
              </Link>
              <Link href="/fonti" className="hover:text-lazio-blue hover:underline dark:hover:text-sky-400">
                Fonti
              </Link>
              <Link href="/privacy" className="hover:text-lazio-blue hover:underline dark:hover:text-sky-400">
                Privacy
              </Link>
              <Link href="/cookie" className="hover:text-lazio-blue hover:underline dark:hover:text-sky-400">
                Cookie
              </Link>
              <Link
                href="/note-legali"
                className="hover:text-lazio-blue hover:underline dark:hover:text-sky-400"
              >
                Note legali
              </Link>
            </span>
          </footer>
      </body>
    </html>
  );
}
