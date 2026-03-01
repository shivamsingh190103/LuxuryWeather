export function SkeletonCard() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-5 w-40 rounded-full bg-white/10" />
      <div className="h-24 w-48 rounded-2xl bg-white/10" />
      <div className="h-5 w-64 rounded-full bg-white/10" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 rounded-2xl bg-white/10" />
        ))}
      </div>

      <div className="h-40 rounded-3xl bg-white/10" />
      <div className="h-44 rounded-3xl bg-white/10" />
    </div>
  );
}
