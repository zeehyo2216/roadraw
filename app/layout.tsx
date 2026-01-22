import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Providers } from "@/components/Providers";
import { UserButton } from "@/components/UserButton";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "로드로 (Roadraw)",
  description: "당신의 발걸음에 맞춘 루프 러닝 코스 생성기",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-black via-slate-950 to-slate-900 text-white`}
      >
        <Providers>
          <div className="min-h-screen flex flex-col">
            <header className="relative z-[9999] border-b border-white/5 bg-slate-950">
              <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
                <Link href="/" className="flex items-center gap-2">
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold tracking-[0.2em] uppercase text-emerald-300">
                      Roadraw
                    </span>
                    <span className="text-xs text-white/60">
                      Draw your running road.
                    </span>
                  </div>
                </Link>
                <nav className="flex items-center gap-3 text-xs">
                  <Link
                    href="/landing"
                    className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70 hover:border-emerald-300/60 hover:text-emerald-100 sm:inline"
                  >
                    Landing
                  </Link>
                  <UserButton />
                </nav>
              </div>
            </header>
            <main className="flex-1">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
