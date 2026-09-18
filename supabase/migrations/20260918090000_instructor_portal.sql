-- Instructor portal: instructors create and edit their own courses, lessons,
-- lesson videos (Google Drive) and downloadable resources.
-- Idempotent: safe to run more than once.

-- =========================================================
-- Generated ids for rows created from the app
-- =========================================================
alter table public.courses alter column id set default gen_random_uuid();
alter table public.modules alter column id set default gen_random_uuid();
alter table public.lessons alter column id set default gen_random_uuid();

-- =========================================================
-- Lesson video sources (private: the browser never reads this table)
-- =========================================================
alter table private.lesson_media
  add column if not exists drive_file_id text;

do $$
begin
  -- Widen the provider list and the "one source must be set" rule to include Google Drive.
  alter table private.lesson_media drop constraint if exists lesson_media_provider_check;
  alter table private.lesson_media drop constraint if exists lesson_media_check;
  alter table private.lesson_media
    add constraint lesson_media_provider_check
      check (provider in ('telegram', 'external_hls', 'google_drive'));
  alter table private.lesson_media
    add constraint lesson_media_source_check
      check (
        (provider = 'telegram' and telegram_file_id is not null)
        or (provider = 'external_hls' and external_playback_url is not null)
        or (provider = 'google_drive' and drive_file_id is not null)
      );
exception
  when duplicate_object then null;
end;
$$;

