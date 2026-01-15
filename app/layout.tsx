import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-white/5 backdrop-blur-sm bg-black/30">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
              <div className="flex items-center gap-2">
                {/* <img src="/roadraw-icon.png" alt="Roadraw" className="h-7 w-7 rounded-full" /> */}
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold tracking-[0.2em] uppercase text-emerald-300">
                    Roadraw
                  </span>
                  <span className="text-xs text-white/60">
                    Draw your running road.
                  </span>
                </div>
              </div>
              <nav className="flex items-center gap-2 text-xs">
                <Link
                  href="/landing"
                  className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70 hover:border-emerald-300/60 hover:text-emerald-100 sm:inline"
                >
                  Landing
                </Link>
                <Link
                  href="/"
                  className="rounded-full bg-emerald-400 px-3 py-1 text-[11px] font-semibold text-black hover:bg-emerald-300"
                >
                  Planner
                </Link>
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
