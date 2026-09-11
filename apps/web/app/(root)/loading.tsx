export default function Loading() {
  return (
    <div className="flex-1 w-full bg-[#DDE7F1] overflow-y-auto min-h-screen p-5 sm:p-8 lg:p-10">
      <div className="w-full max-w-7xl mx-auto space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between pb-2">
          <div className="space-y-2">
            <div className="h-8 w-56 sm:w-72 bg-slate-300/70 rounded-xl" />
            <div className="h-4 w-40 sm:w-96 bg-slate-200/80 rounded-lg" />
          </div>
          <div className="h-10 w-28 bg-slate-200/70 rounded-xl hidden sm:block" />
        </div>

        {/* Top Metric Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="h-32 bg-white/70 rounded-2xl border border-slate-200/60 p-5 space-y-3">
            <div className="h-4 w-24 bg-slate-200/80 rounded" />
            <div className="h-8 w-36 bg-slate-300/80 rounded-lg" />
          </div>
          <div className="h-32 bg-white/70 rounded-2xl border border-slate-200/60 p-5 space-y-3">
            <div className="h-4 w-24 bg-slate-200/80 rounded" />
            <div className="h-8 w-36 bg-slate-300/80 rounded-lg" />
          </div>
          <div className="h-32 bg-white/70 rounded-2xl border border-slate-200/60 p-5 space-y-3">
            <div className="h-4 w-24 bg-slate-200/80 rounded" />
            <div className="h-8 w-36 bg-slate-300/80 rounded-lg" />
          </div>
          <div className="h-32 bg-white/70 rounded-2xl border border-slate-200/60 p-5 space-y-3">
            <div className="h-4 w-24 bg-slate-200/80 rounded" />
            <div className="h-8 w-36 bg-slate-300/80 rounded-lg" />
          </div>
        </div>

        {/* Mid-Row Split Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-80 bg-white/70 rounded-2xl border border-slate-200/60 p-6 space-y-4">
            <div className="h-5 w-44 bg-slate-200/80 rounded" />
            <div className="h-56 w-full bg-slate-100/80 rounded-xl" />
          </div>
          <div className="lg:col-span-5 h-80 bg-white/70 rounded-2xl border border-slate-200/60 p-6 space-y-4">
            <div className="h-5 w-44 bg-slate-200/80 rounded" />
            <div className="h-56 w-full bg-slate-100/80 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}