-- =========================================================
-- Downloadable lesson resources (slides, PDFs, files on Drive)
-- =========================================================
create table if not exists public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  title_en text,
  url text not null check (url ~ '^https://'),
  kind text not null default 'file' check (kind in ('slides', 'pdf', 'doc', 'sheet', 'file', 'link')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists lesson_resources_lesson_idx on public.lesson_resources(lesson_id, position);

alter table public.lesson_resources enable row level security;

-- =========================================================
-- Ownership helper
-- =========================================================
create or replace function private.owns_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin() or exists (
    select 1
    from public.courses c
    join public.instructors i on i.id = c.instructor_id
    where c.id = p_course_id and i.user_id = (select auth.uid())
  );
$$;

revoke all on function private.owns_course(uuid) from public, anon;
grant execute on function private.owns_course(uuid) to authenticated;

-- The revenue split and the course owner stay in admin hands.
create or replace function private.guard_course_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    if new.instructor_share_percent is distinct from old.instructor_share_percent
       or new.instructor_id is distinct from old.instructor_id then
      raise exception 'Only an admin can change the revenue split or the course owner' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.guard_course_update() from public, anon, authenticated;

drop trigger if exists courses_guard_update on public.courses;
create trigger courses_guard_update
  before update on public.courses
  for each row execute function private.guard_course_update();

-- =========================================================
-- Grants: instructors edit the content columns of their own courses
-- =========================================================
revoke update on public.courses from authenticated;
grant update (
  is_published, is_free, price, instructor_share_percent, instructor_id,
  code, title, title_en, short_title, short_title_en, description, description_en,
  level, level_en, outcomes, outcomes_en, duration_minutes, cover_url, availability_status, position
) on public.courses to authenticated;

grant insert, update, delete on public.modules to authenticated;
grant insert, update, delete on public.lessons to authenticated;
grant select, insert, update, delete on public.lesson_resources to authenticated;
grant select on public.lesson_resources to anon;

-- =========================================================
-- Policies
-- =========================================================
drop policy if exists "owners read their courses" on public.courses;
create policy "owners read their courses"
on public.courses for select
to authenticated
using ((select private.owns_course(id)));

drop policy if exists "owners update their courses" on public.courses;
create policy "owners update their courses"
on public.courses for update
to authenticated
using ((select private.owns_course(id)))
with check ((select private.owns_course(id)));

drop policy if exists "owners read their modules" on public.modules;
create policy "owners read their modules"
on public.modules for select
to authenticated
using ((select private.owns_course(course_id)));

drop policy if exists "owners write their modules" on public.modules;
create policy "owners write their modules"
on public.modules for all
to authenticated
using ((select private.owns_course(course_id)))
with check ((select private.owns_course(course_id)));

drop policy if exists "owners read their lessons" on public.lessons;
create policy "owners read their lessons"
on public.lessons for select
to authenticated
using ((select private.owns_course(course_id)));

drop policy if exists "owners write their lessons" on public.lessons;
create policy "owners write their lessons"
on public.lessons for all
to authenticated
using ((select private.owns_course(course_id)))
with check ((select private.owns_course(course_id)));

-- Resources follow the lesson: preview lessons are open, the rest need an enrollment.
drop policy if exists "resources of open lessons are readable" on public.lesson_resources;
create policy "resources of open lessons are readable"
on public.lesson_resources for select
to anon, authenticated
using (
  exists (
    select 1
    from public.lessons l
    join public.courses c on c.id = l.course_id
    where l.id = lesson_resources.lesson_id
      and c.is_published
      and c.availability_status = 'available'
      and l.is_preview
  )
);

drop policy if exists "enrolled learners read resources" on public.lesson_resources;
create policy "enrolled learners read resources"
on public.lesson_resources for select
to authenticated
using (
  exists (
    select 1
    from public.lessons l
    join public.enrollments e on e.course_id = l.course_id
    where l.id = lesson_resources.lesson_id
      and e.user_id = (select auth.uid())
  )
);

drop policy if exists "owners manage resources" on public.lesson_resources;
create policy "owners manage resources"
on public.lesson_resources for all
to authenticated
using (
  exists (
    select 1 from public.lessons l
    where l.id = lesson_resources.lesson_id and (select private.owns_course(l.course_id))
  )
)
with check (
  exists (
    select 1 from public.lessons l
    where l.id = lesson_resources.lesson_id and (select private.owns_course(l.course_id))
  )
);

-- =========================================================
-- Authoring API
-- =========================================================
create or replace function public.create_course(
  p_title text,
  p_title_en text default null,
  p_code text default null,
  p_description text default null,
  p_description_en text default null,
  p_level text default null,
  p_level_en text default null,
  p_instructor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_instructor uuid := coalesce(p_instructor_id, private.current_instructor_id());
  v_title text := btrim(coalesce(p_title, ''));
  v_base text;
  v_slug text;
  v_course_id uuid;
  v_suffix integer := 1;
begin
  if not private.is_admin() and (v_instructor is null or v_instructor <> private.current_instructor_id()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_instructor is null then
    raise exception 'An instructor is required' using errcode = '22023';
  end if;
  if char_length(v_title) < 3 then
    raise exception 'Course title is too short' using errcode = '22023';
  end if;

  -- Slug from the English title when present, otherwise the code, otherwise a generated one.
  v_base := lower(btrim(coalesce(nullif(btrim(coalesce(p_title_en, '')), ''), nullif(btrim(coalesce(p_code, '')), ''), 'course')));
  v_base := regexp_replace(v_base, '[^a-z0-9]+', '-', 'g');
  v_base := btrim(regexp_replace(v_base, '-+', '-', 'g'), '-');
  if v_base = '' then
    v_base := 'course';
  end if;

  v_slug := v_base;
  while exists (select 1 from public.courses c where c.slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base || '-' || v_suffix;
  end loop;

  insert into public.courses (
    slug, code, title, title_en, short_title, short_title_en, description, description_en,
    level, level_en, instructor_id, is_published, is_free, price, availability_status, position
  )
  values (
    v_slug,
    nullif(btrim(coalesce(p_code, '')), ''),
    v_title,
    nullif(btrim(coalesce(p_title_en, '')), ''),
    v_title,
    nullif(btrim(coalesce(p_title_en, '')), ''),
    coalesce(nullif(btrim(coalesce(p_description, '')), ''), v_title),
    nullif(btrim(coalesce(p_description_en, '')), ''),
    coalesce(nullif(btrim(coalesce(p_level, '')), ''), 'مبتدئ'),
    nullif(btrim(coalesce(p_level_en, '')), ''),
    v_instructor,
    false,
    true,
    0,
    'available',
    coalesce((select max(c.position) from public.courses c), 0) + 1
  )
  returning id into v_course_id;

  insert into public.modules (course_id, title, title_en, position)
  values (v_course_id, 'محتوى الكورس', 'Course content', 1);

  return jsonb_build_object('id', v_course_id, 'slug', v_slug);
end;
$$;

-- Stores (or clears) the Google Drive file behind a lesson.
create or replace function public.set_lesson_video(p_lesson_id uuid, p_drive_file_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course uuid;
  v_file text := nullif(btrim(coalesce(p_drive_file_id, '')), '');
begin
  select l.course_id into v_course from public.lessons l where l.id = p_lesson_id;
  if v_course is null then
    raise exception 'Lesson not found' using errcode = 'P0002';
  end if;
  if not private.owns_course(v_course) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  if v_file is null then
    delete from private.lesson_media where lesson_id = p_lesson_id;
    return jsonb_build_object('lesson_id', p_lesson_id, 'drive_file_id', null);
  end if;

  insert into private.lesson_media (lesson_id, provider, drive_file_id, mime_type)
  values (p_lesson_id, 'google_drive', v_file, 'video/mp4')
  on conflict (lesson_id) do update set
    provider = 'google_drive',
    drive_file_id = excluded.drive_file_id,
    mime_type = coalesce(private.lesson_media.mime_type, 'video/mp4'),
    updated_at = now();

  return jsonb_build_object('lesson_id', p_lesson_id, 'drive_file_id', v_file);
end;
$$;

-- Everything the authoring screen needs for one course: lessons, videos, resources, progress.
create or replace function public.get_course_content(p_course_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not private.owns_course(p_course_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'course', (
      select jsonb_build_object(
        'id', c.id, 'slug', c.slug, 'code', c.code,
        'title', c.title, 'title_en', c.title_en,
        'description', c.description, 'description_en', c.description_en,
        'level', c.level, 'level_en', c.level_en,
        'outcomes', c.outcomes, 'outcomes_en', c.outcomes_en,
        'cover_url', c.cover_url, 'duration_minutes', c.duration_minutes,
        'is_published', c.is_published, 'is_free', c.is_free, 'price', c.price,
        'instructor_share_percent', c.instructor_share_percent,
        'availability_status', c.availability_status,
        'module_id', (select m.id from public.modules m where m.course_id = c.id order by m.position limit 1),
        'enrollments', (select count(*) from public.enrollments e where e.course_id = c.id)
      )
      from public.courses c where c.id = p_course_id
    ),
    'lessons', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', l.id,
          'title', l.title,
          'title_en', l.title_en,
          'duration_seconds', l.duration_seconds,
          'position', l.position,
          'is_preview', l.is_preview,
          'drive_file_id', lm.drive_file_id,
          'completions', (
            select count(*) from public.lesson_progress p
            where p.lesson_id = l.id and p.completed_at is not null
          ),
          'watchers', (select count(*) from public.lesson_progress p where p.lesson_id = l.id),
          'resources', coalesce((
            select jsonb_agg(
              jsonb_build_object('id', r.id, 'title', r.title, 'title_en', r.title_en, 'url', r.url, 'kind', r.kind, 'position', r.position)
              order by r.position
            )
            from public.lesson_resources r where r.lesson_id = l.id
          ), '[]'::jsonb)
        )
        order by l.position
      )
      from public.lessons l
      left join private.lesson_media lm on lm.lesson_id = l.id
      where l.course_id = p_course_id
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.create_course(text, text, text, text, text, text, text, uuid) from public, anon;
revoke all on function public.set_lesson_video(uuid, text) from public, anon;
revoke all on function public.get_course_content(uuid) from public, anon;
grant execute on function public.create_course(text, text, text, text, text, text, text, uuid) to authenticated;
grant execute on function public.set_lesson_video(uuid, text) to authenticated;
grant execute on function public.get_course_content(uuid) to authenticated;

-- =========================================================
-- Seed: slides of the CCNA 1 introduction lesson
-- =========================================================
insert into public.lesson_resources (id, lesson_id, title, title_en, url, kind, position)
values (
  '00000000-0000-4000-8000-000000002101',
  '00000000-0000-4000-8000-000000001101',
  'شرائح المحاضرة التعريفية',
  'Introduction slides',
  'https://docs.google.com/presentation/d/1R7Eb5axC6OVukOMKj7RUMGWglbNYMVhy/edit',
  'slides',
  1
)
on conflict (id) do update set
  lesson_id = excluded.lesson_id,
  title = excluded.title,
  title_en = excluded.title_en,
  url = excluded.url,
  kind = excluded.kind,
  position = excluded.position;

-- =========================================================
-- Server-side lookup used by the Cloudflare Worker (service role only)
-- =========================================================
create or replace function public.get_lesson_video(p_lesson_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'provider', m.provider,
    'drive_file_id', m.drive_file_id,
    'external_playback_url', m.external_playback_url,
    'mime_type', coalesce(m.mime_type, 'video/mp4')
  )
  from private.lesson_media m
  where m.lesson_id = p_lesson_id;
$$;

revoke all on function public.get_lesson_video(uuid) from public, anon, authenticated;
grant execute on function public.get_lesson_video(uuid) to service_role;
