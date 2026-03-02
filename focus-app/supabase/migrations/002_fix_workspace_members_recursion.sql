-- Fix: "infinite recursion detected in policy for relation 'workspace_members'"
-- Run this once in Supabase SQL Editor.

DROP POLICY IF EXISTS "Members can view workspace_members" ON public.workspace_members;

CREATE POLICY "Members can view workspace_members"
  ON public.workspace_members FOR SELECT
  USING (user_id = auth.uid());
