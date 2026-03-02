import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import {
  getDefaultWorkspace,
  getProjects,
  createProject,
} from "./actions/projects";
import { getActiveSession, getSessionEvents, getTodayStats, getLastProject } from "./actions/sessions";
import { ProjectsList } from "./components/ProjectsList";
import { ActiveSessionBar } from "./components/ActiveSessionBar";
import { TodayDashboard } from "./components/TodayDashboard";
import { ResumeHero } from "./components/ResumeHero";

const PROJECT_COLORS = [
  { value: "#4A90D9", label: "Blue" },
  { value: "#E24C4C", label: "Red" },
  { value: "#34C759", label: "Green" },
  { value: "#FF9500", label: "Orange" },
  { value: "#AF52DE", label: "Purple" },
  { value: "#5AC8FA", label: "Sky" },
];

export default async function HomePage({ searchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: workspace, error: workspaceError } = await getDefaultWorkspace();
  if (workspaceError || !workspace) {
    const message = workspaceError?.message ?? workspaceError?.error_description ?? String(workspaceError ?? "No workspace found");
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md space-y-2 text-center">
          <p className="text-zinc-800 dark:text-zinc-200 font-medium">
            No workspace found
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 break-all">
            {message}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-4">
            Restart the dev server (Ctrl+C then npm run dev) and refresh. If it still fails, check focus-app/.env.local has SUPABASE_SERVICE_ROLE_KEY set.
          </p>
        </div>
      </div>
    );
  }

  const { data: projects } = await getProjects(workspace.id);
  const activeProjects = (projects ?? []).filter((p) => p.status === "active");
  const archivedProjects = (projects ?? []).filter((p) => p.status === "archived");
  const { data: activeSession } = await getActiveSession(workspace.id);
  const { data: sessionEvents } = activeSession
    ? await getSessionEvents(activeSession.id)
    : { data: [] };
  const { data: todayStats } = await getTodayStats(workspace.id);
  const { data: lastProject } = await getLastProject(workspace.id);

  const resolvedParams =
    typeof searchParams?.then === "function"
      ? await searchParams
      : searchParams ?? {};
  const showStoppedMessage = resolvedParams?.stopped === "1";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Focus App
          </h1>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Workspace: <span className="font-medium text-zinc-800 dark:text-zinc-200">{workspace.name}</span>
        </p>

        {showStoppedMessage && (
          <div className="mb-6 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/50 px-4 py-3 text-green-800 dark:text-green-200">
            Micro-Sprint complete! Your focus time has been logged.
          </div>
        )}

        {!activeSession && (
          <ResumeHero lastProject={lastProject} workspaceId={workspace.id} />
        )}

        <TodayDashboard
          totalSecs={todayStats?.totalSecs ?? 0}
          byProject={todayStats?.byProject ?? []}
        />

        {activeSession && (
          <ActiveSessionBar session={activeSession} events={sessionEvents} />
        )}

        {/* Create project form */}
        <form
          action={createProject.bind(null, workspace.id)}
          className="mb-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            New project
          </h2>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[200px] flex-1">
              <label htmlFor="project-name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Name
              </label>
              <input
                id="project-name"
                name="name"
                type="text"
                required
                placeholder="e.g. Legal Analysis"
                className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Colour
              </label>
              <div className="flex gap-2">
                {PROJECT_COLORS.map((c) => (
                  <label key={c.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="color"
                      value={c.value}
                      defaultChecked={c.value === "#4A90D9"}
                      className="sr-only peer"
                    />
                    <span
                      className="block h-8 w-8 rounded-full border-2 border-zinc-300 dark:border-zinc-600 peer-checked:border-zinc-900 dark:peer-checked:border-white hover:opacity-90"
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  </label>
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2"
            >
              Add project
            </button>
          </div>
        </form>

        {/* Active projects */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Projects
          </h2>
          {activeProjects.length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              No projects yet. Create one above.
            </p>
          ) : (
            <ProjectsList
              projects={activeProjects}
              workspaceId={workspace.id}
              hasActiveSession={!!activeSession}
            />
          )}
        </section>

        {/* Archived */}
        {archivedProjects.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-zinc-500 dark:text-zinc-400 mb-4">
              Archived
            </h2>
            <ul className="space-y-2">
              {archivedProjects.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3"
                >
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-zinc-500 dark:text-zinc-400 line-through">
                    {p.name}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
