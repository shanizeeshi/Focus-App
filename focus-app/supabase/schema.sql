-- Focus App — MVP 1 full schema
-- Run this in Supabase Dashboard → SQL Editor → New query

-- Extensions (Supabase usually has these)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  timezone TEXT DEFAULT 'UTC',
  focus_duration_mins INT DEFAULT 25,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Workspace members
CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'member')),
  PRIMARY KEY (workspace_id, user_id)
);

-- 4. Projects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#4A90D9',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped', 'completed')),
  end_reason TEXT CHECK (end_reason IN ('stop_today', 'complete_project', 'abandoned', 'auto_timeout')),
  session_goal TEXT,
  session_reflection TEXT,
  mood_score INT CHECK (mood_score >= 1 AND mood_score <= 5),
  next_session_goals TEXT,
  total_focused_secs INT DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- One active session per user per workspace (MVP 1 requirement)
CREATE UNIQUE INDEX IF NOT EXISTS one_active_session_per_user
  ON public.sessions (workspace_id, user_id)
  WHERE status = 'active';

-- 6. Session events (start / pause / resume / stop)
CREATE TABLE IF NOT EXISTS public.session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('start', 'pause', 'resume', 'stop')),
  triggered_at TIMESTAMPTZ DEFAULT now(),
  meta JSONB DEFAULT '{}'
);

-- 7. Focus blocks (Pomodoro-style, optional for MVP 1)
CREATE TABLE IF NOT EXISTS public.focus_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_mins INT DEFAULT 25,
  completed BOOLEAN DEFAULT false
);

-- 8. Todos
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_text TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_in_session UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'voice_session', 'ai_suggested')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Suggested actions (MVP 2 — AI-suggested todos, human approve/dismiss)
CREATE TABLE IF NOT EXISTS public.suggested_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggested_text TEXT NOT NULL,
  ai_confidence TEXT CHECK (ai_confidence IN ('high', 'medium', 'low')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed')),
  todo_id UUID REFERENCES public.todos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggested_actions ENABLE ROW LEVEL SECURITY;

-- RLS: profiles — users can read/update own
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS: workspaces — members can read; created_by can update
CREATE POLICY "Members can view workspace"
  ON public.workspaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspaces.id AND wm.user_id = auth.uid()
    )
  );
CREATE POLICY "Creator can insert workspace"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator can update workspace"
  ON public.workspaces FOR UPDATE
  USING (auth.uid() = created_by);

-- RLS: workspace_members — users see own rows (no self-reference to avoid recursion)
CREATE POLICY "Members can view workspace_members"
  ON public.workspace_members FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Owner can insert workspace_members"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid() AND wm.role = 'owner'
    )
  );
CREATE POLICY "Creator can add self as workspace owner"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_members.workspace_id AND w.created_by = auth.uid()
    )
  );
CREATE POLICY "Owner can delete workspace_members"
  ON public.workspace_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid() AND wm.role = 'owner'
    )
  );

-- RLS: projects — workspace members can CRUD
CREATE POLICY "Members can view projects"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = projects.workspace_id AND wm.user_id = auth.uid()
    )
  );
CREATE POLICY "Members can insert projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = projects.workspace_id AND wm.user_id = auth.uid()
    )
  );
CREATE POLICY "Members can update projects"
  ON public.projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = projects.workspace_id AND wm.user_id = auth.uid()
    )
  );
CREATE POLICY "Members can delete projects"
  ON public.projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = projects.workspace_id AND wm.user_id = auth.uid()
    )
  );

-- RLS: sessions — user can CRUD own sessions
CREATE POLICY "Users can view own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions"
  ON public.sessions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS: session_events — via session ownership
CREATE POLICY "Users can view session_events for own sessions"
  ON public.session_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_events.session_id AND s.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert session_events for own sessions"
  ON public.session_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_events.session_id AND s.user_id = auth.uid()
    )
  );

-- RLS: focus_blocks — via session ownership
CREATE POLICY "Users can view focus_blocks for own sessions"
  ON public.focus_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = focus_blocks.session_id AND s.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert focus_blocks for own sessions"
  ON public.focus_blocks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = focus_blocks.session_id AND s.user_id = auth.uid()
    )
  );

-- RLS: todos — user can CRUD own todos
CREATE POLICY "Users can view own todos"
  ON public.todos FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own todos"
  ON public.todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own todos"
  ON public.todos FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own todos"
  ON public.todos FOR DELETE
  USING (auth.uid() = user_id);

-- RLS: suggested_actions — user can view/update own
CREATE POLICY "Users can view own suggested_actions"
  ON public.suggested_actions FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert suggested_actions"
  ON public.suggested_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own suggested_actions"
  ON public.suggested_actions FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-create profile on signup (optional but recommended)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  -- Create default "Personal" workspace and add user as owner
  new_workspace_id := gen_random_uuid();
  INSERT INTO public.workspaces (id, name, created_by)
  VALUES (new_workspace_id, 'Personal', NEW.id);
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
