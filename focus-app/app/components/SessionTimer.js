"use client";

import { useState, useEffect } from "react";
import { updateSessionGoal } from "@/app/actions/sessions";

/**
 * Compute elapsed focused seconds from events + current time.
 * Uses Date.now() delta; only re-renders every 1s (no setInterval for accumulation).
 */
function computeElapsedSecs(events, startedAt, status) {
  const started = new Date(startedAt).getTime();
  const sorted = [...(events ?? [])].sort(
    (a, b) => new Date(a.triggered_at) - new Date(b.triggered_at)
  );
  let total = 0;
  let segmentStart = started;
  for (const e of sorted) {
    const t = new Date(e.triggered_at).getTime();
    if (e.event_type === "start") {
      segmentStart = t;
    } else if (e.event_type === "pause" || e.event_type === "stop") {
      total += Math.floor((t - segmentStart) / 1000);
      segmentStart = null;
    } else if (e.event_type === "resume") {
      segmentStart = t;
    }
  }
  if (status === "active" && segmentStart != null) {
    total += Math.floor((Date.now() - segmentStart) / 1000);
  }
  return total;
}

function formatElapsed(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SessionTimer({ session, events }) {
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [goal, setGoal] = useState(session?.session_goal ?? "");
  const [goalSaving, setGoalSaving] = useState(false);

  useEffect(() => {
    const tick = () => {
      setElapsedSecs(
        computeElapsedSecs(events, session?.started_at, session?.status)
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session?.started_at, session?.status, events]);

  const handleGoalBlur = async () => {
    if (goal === (session?.session_goal ?? "") || !session?.id) return;
    setGoalSaving(true);
    await updateSessionGoal(session.id, goal.trim() || null);
    setGoalSaving(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-mono font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {formatElapsed(elapsedSecs)}
        </span>
        {session?.status === "paused" && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Paused</span>
        )}
      </div>
      <div>
        <label htmlFor="session-goal" className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
          What are you working on? (optional)
        </label>
        <input
          id="session-goal"
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onBlur={handleGoalBlur}
          placeholder="e.g. Draft section 2"
          disabled={goalSaving}
          className="block w-full max-w-sm rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
        />
      </div>
    </div>
  );
}
