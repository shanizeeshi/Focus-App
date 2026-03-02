-- Run this once in Supabase SQL Editor if you see "No workspace found".
-- It allows the workspace creator to add themselves as owner (fixes users who signed up before the trigger existed).

CREATE POLICY "Creator can add self as workspace owner"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_members.workspace_id AND w.created_by = auth.uid()
    )
  );
