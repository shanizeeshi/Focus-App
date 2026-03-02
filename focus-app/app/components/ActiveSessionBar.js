import {
  pauseSessionForm,
  resumeSessionForm,
  stopSessionForm,
} from "@/app/actions/sessions";
import { DISTRACTION_REASONS } from "@/lib/constants";
import { SessionTimer } from "./SessionTimer";

export function ActiveSessionBar({ session, events }) {
  if (!session) return null;
  const project = session.projects;
  const projectName = project?.name ?? "Focus session";
  const isPaused = session.status === "paused";

  return (
    <div className="mb-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="h-4 w-4 rounded-full shrink-0"
              style={{ backgroundColor: project?.color ?? "#4A90D9" }}
            />
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              {isPaused ? "Paused" : "In progress"}: {projectName}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          {isPaused ? (
            <form action={resumeSessionForm} className="inline">
              <input type="hidden" name="sessionId" value={session.id} />
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-1.5 text-sm font-medium hover:opacity-90"
              >
                Resume
              </button>
            </form>
          ) : (
            <form action={pauseSessionForm} className="inline">
              <input type="hidden" name="sessionId" value={session.id} />
              <select
                name="reason"
                className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-700 dark:text-zinc-300"
              >
                <option value="">Pause reason</option>
                {DISTRACTION_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="ml-1 rounded border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Pause
              </button>
            </form>
          )}
          <form action={stopSessionForm} className="inline">
            <input type="hidden" name="sessionId" value={session.id} />
            <input type="hidden" name="endReason" value="stop_today" />
            <button
              type="submit"
              className="rounded border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Pause for today
            </button>
          </form>
          <form action={stopSessionForm} className="inline">
            <input type="hidden" name="sessionId" value={session.id} />
            <input type="hidden" name="endReason" value="complete_project" />
            <button
              type="submit"
              className="rounded border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Complete session
            </button>
          </form>
        </div>
        </div>
        <SessionTimer session={session} events={events ?? []} />
      </div>
    </div>
  );
}
