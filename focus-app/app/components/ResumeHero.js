import { startSessionForm } from "@/app/actions/sessions";

export function ResumeHero({ lastProject, workspaceId }) {
  if (!lastProject || !workspaceId) return null;

  return (
    <form action={startSessionForm} className="mb-8">
      <input type="hidden" name="projectId" value={lastProject.id} />
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <button
        type="submit"
        className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left flex items-center gap-4"
      >
        <span
          className="h-12 w-12 rounded-full shrink-0 flex items-center justify-center text-xl"
          style={{ backgroundColor: lastProject.color + "20", color: lastProject.color }}
        >
          ▶
        </span>
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Resume last project
          </p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {lastProject.name}
          </p>
        </div>
      </button>
    </form>
  );
}
