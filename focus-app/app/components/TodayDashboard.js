function formatDuration(secs) {
  if (secs < 60) return `${secs}m`;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function TodayDashboard({ totalSecs, byProject }) {
  const maxSecs =
    byProject.length > 0
      ? Math.max(...byProject.map((p) => p.totalSecs), 1)
      : 1;

  return (
    <div className="mb-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
        Today
      </h2>
      <p className="text-2xl font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
        {formatDuration(totalSecs)} focus
      </p>
      {byProject.length > 0 ? (
        <ul className="space-y-3">
          {byProject.map((p) => (
            <li key={p.projectId} className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-sm mb-0.5">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                    {p.projectName}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400 shrink-0 ml-2">
                    {formatDuration(p.totalSecs)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(p.totalSecs / maxSecs) * 100}%`,
                      backgroundColor: p.color,
                    }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No focus time logged yet today.
        </p>
      )}
    </div>
  );
}
