-- Enable Supabase Realtime for live job-progress updates in the frontend.
--
-- The ShortsStudio dashboard subscribes to:
--   table: video_jobs, filter: video_id=eq.<id>
--   table: videos      (VideoHistory live refresh)
--
-- REPLICA IDENTITY FULL ensures UPDATE payloads include both old and new row
-- values so the client can diff state transitions (pending → processing → completed).

alter table public.video_jobs replica identity full;
alter table public.videos     replica identity full;

-- Add both tables to the Realtime publication.
-- If the publication already includes the table this is a no-op on re-run.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'video_jobs'
  ) then
    alter publication supabase_realtime add table public.video_jobs;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'videos'
  ) then
    alter publication supabase_realtime add table public.videos;
  end if;
end $$;
