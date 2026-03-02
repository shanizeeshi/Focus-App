"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Get session events for a session (for timer elapsed calculation).
 */
export async function getSessionEvents(sessionId) {
  if (!sessionId) return { data: [], error: null };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: new Error("Not authenticated") };

  const { data, error } = await supabase
    .from("session_events")
    .select("event_type, triggered_at")
    .eq("session_id", sessionId)
    .order("triggered_at", { ascending: true });

  return { data: data ?? [], error };
}
export async function getActiveSession(workspaceId) {
  if (!workspaceId) return { data: null, error: null };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Not authenticated") };

  const { data: session, error } = await supabase
    .from("sessions")
    .select(
      `
      id,
      project_id,
      workspace_id,
      status,
      session_goal,
      started_at,
      projects (id, name, color)
    `
    )
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .in("status", ["active", "paused"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error };
  return { data: session, error: null };
}

/**
 * Start a new focus session (Tiny Start: tap project → session starts).
 * Fails if user already has an active session in this workspace (DB unique index).
 */
export async function startSession(projectId, workspaceId) {
  if (!projectId || !workspaceId) return { data: null, error: new Error("projectId and workspaceId required") };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Not authenticated") };

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      project_id: projectId,
      user_id: user.id,
      workspace_id: workspaceId,
      status: "active",
    })
    .select("id, project_id, started_at, projects (id, name, color)")
    .single();

  if (sessionError) return { data: null, error: sessionError };

  const { error: eventError } = await supabase.from("session_events").insert({
    session_id: session.id,
    event_type: "start",
    meta: {},
  });
  if (eventError) return { data: null, error: eventError };

  revalidatePath("/");
  return { data: session, error: null };
}

/** Form-friendly: start session from formData (projectId, workspaceId). */
export async function startSessionForm(formData) {
  const projectId = formData.get("projectId")?.toString();
  const workspaceId = formData.get("workspaceId")?.toString();
  return startSession(projectId, workspaceId);
}

/**
 * Pause the current session with an optional distraction reason.
 */
export async function pauseSession(sessionId, reason) {
  if (!sessionId) return { error: new Error("sessionId required") };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Not authenticated") };

  const { error: updateError } = await supabase
    .from("sessions")
    .update({ status: "paused" })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (updateError) return { error: updateError };

  const { error: eventError } = await supabase.from("session_events").insert({
    session_id: sessionId,
    event_type: "pause",
    meta: reason ? { reason } : {},
  });
  if (eventError) return { error: eventError };

  revalidatePath("/");
  return { error: null };
}

/** Form-friendly: pause session from formData (sessionId, reason). */
export async function pauseSessionForm(formData) {
  const sessionId = formData.get("sessionId")?.toString();
  const reason = formData.get("reason")?.toString() || "";
  return pauseSession(sessionId, reason || undefined);
}

/**
 * Resume a paused session.
 */
export async function resumeSession(sessionId) {
  if (!sessionId) return { error: new Error("sessionId required") };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Not authenticated") };

  const { error: updateError } = await supabase
    .from("sessions")
    .update({ status: "active" })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (updateError) return { error: updateError };

  const { error: eventError } = await supabase.from("session_events").insert({
    session_id: sessionId,
    event_type: "resume",
    meta: {},
  });
  if (eventError) return { error: eventError };

  revalidatePath("/");
  return { error: null };
}

/** Form-friendly: resume session from formData (sessionId). */
export async function resumeSessionForm(formData) {
  const sessionId = formData.get("sessionId")?.toString();
  return resumeSession(sessionId);
}

/**
 * Compute total focused seconds from session_events (start→pause, resume→pause, resume→stop).
 */
function computeTotalFocusedSecs(events) {
  if (!events?.length) return 0;
  const sorted = [...events].sort(
    (a, b) => new Date(a.triggered_at) - new Date(b.triggered_at)
  );
  let total = 0;
  let segmentStart = null;
  for (const e of sorted) {
    const t = new Date(e.triggered_at).getTime();
    if (e.event_type === "start" || e.event_type === "resume") {
      segmentStart = t;
    } else if ((e.event_type === "pause" || e.event_type === "stop") && segmentStart != null) {
      total += Math.floor((t - segmentStart) / 1000);
      segmentStart = null;
    }
  }
  return total;
}

/**
 * Stop the session and set end_reason, ended_at, total_focused_secs.
 */
export async function stopSession(sessionId, endReason) {
  if (!sessionId) return { error: new Error("sessionId required") };
  const validReasons = ["stop_today", "complete_project"];
  if (!validReasons.includes(endReason)) {
    return { error: new Error("endReason must be stop_today or complete_project") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Not authenticated") };

  // Insert stop event first so total can include the final segment
  const { error: eventError } = await supabase.from("session_events").insert({
    session_id: sessionId,
    event_type: "stop",
    meta: {},
  });
  if (eventError) return { error: eventError };

  const { data: events, error: eventsError } = await supabase
    .from("session_events")
    .select("event_type, triggered_at")
    .eq("session_id", sessionId)
    .order("triggered_at", { ascending: true });

  if (eventsError) return { error: eventsError };

  const totalFocusedSecs = computeTotalFocusedSecs(events ?? []);

  const { error: updateError } = await supabase
    .from("sessions")
    .update({
      status: "stopped",
      end_reason: endReason,
      ended_at: new Date().toISOString(),
      total_focused_secs: totalFocusedSecs,
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (updateError) return { error: updateError };

  revalidatePath("/");
  redirect("/?stopped=1");
  return { error: null };
}

/** Form-friendly: stop session from formData (sessionId, endReason). */
export async function stopSessionForm(formData) {
  const sessionId = formData.get("sessionId")?.toString();
  const endReason = formData.get("endReason")?.toString() || "stop_today";
  return stopSession(sessionId, endReason);
}
export async function updateSessionGoal(sessionId, goal) {
  if (!sessionId) return { error: new Error("sessionId required") };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Not authenticated") };

  const { error } = await supabase
    .from("sessions")
    .update({ session_goal: goal ?? null })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) return { error };
  revalidatePath("/");
  return { error: null };
}
