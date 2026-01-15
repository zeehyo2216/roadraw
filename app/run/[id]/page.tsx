import { RunTracker } from "@/components/RunTracker";

type RunPageProps = {
  params: {
    id: string;
  };
};

export default function RunPage({ params }: RunPageProps) {
  const isDemo = params.id === "demo";

  return (
    <div className="bg-black text-white">
      <div className="mx-auto max-w-5xl px-4 pt-4 text-xs text-white/50 sm:px-6 sm:pt-5">
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px]">
          {isDemo ? "데모 루트 · 실제 러닝 없이 UI만 둘러보기" : "실제 러닝 세션"}
        </span>
      </div>
      <RunTracker />
    </div>
  );
}

