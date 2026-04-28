-- ─── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── Tables ───────────────────────────────────────────────────────────────────

create table public.workspaces (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  created_by uuid        references auth.users(id),
  created_at timestamptz not null default now()
);

-- Shadow of auth.users; auto-created by trigger on signup
create table public.users (
  id         uuid        primary key references auth.users(id) on delete cascade,
  name       text,
  email      text,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  id           uuid        primary key default gen_random_uuid(),
  workspace_id uuid        not null references public.workspaces(id) on delete cascade,
  user_id      uuid        not null references public.users(id) on delete cascade,
  role         text        not null default 'member' check (role in ('admin', 'member')),
  invited_by   uuid        references auth.users(id),
  created_at   timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- One row per provider per workspace.
-- For ElevenLabs: encrypted_key = API key, account_name = voice_id.
-- For TikTok/Instagram: encrypted_key = access_token, account_name = handle.
create table public.workspace_connections (
  id            uuid        primary key default gen_random_uuid(),
  workspace_id  uuid        not null references public.workspaces(id) on delete cascade,
  provider      text        not null check (provider in ('heygen', 'elevenlabs', 'twelvelabs', 'tiktok', 'youtube', 'instagram')),
  encrypted_key text        not null,
  account_name  text,
  updated_at    timestamptz not null default now(),
  unique (workspace_id, provider)
);

create table public.videos (
  id                uuid        primary key default gen_random_uuid(),
  workspace_id      uuid        not null references public.workspaces(id) on delete cascade,
  created_by        uuid        references auth.users(id),
  title             text,
  mode              text        check (mode in ('news', 'remix', 'reaction')),
  language          text        not null default 'fr',
  duration_seconds  integer,
  script            text,
  platform_captions jsonb       not null default '{}',
  voice_provider    text        not null default 'heygen' check (voice_provider in ('heygen', 'elevenlabs')),
  avatar_id         text,
  effects           jsonb       not null default '[]',
  status            text        not null default 'draft' check (status in ('draft', 'processing', 'ready', 'posted', 'failed')),
  video_url         text,
  -- denormalised source content metadata
  source_url        text,
  source_title      text,
  source_summary    text,
  platforms         text[]      not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table public.video_jobs (
  id           uuid        primary key default gen_random_uuid(),
  video_id     uuid        references public.videos(id) on delete cascade,
  workspace_id uuid        references public.workspaces(id) on delete cascade,
  step         text        not null check (step in ('download', 'analyze', 'extract', 'generate', 'merge', 'post')),
  status       text        not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  progress     integer     not null default 0 check (progress between 0 and 100),
  error        text,
  bull_job_id  text,
  result       jsonb,
  started_at   timestamptz,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index workspace_members_workspace_idx  on public.workspace_members(workspace_id);
create index workspace_members_user_id_idx    on public.workspace_members(user_id);
create index workspace_connections_ws_idx     on public.workspace_connections(workspace_id);
create index videos_workspace_id_idx          on public.videos(workspace_id);
create index videos_status_idx               on public.videos(status);
create index video_jobs_video_id_idx          on public.video_jobs(video_id);
create index video_jobs_workspace_id_idx      on public.video_jobs(workspace_id);
create index video_jobs_status_idx            on public.video_jobs(status);

-- ─── Trigger: auto-create user profile on signup ─────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── RLS helper functions ─────────────────────────────────────────────────────
-- SECURITY DEFINER so they run as the function owner and bypass RLS on
-- workspace_members, preventing infinite recursion in policies.

create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
  )
$$;

create or replace function public.is_workspace_admin(ws_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and role = 'admin'
  )
$$;

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.workspaces            enable row level security;
alter table public.users                 enable row level security;
alter table public.workspace_members     enable row level security;
alter table public.workspace_connections enable row level security;
alter table public.videos                enable row level security;
alter table public.video_jobs            enable row level security;

-- ── users ────────────────────────────────────────────────────────────────────
-- Users can only read and update their own profile.

create policy "users_select" on public.users
  for select using (auth.uid() = id);

create policy "users_update" on public.users
  for update using (auth.uid() = id);

-- ── workspaces ───────────────────────────────────────────────────────────────
-- Members read; admins update; anyone can create (constrained to own uid).

create policy "workspaces_select" on public.workspaces
  for select using (public.is_workspace_member(id));

create policy "workspaces_insert" on public.workspaces
  for insert with check (created_by = auth.uid());

create policy "workspaces_update" on public.workspaces
  for update using (public.is_workspace_admin(id));

-- ── workspace_members ────────────────────────────────────────────────────────
-- Members read all peers in their workspace.
-- Self-insert allowed only when inserting into a workspace you created that
--   has no members yet (bootstrap). After that, only admins can add members.
-- Only admins can change roles or remove members.

create policy "wm_select" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

create policy "wm_insert" on public.workspace_members
  for insert with check (
    -- Bootstrap: you are adding yourself to a workspace you created with no members yet
    (
      user_id = auth.uid()
      and exists (
        select 1 from public.workspaces
        where id = workspace_members.workspace_id
          and created_by = auth.uid()
      )
      and not exists (
        select 1 from public.workspace_members
        where workspace_id = workspace_members.workspace_id
      )
    )
    -- Or an existing admin is adding someone
    or public.is_workspace_admin(workspace_id)
  );

create policy "wm_update" on public.workspace_members
  for update using (public.is_workspace_admin(workspace_id));

create policy "wm_delete" on public.workspace_members
  for delete using (public.is_workspace_admin(workspace_id));

-- ── workspace_connections ────────────────────────────────────────────────────
-- Members read (to use keys client-side); only admins write.

create policy "wconn_select" on public.workspace_connections
  for select using (public.is_workspace_member(workspace_id));

create policy "wconn_insert" on public.workspace_connections
  for insert with check (public.is_workspace_admin(workspace_id));

create policy "wconn_update" on public.workspace_connections
  for update using (public.is_workspace_admin(workspace_id));

create policy "wconn_delete" on public.workspace_connections
  for delete using (public.is_workspace_admin(workspace_id));

-- ── videos ───────────────────────────────────────────────────────────────────
-- All workspace members can create and modify videos; admins can delete.

create policy "videos_select" on public.videos
  for select using (public.is_workspace_member(workspace_id));

create policy "videos_insert" on public.videos
  for insert with check (public.is_workspace_member(workspace_id));

create policy "videos_update" on public.videos
  for update using (public.is_workspace_member(workspace_id));

create policy "videos_delete" on public.videos
  for delete using (public.is_workspace_admin(workspace_id));

-- ── video_jobs ───────────────────────────────────────────────────────────────
-- Members read job status; backend writes via service role (bypasses RLS).

create policy "vjobs_select" on public.video_jobs
  for select using (public.is_workspace_member(workspace_id));
