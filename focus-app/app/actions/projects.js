"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getDefaultWorkspace() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Not authenticated") };

  const { data: member, error: memberError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (memberError || !member) {
    return { data: null, error: memberError ?? new Error("No workspace found") };
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("id", member.workspace_id)
    .single();

  if (workspaceError) return { data: null, error: workspaceError };
  return { data: workspace, error: null };
}

export async function getProjects(workspaceId) {
  if (!workspaceId) return { data: [], error: null };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, color, status, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  return { data: data ?? [], error };
}

export async function createProject(workspaceId, formData) {
  const name = formData.get("name")?.toString()?.trim();
  const color = formData.get("color")?.toString()?.trim() || "#4A90D9";
  if (!name) return { error: new Error("Name is required") };
  if (!workspaceId) return { error: new Error("Workspace required") };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Not authenticated") };

  const { error } = await supabase.from("projects").insert({
    workspace_id: workspaceId,
    created_by: user.id,
    name,
    color,
    status: "active",
  });

  if (error) return { error };
  revalidatePath("/");
  return { error: null };
}

export async function archiveProject(formData) {
  const projectId = formData.get("projectId")?.toString();
  if (!projectId) return { error: new Error("Project required") };
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", projectId);

  if (error) return { error };
  revalidatePath("/");
  return { error: null };
}
