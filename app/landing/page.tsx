import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col gap-10 px-5 py-10 sm:px-8 sm:py-12">
      <section className="flex flex-1 flex-col justify-center gap-8">
        <div className="space-y-4">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-200 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
            새로운 루프 러닝 코스를, 한 번의 슬라이드로
          </p>
          <h1 className="text-balance text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            지루한 러닝,
            <br />
            <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400 bg-clip-text text-transparent">
              도시 위에 직접 그려보세요.
            </span>
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
            로드로는 현재 위치를 기준으로{" "}
            <span className="font-semibold text-emerald-200">
              루프(Loop) 형태
            </span>
            의 러닝 코스를 자동으로 그려주는 서비스입니다. 거리를 슬라이드로
            정하고, 인도·평지 위주의 코스를 바로 생성해 보세요.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-black shadow-[0_18px_45px_rgba(16,185,129,0.65)] transition hover:bg-emerald-300"
          >
            지금 바로 코스 만들기
            <span className="text-xs font-medium text-emerald-950/80 group-hover:translate-x-0.5 transition">
              1–20km
            </span>
          </Link>
          <Link
            href="/run/demo"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-medium text-white/80 backdrop-blur-sm hover:border-emerald-300/60 hover:text-emerald-100"
          >
            데모 러닝 화면 보기
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 text-xs text-white/60 sm:max-w-md sm:grid-cols-3 sm:text-[11px]">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
              루프 경로
            </div>
            <div className="mt-1 text-sm font-semibold text-white">
              시작·종점 동일
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-white/55">
              왕복 직선 대신, 도시를 한 바퀴 도는 루프 러닝.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
              인도·평지 우선
            </div>
            <div className="mt-1 text-sm font-semibold text-white">
              숨 덜 차게, 더 멀리
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-white/55">
              보행자 도로와 평지 위주로 루트를 구성합니다.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
              러닝 데이터
            </div>
            <div className="mt-1 text-sm font-semibold text-white">
              페이스·거리·시간
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-white/55">
              실제 러닝 중 실시간 트래킹까지 한 화면에서.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 pt-6 text-[11px] text-white/45">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Roadraw</span>
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:text-emerald-200">
              플래너
            </Link>
            <Link href="/run/demo" className="hover:text-emerald-200">
              러닝 데모
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

