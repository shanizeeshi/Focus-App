import { archiveProject } from "@/app/actions/projects";
import { startSessionForm } from "@/app/actions/sessions";

export function ProjectsList({ projects, workspaceId, hasActiveSession }) {
  return (
    <ul className="space-y-2">
      {projects.map((p) => (
        <li
          key={p.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <span
              className="h-4 w-4 rounded-full shrink-0"
              style={{ backgroundColor: p.color }}
            />
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              {p.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {workspaceId && (
              <form action={startSessionForm}>
                <input type="hidden" name="projectId" value={p.id} />
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <button
                  type="submit"
                  disabled={hasActiveSession}
                  className="rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-1.5 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start
                </button>
              </form>
            )}
            <form action={archiveProject}>
              <input type="hidden" name="projectId" value={p.id} />
              <button
                type="submit"
                className="rounded border border-zinc-300 dark:border-zinc-600 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Archive
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
