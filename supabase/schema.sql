-- GloryTech Academy — full database schema.
-- Consolidates supabase/migrations/* into one script for the Supabase SQL Editor.
-- Safe to re-run: every statement is idempotent.

-- =========================================================
-- Schemas
-- =========================================================
create schema if not exists private;

-- =========================================================
-- Tables
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  phone text,
  affiliation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key,
  slug text not null unique,
  title text not null,
  short_title text not null,
  description text not null,
  level text not null,
  accent text not null default 'teal' check (accent in ('teal', 'orange')),
  outcomes text[] not null default '{}',
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  is_published boolean not null default false,
  is_free boolean not null default true,
  availability_status text not null default 'available'
    check (availability_status in ('available', 'coming_soon')),
  cover_url text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.modules (
  id uuid primary key,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key,
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  position integer not null default 0,
  is_preview boolean not null default false,
  telegram_message_id bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table if not exists public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  progress_seconds integer not null default 0 check (progress_seconds >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- Private video source data; only the service role (backend worker) can read it.
create table if not exists private.lesson_media (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  provider text not null default 'telegram' check (provider in ('telegram', 'external_hls')),
  telegram_chat_id text,
  telegram_message_id bigint,
  telegram_file_id text,
  external_playback_url text,
  mime_type text,
  bytes bigint check (bytes is null or bytes >= 0),
  updated_at timestamptz not null default now(),
  check (
    (provider = 'telegram' and telegram_file_id is not null)
    or (provider = 'external_hls' and external_playback_url is not null)
  )
);

-- Columns added after the first release (no-ops on a fresh database).
alter table public.profiles
  add column if not exists phone text,
  add column if not exists affiliation text;

alter table public.courses
  add column if not exists availability_status text not null default 'available',
  add column if not exists cover_url text;

-- =========================================================
-- Constraints
-- =========================================================
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'courses_availability_status_check') then
    alter table public.courses
      add constraint courses_availability_status_check
        check (availability_status in ('available', 'coming_soon'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_display_name_required') then
    alter table public.profiles
      add constraint profiles_display_name_required
        check (display_name is not null and char_length(btrim(display_name)) between 2 and 120) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_phone_required') then
    alter table public.profiles
      add constraint profiles_phone_required
        check (
          phone is not null
          and phone ~ '^[+0-9][0-9 ()-]{6,19}$'
          and char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 7 and 15
        ) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_affiliation_length') then
    alter table public.profiles
      add constraint profiles_affiliation_length
        check (affiliation is null or char_length(btrim(affiliation)) between 1 and 120) not valid;
  end if;
end;
$$;

comment on column public.profiles.phone is 'Phone number supplied by the learner during free account creation.';
comment on column public.profiles.affiliation is 'Optional school, university, institute, or employer.';

-- =========================================================
-- Indexes
-- =========================================================
create index if not exists modules_course_position_idx on public.modules(course_id, position);
create index if not exists lessons_course_position_idx on public.lessons(course_id, position);
create index if not exists lessons_module_position_idx on public.lessons(module_id, position);
create index if not exists enrollments_user_idx on public.enrollments(user_id);
create index if not exists enrollments_course_idx on public.enrollments(course_id);
create index if not exists lesson_progress_user_idx on public.lesson_progress(user_id);
create index if not exists lesson_progress_lesson_idx on public.lesson_progress(lesson_id);

-- =========================================================
-- updated_at maintenance
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

drop trigger if exists lesson_media_set_updated_at on private.lesson_media;
create trigger lesson_media_set_updated_at
  before update on private.lesson_media
  for each row execute function public.set_updated_at();

-- =========================================================
-- Profile creation on signup
-- Reads display_name / phone / affiliation from the signup metadata.
-- =========================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  profile_phone text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');
  profile_affiliation text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'affiliation', '')), '');
begin
  if profile_name is null or char_length(profile_name) not between 2 and 120 then
    raise exception 'A valid display name is required to create an account.' using errcode = '23514';
  end if;

  if profile_phone is null
    or profile_phone !~ '^[+0-9][0-9 ()-]{6,19}$'
    or char_length(regexp_replace(profile_phone, '[^0-9]', '', 'g')) not between 7 and 15 then
    raise exception 'A valid phone number is required to create an account.' using errcode = '23514';
  end if;

  if profile_affiliation is not null and char_length(profile_affiliation) > 120 then
    raise exception 'Affiliation must not exceed 120 characters.' using errcode = '22001';
  end if;

  insert into public.profiles (id, display_name, phone, affiliation)
  values (new.id, profile_name, profile_phone, profile_affiliation);

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- =========================================================
-- Row Level Security & grants
-- =========================================================
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table private.lesson_media enable row level security;

revoke all on schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;

grant select on public.courses, public.modules, public.lessons to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.enrollments to authenticated;
grant select, insert, update on public.lesson_progress to authenticated;

revoke all on schema private from public, anon, authenticated;
revoke all on private.lesson_media from public, anon, authenticated;
grant usage on schema private to service_role;
grant all on private.lesson_media to service_role;

-- Catalog: public can read published courses; modules/lessons only for available ones.
drop policy if exists "published courses are readable" on public.courses;
create policy "published courses are readable"
on public.courses for select
to anon, authenticated
using (is_published);

drop policy if exists "published course modules are readable" on public.modules;
drop policy if exists "available course modules are readable" on public.modules;
create policy "available course modules are readable"
on public.modules for select
to anon, authenticated
using (
  exists (
    select 1 from public.courses c
    where c.id = modules.course_id
      and c.is_published
      and c.availability_status = 'available'
  )
);

drop policy if exists "published course lessons are readable" on public.lessons;
drop policy if exists "available course lessons are readable" on public.lessons;
create policy "available course lessons are readable"
on public.lessons for select
to anon, authenticated
using (
  exists (
    select 1 from public.courses c
    where c.id = lessons.course_id
      and c.is_published
      and c.availability_status = 'available'
  )
);

-- Profiles: each user manages only their own row.
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "users create own profile" on public.profiles;
create policy "users create own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Enrollments: users enroll themselves in available free courses only.
drop policy if exists "users read own enrollments" on public.enrollments;
create policy "users read own enrollments"
on public.enrollments for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users enroll themselves in published free courses" on public.enrollments;
drop policy if exists "users enroll themselves in available free courses" on public.enrollments;
create policy "users enroll themselves in available free courses"
on public.enrollments for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.courses c
    where c.id = enrollments.course_id
      and c.is_published
      and c.is_free
      and c.availability_status = 'available'
  )
);

-- Progress: users track progress only on lessons of courses they are enrolled in.
drop policy if exists "users read own progress" on public.lesson_progress;
create policy "users read own progress"
on public.lesson_progress for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users create own progress" on public.lesson_progress;
create policy "users create own progress"
on public.lesson_progress for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.lessons l
    join public.enrollments e on e.course_id = l.course_id
    where l.id = lesson_progress.lesson_id and e.user_id = (select auth.uid())
  )
);

drop policy if exists "users update own progress" on public.lesson_progress;
create policy "users update own progress"
on public.lesson_progress for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.lessons l
    join public.enrollments e on e.course_id = l.course_id
    where l.id = lesson_progress.lesson_id and e.user_id = (select auth.uid())
  )
);

-- #########################################################
-- Instructors, billing and CCNA content (migrations/20260917090000_instructors_billing_ccna_content.sql)
-- #########################################################

-- Instructors, admin role, revenue split billing (70% instructor / 30% platform),
-- bilingual catalog fields, and the real CCNA 1 / CCNA 4 lesson structure.
-- Idempotent: safe to run more than once.

-- Also defined by supabase/schema.sql; repeated so the migration chain has it too.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

-- =========================================================
-- Admin role
-- =========================================================
create table if not exists private.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table private.admins enable row level security;
revoke all on private.admins from public, anon, authenticated;

-- =========================================================
-- Instructors
-- =========================================================
create table if not exists public.instructors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  name_en text not null,
  title text,
  title_en text,
  bio text,
  bio_en text,
  photo_url text,
  expertise text[] not null default '{}',
  expertise_en text[] not null default '{}',
  certifications jsonb not null default '[]'::jsonb check (jsonb_typeof(certifications) = 'array'),
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.instructors.user_id is 'Login account of the instructor; links the teaching dashboard.';

alter table public.instructors enable row level security;

drop trigger if exists instructors_set_updated_at on public.instructors;
create trigger instructors_set_updated_at
  before update on public.instructors
  for each row execute function public.set_updated_at();

-- =========================================================
-- Role helpers (used by policies and dashboard functions)
-- =========================================================
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.admins a where a.user_id = (select auth.uid()));
$$;

create or replace function private.current_instructor_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select i.id from public.instructors i where i.user_id = (select auth.uid()) limit 1;
$$;

-- Policies run as the caller, so authenticated users need to reach these two helpers.
-- Tables inside the private schema stay revoked.
grant usage on schema private to authenticated;
revoke all on function private.is_admin() from public, anon;
revoke all on function private.current_instructor_id() from public, anon;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.current_instructor_id() to authenticated;

-- =========================================================
-- Catalog: bilingual fields, ownership, pricing
-- =========================================================
alter table public.courses
  add column if not exists instructor_id uuid references public.instructors(id) on delete set null,
  add column if not exists code text,
  add column if not exists title_en text,
  add column if not exists short_title_en text,
  add column if not exists description_en text,
  add column if not exists level_en text,
  add column if not exists outcomes_en text[] not null default '{}',
  add column if not exists price numeric(10,2) not null default 0,
  add column if not exists instructor_share_percent numeric(5,2) not null default 70;

comment on column public.courses.price is 'Course price in Libyan dinars (LYD). 0 for free courses.';
comment on column public.courses.instructor_share_percent is 'Instructor share of each payment; the platform keeps the rest.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'courses_price_check') then
    alter table public.courses add constraint courses_price_check check (price >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'courses_instructor_share_percent_check') then
    alter table public.courses add constraint courses_instructor_share_percent_check
      check (instructor_share_percent between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'courses_free_has_no_price') then
    alter table public.courses add constraint courses_free_has_no_price check (not is_free or price = 0);
  end if;
end;
$$;

create index if not exists courses_instructor_idx on public.courses(instructor_id);

alter table public.modules add column if not exists title_en text;
alter table public.lessons add column if not exists title_en text;

-- =========================================================
-- Billing: payments and instructor payouts (amounts in LYD)
-- =========================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  -- Snapshot of the course owner and split when the payment was recorded.
  instructor_id uuid references public.instructors(id) on delete set null,
  instructor_share_percent numeric(5,2) not null check (instructor_share_percent between 0 and 100),
  amount numeric(10,2) not null check (amount > 0),
  status text not null default 'paid' check (status in ('pending', 'paid', 'refunded')),
  method text not null default 'bank_transfer'
    check (method in ('bank_transfer', 'cash', 'card', 'mobile_wallet', 'other')),
  reference text check (reference is null or char_length(reference) <= 120),
  note text check (note is null or char_length(note) <= 500),
  paid_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.instructors(id) on delete restrict,
  amount numeric(10,2) not null check (amount > 0),
  method text not null default 'bank_transfer'
    check (method in ('bank_transfer', 'cash', 'card', 'mobile_wallet', 'other')),
  reference text check (reference is null or char_length(reference) <= 120),
  note text check (note is null or char_length(note) <= 500),
  paid_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists payments_course_idx on public.payments(course_id);
create index if not exists payments_user_idx on public.payments(user_id);
create index if not exists payments_instructor_idx on public.payments(instructor_id);
create index if not exists payments_paid_at_idx on public.payments(paid_at);
create index if not exists payouts_instructor_idx on public.payouts(instructor_id);

alter table public.payments enable row level security;
alter table public.payouts enable row level security;

create or replace function private.snapshot_payment_split()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.instructor_id is null or new.instructor_share_percent is null then
    select coalesce(new.instructor_id, c.instructor_id), coalesce(new.instructor_share_percent, c.instructor_share_percent)
      into new.instructor_id, new.instructor_share_percent
    from public.courses c
    where c.id = new.course_id;
  end if;
  return new;
end;
$$;

-- A paid payment gives the learner access to the course.
create or replace function private.enroll_on_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'paid' and new.user_id is not null then
    insert into public.enrollments (user_id, course_id)
    values (new.user_id, new.course_id)
    on conflict (user_id, course_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.snapshot_payment_split() from public, anon, authenticated;
revoke all on function private.enroll_on_payment() from public, anon, authenticated;

drop trigger if exists payments_snapshot_split on public.payments;
create trigger payments_snapshot_split
  before insert on public.payments
  for each row execute function private.snapshot_payment_split();

drop trigger if exists payments_enroll_learner on public.payments;
create trigger payments_enroll_learner
  after insert or update of status on public.payments
  for each row execute function private.enroll_on_payment();

-- =========================================================
-- Grants (Supabase grants everything on new tables by default; narrow it)
-- =========================================================
revoke all on public.instructors from anon, authenticated;
grant select (id, slug, name, name_en, title, title_en, bio, bio_en, photo_url, expertise, expertise_en, certifications, is_active, position)
  on public.instructors to anon, authenticated;

revoke update on public.courses from authenticated;
grant update (is_published, is_free, price, instructor_share_percent, instructor_id) on public.courses to authenticated;

revoke all on public.payments from anon, authenticated;
grant select, insert, update on public.payments to authenticated;

revoke all on public.payouts from anon, authenticated;
grant select, insert on public.payouts to authenticated;

-- =========================================================
-- Policies
-- =========================================================
drop policy if exists "active instructors are readable" on public.instructors;
create policy "active instructors are readable"
on public.instructors for select
to anon, authenticated
using (is_active);

drop policy if exists "admins read all instructors" on public.instructors;
create policy "admins read all instructors"
on public.instructors for select
to authenticated
using ((select private.is_admin()));

drop policy if exists "admins read all courses" on public.courses;
create policy "admins read all courses"
on public.courses for select
to authenticated
using ((select private.is_admin()));

drop policy if exists "admins update courses" on public.courses;
create policy "admins update courses"
on public.courses for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "admins read all enrollments" on public.enrollments;
create policy "admins read all enrollments"
on public.enrollments for select
to authenticated
using ((select private.is_admin()));

drop policy if exists "admins enroll learners" on public.enrollments;
create policy "admins enroll learners"
on public.enrollments for insert
to authenticated
with check ((select private.is_admin()));

drop policy if exists "users read own payments" on public.payments;
create policy "users read own payments"
on public.payments for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "admins read payments" on public.payments;
create policy "admins read payments"
on public.payments for select
to authenticated
using ((select private.is_admin()));

drop policy if exists "admins record payments" on public.payments;
create policy "admins record payments"
on public.payments for insert
to authenticated
with check ((select private.is_admin()));

drop policy if exists "admins update payments" on public.payments;
create policy "admins update payments"
on public.payments for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "instructors read own payouts" on public.payouts;
create policy "instructors read own payouts"
on public.payouts for select
to authenticated
using (instructor_id = (select private.current_instructor_id()));

drop policy if exists "admins read payouts" on public.payouts;
create policy "admins read payouts"
on public.payouts for select
to authenticated
using ((select private.is_admin()));

drop policy if exists "admins record payouts" on public.payouts;
create policy "admins record payouts"
on public.payouts for insert
to authenticated
with check ((select private.is_admin()));

-- =========================================================
-- Dashboard API
-- =========================================================
create or replace function public.get_my_roles()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'is_admin', exists (select 1 from private.admins a where a.user_id = (select auth.uid())),
    'instructor', (
      select jsonb_build_object('id', i.id, 'slug', i.slug, 'name', i.name, 'name_en', i.name_en)
      from public.instructors i
      where i.user_id = (select auth.uid())
      limit 1
    )
  );
$$;

-- Admins get the whole platform (or one instructor with p_instructor_id);
-- instructors always get only their own courses and earnings.
create or replace function public.get_dashboard(p_instructor_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean := private.is_admin();
  v_scope uuid;
  v_result jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if v_is_admin then
    v_scope := p_instructor_id;
  else
    v_scope := private.current_instructor_id();
    if v_scope is null or (p_instructor_id is not null and p_instructor_id <> v_scope) then
      raise exception 'Not allowed' using errcode = '42501';
    end if;
  end if;

  if v_scope is not null and not exists (select 1 from public.instructors i where i.id = v_scope) then
    raise exception 'Instructor not found' using errcode = 'P0002';
  end if;

  with
  scoped_courses as (
    select c.* from public.courses c
    where v_scope is null or c.instructor_id = v_scope
  ),
  course_lessons as (
    select l.course_id, count(*)::int as lessons
    from public.lessons l
    where l.course_id in (select sc.id from scoped_courses sc)
    group by l.course_id
  ),
  learner_rows as (
    select
      e.user_id,
      e.course_id,
      e.enrolled_at,
      coalesce(cl.lessons, 0) as lessons,
      count(p.lesson_id) filter (where p.completed_at is not null)::int as completed_lessons,
      max(p.updated_at) as last_activity
    from public.enrollments e
    left join course_lessons cl on cl.course_id = e.course_id
    left join public.lessons l on l.course_id = e.course_id
    left join public.lesson_progress p on p.lesson_id = l.id and p.user_id = e.user_id
    where e.course_id in (select sc.id from scoped_courses sc)
    group by e.user_id, e.course_id, e.enrolled_at, cl.lessons
  ),
  scoped_payments as (
    select
      p.*,
      case
        when p.status = 'paid' and p.instructor_id is not null then round(p.amount * p.instructor_share_percent / 100, 2)
        else 0
      end as instructor_amount
    from public.payments p
    where v_scope is null or p.instructor_id = v_scope
  ),
  paid as (
    select * from scoped_payments sp where sp.status = 'paid'
  ),
  scoped_payouts as (
    select po.* from public.payouts po
    where v_scope is null or po.instructor_id = v_scope
  ),
  months as (
    select
      (date_trunc('month', now() at time zone 'Africa/Tripoli') - make_interval(months => g)) at time zone 'Africa/Tripoli' as month_start,
      (date_trunc('month', now() at time zone 'Africa/Tripoli') - make_interval(months => g - 1)) at time zone 'Africa/Tripoli' as month_end,
      to_char(date_trunc('month', now() at time zone 'Africa/Tripoli') - make_interval(months => g), 'YYYY-MM') as label
    from generate_series(0, 5) as g
  )
  select jsonb_build_object(
    'scope', case when v_scope is null then 'platform' else 'instructor' end,
    'is_admin', v_is_admin,
    'generated_at', now(),
    'instructor', (
      select jsonb_build_object(
        'id', i.id, 'slug', i.slug, 'name', i.name, 'name_en', i.name_en,
        'title', i.title, 'title_en', i.title_en, 'photo_url', i.photo_url
      )
      from public.instructors i
      where i.id = v_scope
    ),
    'totals', jsonb_build_object(
      'courses', (select count(*) from scoped_courses),
      'published_courses', (select count(*) from scoped_courses sc where sc.is_published),
      'lessons', (select coalesce(sum(cl.lessons), 0) from course_lessons cl),
      'content_minutes', (select coalesce(sum(sc.duration_minutes), 0) from scoped_courses sc),
      'students', (select count(distinct lr.user_id) from learner_rows lr),
      'enrollments', (select count(*) from learner_rows),
      'enrollments_30d', (select count(*) from learner_rows lr where lr.enrolled_at >= now() - interval '30 days'),
      'active_learners_30d', (select count(distinct lr.user_id) from learner_rows lr where lr.last_activity >= now() - interval '30 days'),
      'lessons_completed', (select coalesce(sum(lr.completed_lessons), 0) from learner_rows lr),
      'course_completions', (select count(*) from learner_rows lr where lr.lessons > 0 and lr.completed_lessons >= lr.lessons),
      'payments', (select count(*) from paid),
      'gross_revenue', (select coalesce(sum(pd.amount), 0) from paid pd),
      'instructor_earnings', (select coalesce(sum(pd.instructor_amount), 0) from paid pd),
      'platform_earnings', (select coalesce(sum(pd.amount - pd.instructor_amount), 0) from paid pd),
      'paid_out', (select coalesce(sum(po.amount), 0) from scoped_payouts po)
    ),
    'courses', coalesce((
      select jsonb_agg(x.row_data order by x.sort_order)
      from (
        select
          c.position as sort_order,
          jsonb_build_object(
            'id', c.id,
            'slug', c.slug,
            'code', c.code,
            'title', c.title,
            'title_en', c.title_en,
            'is_published', c.is_published,
            'availability_status', c.availability_status,
            'is_free', c.is_free,
            'price', c.price,
            'instructor_share_percent', c.instructor_share_percent,
            'instructor_id', c.instructor_id,
            'instructor_name', i.name,
            'instructor_name_en', i.name_en,
            'lessons', coalesce(cl.lessons, 0),
            'duration_minutes', c.duration_minutes,
            'enrollments', (select count(*) from learner_rows lr where lr.course_id = c.id),
            'enrollments_30d', (select count(*) from learner_rows lr where lr.course_id = c.id and lr.enrolled_at >= now() - interval '30 days'),
            'completions', (select count(*) from learner_rows lr where lr.course_id = c.id and lr.lessons > 0 and lr.completed_lessons >= lr.lessons),
            'avg_progress', (
              select coalesce(round(avg(case when lr.lessons > 0 then lr.completed_lessons * 100.0 / lr.lessons else 0 end)), 0)
              from learner_rows lr
              where lr.course_id = c.id
            ),
            'payments', (select count(*) from paid pd where pd.course_id = c.id),
            'gross_revenue', (select coalesce(sum(pd.amount), 0) from paid pd where pd.course_id = c.id),
            'instructor_earnings', (select coalesce(sum(pd.instructor_amount), 0) from paid pd where pd.course_id = c.id),
            'platform_earnings', (select coalesce(sum(pd.amount - pd.instructor_amount), 0) from paid pd where pd.course_id = c.id)
          ) as row_data
        from scoped_courses c
        left join course_lessons cl on cl.course_id = c.id
        left join public.instructors i on i.id = c.instructor_id
      ) x
    ), '[]'::jsonb),
    'instructors', case when v_scope is null then coalesce((
      select jsonb_agg(x.row_data order by x.sort_order)
      from (
        select
          i.position as sort_order,
          jsonb_build_object(
            'id', i.id,
            'slug', i.slug,
            'name', i.name,
            'name_en', i.name_en,
            'is_active', i.is_active,
            'email', u.email,
            'courses', (select count(*) from public.courses c where c.instructor_id = i.id),
            'students', (
              select count(distinct lr.user_id)
              from learner_rows lr
              join public.courses c on c.id = lr.course_id
              where c.instructor_id = i.id
            ),
            'gross_revenue', (select coalesce(sum(pd.amount), 0) from paid pd where pd.instructor_id = i.id),
            'instructor_earnings', (select coalesce(sum(pd.instructor_amount), 0) from paid pd where pd.instructor_id = i.id),
            'platform_earnings', (select coalesce(sum(pd.amount - pd.instructor_amount), 0) from paid pd where pd.instructor_id = i.id),
            'paid_out', (select coalesce(sum(po.amount), 0) from scoped_payouts po where po.instructor_id = i.id)
          ) as row_data
        from public.instructors i
        left join auth.users u on u.id = i.user_id
      ) x
    ), '[]'::jsonb) end,
    'learners', coalesce((
      select jsonb_agg(x.row_data order by x.enrolled_at desc)
      from (
        select
          lr.enrolled_at,
          jsonb_build_object(
            'user_id', lr.user_id,
            'name', pr.display_name,
            'email', case when v_is_admin then u.email end,
            'phone', case when v_is_admin then pr.phone end,
            'affiliation', pr.affiliation,
            'course_id', lr.course_id,
            'course_code', c.code,
            'course_title', c.title,
            'course_title_en', c.title_en,
            'enrolled_at', lr.enrolled_at,
            'completed_lessons', lr.completed_lessons,
            'lessons', lr.lessons,
            'progress', case when lr.lessons > 0 then round(lr.completed_lessons * 100.0 / lr.lessons) else 0 end,
            'last_activity', lr.last_activity
          ) as row_data
        from learner_rows lr
        join public.courses c on c.id = lr.course_id
        left join public.profiles pr on pr.id = lr.user_id
        left join auth.users u on u.id = lr.user_id
        order by lr.enrolled_at desc
        limit 200
      ) x
    ), '[]'::jsonb),
    'monthly', (
      select jsonb_agg(
        jsonb_build_object(
          'month', m.label,
          'enrollments', (select count(*) from learner_rows lr where lr.enrolled_at >= m.month_start and lr.enrolled_at < m.month_end),
          'gross_revenue', (select coalesce(sum(pd.amount), 0) from paid pd where pd.paid_at >= m.month_start and pd.paid_at < m.month_end),
          'instructor_earnings', (select coalesce(sum(pd.instructor_amount), 0) from paid pd where pd.paid_at >= m.month_start and pd.paid_at < m.month_end)
        )
        order by m.month_start
      )
      from months m
    ),
    'payments', coalesce((
      select jsonb_agg(x.row_data order by x.paid_at desc)
      from (
        select
          sp.paid_at,
          jsonb_build_object(
            'id', sp.id,
            'paid_at', sp.paid_at,
            'status', sp.status,
            'method', sp.method,
            'reference', sp.reference,
            'note', case when v_is_admin then sp.note end,
            'amount', sp.amount,
            'instructor_share_percent', sp.instructor_share_percent,
            'instructor_amount', sp.instructor_amount,
            'course_code', c.code,
            'course_title', c.title,
            'course_title_en', c.title_en,
            'learner_name', pr.display_name,
            'learner_email', case when v_is_admin then u.email end,
            'instructor_name', i.name,
            'instructor_name_en', i.name_en
          ) as row_data
        from scoped_payments sp
        join public.courses c on c.id = sp.course_id
        left join public.profiles pr on pr.id = sp.user_id
        left join auth.users u on u.id = sp.user_id
        left join public.instructors i on i.id = sp.instructor_id
        order by sp.paid_at desc
        limit 100
      ) x
    ), '[]'::jsonb),
    'payouts', coalesce((
      select jsonb_agg(x.row_data order by x.paid_at desc)
      from (
        select
          po.paid_at,
          jsonb_build_object(
            'id', po.id,
            'paid_at', po.paid_at,
            'amount', po.amount,
            'method', po.method,
            'reference', po.reference,
            'note', po.note,
            'instructor_id', po.instructor_id,
            'instructor_name', i.name,
            'instructor_name_en', i.name_en
          ) as row_data
        from scoped_payouts po
        join public.instructors i on i.id = po.instructor_id
        order by po.paid_at desc
        limit 100
      ) x
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

create or replace function public.admin_search_learners(p_query text default '')
returns table (id uuid, display_name text, email text, phone text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_pattern text := '%' || replace(replace(replace(coalesce(btrim(p_query), ''), '\', '\\'), '%', '\%'), '_', '\_') || '%';
begin
  if not private.is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  return query
    select u.id, pr.display_name, u.email::text, pr.phone
    from auth.users u
    left join public.profiles pr on pr.id = u.id
    where u.email ilike v_pattern
       or pr.display_name ilike v_pattern
       or pr.phone ilike v_pattern
    order by u.created_at desc
    limit 20;
end;
$$;

revoke all on function public.get_my_roles() from public, anon;
revoke all on function public.get_dashboard(uuid) from public, anon;
revoke all on function public.admin_search_learners(text) from public, anon;
grant execute on function public.get_my_roles() to authenticated;
grant execute on function public.get_dashboard(uuid) to authenticated;
grant execute on function public.admin_search_learners(text) to authenticated;

-- =========================================================
-- Seed: instructor
-- =========================================================
insert into public.instructors (id, slug, name, name_en, title, title_en, bio, bio_en, photo_url, expertise, expertise_en, certifications, position)
values (
  '00000000-0000-4000-8000-000000000501',
  'mohamed-al-misurati',
  'المهندس محمد بشير المصراتي',
  'Eng. Mohamed Bashir Al-Misurati',
  'مهندس ومدرّب شبكات وحوسبة سحابية',
  'Network & Cloud Engineer and Instructor',
  'مهندس شبكات وحوسبة سحابية بخبرة ميدانية في تصميم وتشغيل شبكات المشغّلين والمؤسسات، نفّذ مشاريع عديدة في الربط والأمن والبنية السحابية والافتراضية. حاصل على CCIE Enterprise Infrastructure وعدد كبير من شهادات Cisco و VMware و Fortinet و Microsoft، ودرّب آلاف الطلبة والمهندسين في دورات عملية تبدأ من الأساسيات وتصل إلى مستوى الاحتراف، بأمثلة من قلب بيئة العمل.',
  'A network and cloud engineer with field experience designing and running carrier and enterprise networks, delivered across connectivity, security, cloud and virtualization projects. He holds CCIE Enterprise Infrastructure along with a long list of Cisco, VMware, Fortinet and Microsoft certifications, and has trained thousands of students and engineers in hands-on courses that start from the fundamentals and reach professional level, with examples straight from real work.',
  '/assets/mohamed-bashir-cutout.png',
  array['الشبكات', 'أمن الشبكات', 'الحوسبة السحابية', 'الافتراضية', 'أتمتة الشبكات'],
  array['Networking', 'Network security', 'Cloud computing', 'Virtualization', 'Network automation'],
  '[
  {
    "name": "CCIE Enterprise Infrastructure",
    "issuer": "Cisco",
    "logo": "/assets/certifications/ccie-enterprise.png",
    "featured": true
  },
  {
    "name": "CCNP Enterprise",
    "issuer": "Cisco",
    "logo": "/assets/certifications/ccnp-enterprise.png"
  },
  {
    "name": "CCNP Security",
    "issuer": "Cisco",
    "logo": "/assets/certifications/ccnp-security.png"
  },
  {
    "name": "Enterprise Wireless Implementation",
    "issuer": "Cisco Specialist",
    "logo": "/assets/certifications/cisco-specialist.png"
  },
  {
    "name": "Enterprise SD-WAN Implementation",
    "issuer": "Cisco Specialist",
    "logo": "/assets/certifications/cisco-specialist-sdwan.png"
  },
  {
    "name": "Enterprise Core ENCOR 350-401",
    "issuer": "Cisco Specialist",
    "logo": "/assets/certifications/cisco-specialist-encor.png"
  },
  {
    "name": "Advanced Infrastructure Implementation",
    "issuer": "Cisco Specialist",
    "logo": "/assets/certifications/cisco-specialist-advanced-infra.png"
  },
  {
    "name": "Network Security Firepower",
    "issuer": "Cisco Specialist",
    "logo": "/assets/certifications/cisco-specialist-firepower.png"
  },
  {
    "name": "Security Core",
    "issuer": "Cisco Specialist",
    "logo": "/assets/certifications/cisco-specialist-security-core.png"
  },
  {
    "name": "CCNA 200-301",
    "issuer": "Cisco",
    "logo": "/assets/certifications/ccna-200-301.png"
  },
  {
    "name": "Data Center Virtualization 2022",
    "issuer": "VMware Professional",
    "logo": "/assets/certifications/vmware-vcp.png"
  },
  {
    "name": "Digital Workspace",
    "issuer": "VMware Professional",
    "logo": "/assets/certifications/vmware-vcp-dw.png"
  },
  {
    "name": "Azure Fundamentals AZ-900",
    "issuer": "Microsoft",
    "logo": "/assets/certifications/azure-fundamentals.png"
  },
  {
    "name": "MCSA 70-740",
    "issuer": "Microsoft",
    "logo": "/assets/certifications/microsoft-mcsa.png"
  },
  {
    "name": "JNCIA-Junos",
    "issuer": "Juniper",
    "logo": "/assets/certifications/juniper-jncia.png"
  },
  {
    "name": "NSE 4 Network Security Professional",
    "issuer": "Fortinet",
    "logo": "/assets/certifications/fortinet-nse4.png"
  },
  {
    "name": "NSE 3 Network Security Associate",
    "issuer": "Fortinet",
    "logo": "/assets/certifications/fortinet-nse3.png"
  },
  {
    "name": "NSE 2 Network Security Associate",
    "issuer": "Fortinet",
    "logo": "/assets/certifications/fortinet-nse2.png"
  },
  {
    "name": "NSE 1 Network Security Associate",
    "issuer": "Fortinet",
    "logo": "/assets/certifications/fortinet-nse1.png"
  },
  {
    "name": "HCIA Routing & Switching",
    "issuer": "Huawei",
    "logo": "/assets/certifications/huawei-hcia.png"
  },
  {
    "name": "RAS Technical Professional Advanced (RAS-TPA)",
    "issuer": "Parallels",
    "logo": "/assets/certifications/parallels-ras-tpa.png"
  },
  {
    "name": "RAS Technical Professional (RAS-TP)",
    "issuer": "Parallels",
    "logo": "/assets/certifications/parallels-ras-tp.png"
  },
  {
    "name": "Certified Network Security Specialist",
    "issuer": "ICSI",
    "logo": "/assets/certifications/icsi-network-security.png"
  },
  {
    "name": "IC3 Digital Literacy Certification",
    "issuer": "Certiport",
    "logo": "/assets/certifications/ic3-digital-literacy.png"
  }
]'::jsonb,
  1
)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  name_en = excluded.name_en,
  title = excluded.title,
  title_en = excluded.title_en,
  bio = excluded.bio,
  bio_en = excluded.bio_en,
  photo_url = excluded.photo_url,
  expertise = excluded.expertise,
  expertise_en = excluded.expertise_en,
  certifications = excluded.certifications,
  position = excluded.position;

-- =========================================================
-- Seed: CCNA courses (ids kept so existing enrollments survive)
-- =========================================================
insert into public.courses (
  id, slug, code, title, title_en, short_title, short_title_en, description, description_en,
  level, level_en, accent, outcomes, outcomes_en, duration_minutes, is_published, is_free, price,
  instructor_share_percent, availability_status, cover_url, instructor_id, position
)
values
  (
    '00000000-0000-4000-8000-000000000101',
    'ccna1-introduction-to-networks',
    'CCNA 1',
    'CCNA1: Introduction to Networks',
    'CCNA1: Introduction to Networks',
    'CCNA 1',
    'CCNA 1',
    'الجزء الأول من مسار CCNA: تتعرّف على الشبكات من الصفر — النماذج والبروتوكولات، الطبقة الفيزيائية وطبقة ربط البيانات، Ethernet Switching، عنونة IPv4 و IPv6، إعداد السويتش والراوتر، وأساسيات أمن الشبكات، ثم تبني شبكة صغيرة بنفسك.',
    'Part one of the CCNA track: learn networking from scratch — models and protocols, the physical and data link layers, Ethernet switching, IPv4 and IPv6 addressing, basic switch and router configuration, and network security fundamentals, then build a small network yourself.',
    'مبتدئ',
    'Beginner',
    'teal',
    array['فهم نموذجي OSI و TCP/IP وكيف تنتقل البيانات عبر الشبكة', 'الإعداد الأساسي للسويتش والراوتر وأجهزة المستخدمين', 'تقسيم الشبكات وعنونتها باستخدام IPv4 و IPv6', 'تطبيق أساسيات أمن الشبكات وبناء شبكة صغيرة متكاملة'],
    array['Understand the OSI and TCP/IP models and how data moves across a network', 'Perform basic configuration of switches, routers, and end devices', 'Subnet and address networks with IPv4 and IPv6', 'Apply network security fundamentals and build a complete small network'],
    1150, true, true, 0, 70, 'available', '/assets/courses/ccna-foundations.jpg',
    '00000000-0000-4000-8000-000000000501', 1
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    'ccna4-connecting-networks',
    'CCNA 4',
    'CCNA 4: Connecting Networks',
    'CCNA 4: Connecting Networks',
    'CCNA 4',
    'CCNA 4',
    'مسار Connecting Networks: تتعمّق في ربط الشبكات الواسعة — مفاهيم WAN، شبكات VPN و IPsec، ربط الفروع، قوائم ACL الموسّعة، جودة الخدمة QoS، إدارة الشبكات وتصميمها واستكشاف أعطالها، وصولاً إلى الافتراضية وأتمتة الشبكات.',
    'Connecting Networks: go deeper into wide-area connectivity — WAN concepts, VPNs and IPsec, branch connections, extended ACLs, QoS, network management, design and troubleshooting, all the way to network virtualization and automation.',
    'متوسط',
    'Intermediate',
    'orange',
    array['فهم تقنيات WAN وربط الفروع بالشبكة الرئيسية', 'بناء اتصالات آمنة باستخدام VPN و IPsec', 'ضبط قوائم ACL الموسّعة وسياسات جودة الخدمة QoS', 'إدارة الشبكات واستكشاف أعطالها والتعرّف على الافتراضية والأتمتة'],
    array['Understand WAN technologies and connect branches to the core network', 'Build secure connections with VPNs and IPsec', 'Configure extended ACLs and QoS policies', 'Manage and troubleshoot networks, and get started with virtualization and automation'],
    762, true, true, 0, 70, 'available', '/assets/courses/enterprise-networking.jpg',
    '00000000-0000-4000-8000-000000000501', 2
  )
on conflict (id) do update set
  slug = excluded.slug,
  code = excluded.code,
  title = excluded.title,
  title_en = excluded.title_en,
  short_title = excluded.short_title,
  short_title_en = excluded.short_title_en,
  description = excluded.description,
  description_en = excluded.description_en,
  level = excluded.level,
  level_en = excluded.level_en,
  accent = excluded.accent,
  outcomes = excluded.outcomes,
  outcomes_en = excluded.outcomes_en,
  duration_minutes = excluded.duration_minutes,
  is_published = excluded.is_published,
  is_free = excluded.is_free,
  price = excluded.price,
  availability_status = excluded.availability_status,
  cover_url = excluded.cover_url,
  instructor_id = excluded.instructor_id,
  position = excluded.position;

-- The upcoming tracks are now a marketing section on the landing page.
update public.courses
set is_published = false
where id in ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000104');

-- Replace the placeholder curriculum (cascades to its lessons and progress rows).
delete from public.modules
where id in (
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000202',
  '00000000-0000-4000-8000-000000000203',
  '00000000-0000-4000-8000-000000000204'
);

insert into public.modules (id, course_id, title, title_en, position)
values
  ('00000000-0000-4000-8000-000000000211', '00000000-0000-4000-8000-000000000101', 'محتوى الكورس', 'Course content', 1),
  ('00000000-0000-4000-8000-000000000212', '00000000-0000-4000-8000-000000000102', 'محتوى الكورس', 'Course content', 1)
on conflict (id) do update set
  course_id = excluded.course_id,
  title = excluded.title,
  title_en = excluded.title_en,
  position = excluded.position;

-- Durations of CCNA 1 modules are filled in once the compressed files are uploaded.
insert into public.lessons as l (id, course_id, module_id, title, title_en, duration_seconds, position, is_preview)
values
  ('00000000-0000-4000-8000-000000001101', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000211', 'CCNA1 Introduction to Networks', 'CCNA1 Introduction to Networks', 611, 1, true),
  ('00000000-0000-4000-8000-000000001102', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000211', 'Module-1 Networking Today', 'Module-1 Networking Today', 0, 2, false),
  ('00000000-0000-4000-8000-000000001103', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000211', 'Module-2 Basic Switch and End Device Configuration', 'Module-2 Basic Switch and End Device Configuration', 0, 3, false),
  ('00000000-0000-4000-8000-000000001104', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000211', 'Module-3 Protocols and Models', 'Module-3 Protocols and Models', 0, 4, false),
  ('00000000-0000-4000-8000-000000001105', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000211', 'Module-4 Physical Layer', 'Module-4 Physical Layer', 0, 5, false),
  ('00000000-0000-4000-8000-000000001106', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000211', 'Module-5 Numbering Systems', 'Module-5 Numbering Systems', 0, 6, false),
  ('00000000-0000-4000-8000-000000001107', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000211', 'Module-6 Data Link Layer', 'Module-6 Data Link Layer', 0, 7, false),
  ('00000000-0000-4000-8000-000000001108', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000211', 'Module-7 Ethernet Switching', 'Module-7 Ethernet Switching', 0, 8, false),
  ('00000000-0000-4000-8000-000000001109', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000211', 'Module-8 Network Layer', 'Module-8 Network Layer', 0, 9, false),
  ('00000000-0000-4000-8000-000000001110', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000211', 'Module-9 Address Resolution', 'Module-9 Address Resolution', 0, 10, false),
  ('00000000-0000-4000-8000-000000001111', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000211', 'Module-10 Basic Router Configuration', 'Module-10 Basic Router Configuration', 0, 11, false),
  ('00000000-0000-4000-8000-000000001112', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000211', 'Module-11 IPv4 Addressing', 'Module-11 IPv4 Addressing', 0, 12, false),
  ('00000000-0000-4000-8000-000000001113', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000211', 'Module-12 IPv6 Addressing', 'Module-12 IPv6 Addressing', 0, 13, false),
  ('00000000-0000-4000-8000-000000001114', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000211', 'Module-13 ICMP', 'Module-13 ICMP', 0, 14, false),
  ('00000000-0000-4000-8000-000000001115', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000211', 'Module-14 Transport Layer', 'Module-14 Transport Layer', 0, 15, false),
  ('00000000-0000-4000-8000-000000001116', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000211', 'Module-15 Application Layer', 'Module-15 Application Layer', 0, 16, false),
  ('00000000-0000-4000-8000-000000001117', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000211', 'Module-16 Network Security Fundamentals', 'Module-16 Network Security Fundamentals', 0, 17, false),
  ('00000000-0000-4000-8000-000000001118', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000211', 'Module-17 Build a Small Network', 'Module-17 Build a Small Network', 0, 18, false),
  ('00000000-0000-4000-8000-000000001201', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000212', 'Module-1 WAN Concepts', 'Module-1 WAN Concepts', 6723, 1, true),
  ('00000000-0000-4000-8000-000000001202', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000212', 'Module-2 VPN and IPsec Concepts', 'Module-2 VPN and IPsec Concepts', 5091, 2, false),
  ('00000000-0000-4000-8000-000000001203', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000212', 'Module-3 Branch Connections', 'Module-3 Branch Connections', 2201, 3, false),
  ('00000000-0000-4000-8000-000000001204', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000212', 'Module-4 Extended ACLs', 'Module-4 Extended ACLs', 4059, 4, false),
  ('00000000-0000-4000-8000-000000001205', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000212', 'Module-5 QoS Concepts', 'Module-5 QoS Concepts', 5639, 5, false),
  ('00000000-0000-4000-8000-000000001206', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000212', 'Module-6 Network Management', 'Module-6 Network Management', 4798, 6, false),
  ('00000000-0000-4000-8000-000000001207', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000212', 'Module-7 Network Design', 'Module-7 Network Design', 3488, 7, false),
  ('00000000-0000-4000-8000-000000001208', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000212', 'Module-8 Network Troubleshooting', 'Module-8 Network Troubleshooting', 4157, 8, false),
  ('00000000-0000-4000-8000-000000001209', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000212', 'Module-9 Network Virtualization', 'Module-9 Network Virtualization', 4475, 9, false),
  ('00000000-0000-4000-8000-000000001210', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000212', 'Module-10 Network Automation', 'Module-10 Network Automation', 5067, 10, false)
on conflict (id) do update set
  course_id = excluded.course_id,
  module_id = excluded.module_id,
  title = excluded.title,
  title_en = excluded.title_en,
  duration_seconds = case when excluded.duration_seconds > 0 then excluded.duration_seconds else l.duration_seconds end,
  position = excluded.position,
  is_preview = excluded.is_preview;

-- =========================================================
-- Owner account: admin + instructor profile
-- No-op until this email has signed up; re-run supabase/snippets/grant-owner-roles.sql afterwards.
-- =========================================================
do $$
declare
  v_email text := 'm.misurati@outlook.com';
  v_user uuid;
begin
  select u.id into v_user from auth.users u where lower(u.email) = lower(v_email);
  if v_user is null then
    raise notice 'No account for % yet. Sign up, then run supabase/snippets/grant-owner-roles.sql.', v_email;
    return;
  end if;

  insert into private.admins (user_id) values (v_user) on conflict (user_id) do nothing;
  update public.instructors set user_id = v_user where slug = 'mohamed-al-misurati';
end;
$$;

-- #########################################################
-- Instructor portal (migrations/20260918090000_instructor_portal.sql)
-- #########################################################

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

-- Lesson videos for CCNA 1 and CCNA 4, plus the slide deck attached to each lesson.
-- Google Drive files must stay shared as "anyone with the link".
-- Idempotent: re-running refreshes the file ids.

insert into private.lesson_media (lesson_id, provider, drive_file_id, mime_type)
values
  ('00000000-0000-4000-8000-000000001101', 'google_drive', '1cKLJoLyQqKQjoWm9NMGEZhi9JEJpyCD5', 'video/mp4'), -- CCNA1 Introduction to Networks
  ('00000000-0000-4000-8000-000000001102', 'google_drive', '1GM0GvtAH_vl_uicpYQQUMkrza6vCZLIE', 'video/mp4'), -- Module-1 Networking Today
  ('00000000-0000-4000-8000-000000001103', 'google_drive', '1KT8wil45XNLgjiCv2BipL_QFtcLTBwG_', 'video/mp4'), -- Module-2 Basic Switch and End Device Configuration
  ('00000000-0000-4000-8000-000000001104', 'google_drive', '1dYRU1nZ1ug4I9pYs497cXKRAe9CqBHSX', 'video/mp4'), -- Module-3 Protocols and Models
  ('00000000-0000-4000-8000-000000001105', 'google_drive', '1pfAV1v1tOhyBZhHnQwARxpM0UfuqE8Za', 'video/mp4'), -- Module-4 Physical Layer
  ('00000000-0000-4000-8000-000000001106', 'google_drive', '15wCdLVu1YIzU-X2QJY2Q777b-H7hjjpQ', 'video/mp4'), -- Module-5 Numbering Systems
  ('00000000-0000-4000-8000-000000001107', 'google_drive', '1QLEjXwDbJi5C6M9rPtX0Rom0mtvuA6NC', 'video/mp4'), -- Module-6  Data Link Layer
  ('00000000-0000-4000-8000-000000001108', 'google_drive', '1ucfDIKpvZG_N9FOG6Xv9ot6JAW4Ucuqs', 'video/mp4'), -- Module-7 Ethernet Switching
  ('00000000-0000-4000-8000-000000001109', 'google_drive', '1NR_iVdfQyFJsW5rIFkzt8Ui3o_P2Ehei', 'video/mp4'), -- Module-8 Network Layer
  ('00000000-0000-4000-8000-000000001110', 'google_drive', '1G-VT0-CZomD25i2QWg_NQzYZSh4uLFOQ', 'video/mp4'), -- Module-9 Address Resolution
  ('00000000-0000-4000-8000-000000001111', 'google_drive', '1ySFDMuuykPBJ3glpt6WB8taNVQk1FQQi', 'video/mp4'), -- Module-10 Basic Router Configuration
  ('00000000-0000-4000-8000-000000001112', 'google_drive', '1I8w6WfUAU8V4ZGzgqHxsfoLyWfj90lZY', 'video/mp4'), -- Module-11 IPv4 Addressing
  ('00000000-0000-4000-8000-000000001113', 'google_drive', '1dPEn7bf_-glYJWr5ekzVxXGQRjkGT_yI', 'video/mp4'), -- Module-12 IPv6 Addressing
  ('00000000-0000-4000-8000-000000001114', 'google_drive', '1j2IwfYtCUVRHXXpg5PUI5j5SIQDeErJb', 'video/mp4'), -- Module-13  ICMP
  ('00000000-0000-4000-8000-000000001115', 'google_drive', '1rK_j83v_fh2VwGeIzf1QgP4c3X8Wa3hS', 'video/mp4'), -- Module-14 Transport Layer
  ('00000000-0000-4000-8000-000000001116', 'google_drive', '1q704IxYyterB3GcPyMSWhQaw411nVdW2', 'video/mp4'), -- Module-15 Application Layer
  ('00000000-0000-4000-8000-000000001117', 'google_drive', '1kWBgie0yu9Gs57ZGo0nbRULxKK0AnhqD', 'video/mp4'), -- Module-16 Network Security Fundamentals
  ('00000000-0000-4000-8000-000000001118', 'google_drive', '13PZdEzOskVwRcsTz2f3sUbHuy0MwyzFr', 'video/mp4'), -- Module-17 Build a Small Network
  ('00000000-0000-4000-8000-000000001201', 'google_drive', '1ExLB_CFiit4oH0d_J7EdS0GWZTw22eqt', 'video/mp4'), -- Module-1 WAN Concepts
  ('00000000-0000-4000-8000-000000001202', 'google_drive', '1AhkoOiRi10ftpJ5yQ6E8zunjfXCCzrFP', 'video/mp4'), -- Module-2 VPN and IPsec Concepts
  ('00000000-0000-4000-8000-000000001203', 'google_drive', '17uNa4UIQC74lT5-dUVkLjsmrMBVq7M0u', 'video/mp4'), -- Module-3 Branch Connections
  ('00000000-0000-4000-8000-000000001204', 'google_drive', '1ncCRTTaz0Gd8Thc08csatfuiNmJeEk_j', 'video/mp4'), -- Module-4 Extended ACLs
  ('00000000-0000-4000-8000-000000001205', 'google_drive', '143GSZOiyRqhNXV0dgVLIUZN_4pO4q8LV', 'video/mp4'), -- Module-5 QoS Concepts
  ('00000000-0000-4000-8000-000000001206', 'google_drive', '1gWaEJUKnjVrsJSDSZ7bsVpFLcZwq75Ip', 'video/mp4'), -- Module-6 Network Management
  ('00000000-0000-4000-8000-000000001207', 'google_drive', '1VO9H9pacbtgVQZeSyjapJRQSUpAtewjU', 'video/mp4'), -- Module-7 Network Design
  ('00000000-0000-4000-8000-000000001208', 'google_drive', '1McOGD6ZuRY6nl7rf7WmgT0gFAssHTvhY', 'video/mp4'), -- Module-8 Network Troubleshooting
  ('00000000-0000-4000-8000-000000001209', 'google_drive', '1lY14dgCCeUKwGthhkgu1BYOud6Nx5PFR', 'video/mp4'), -- Module-9 Network Vertualization
  ('00000000-0000-4000-8000-000000001210', 'google_drive', '1QUPC_GPa89EPJ5QonzTUl26SCON2WdfA', 'video/mp4') -- Module-10 Network Automation
on conflict (lesson_id) do update set
  provider = excluded.provider,
  drive_file_id = excluded.drive_file_id,
  mime_type = excluded.mime_type,
  updated_at = now();

insert into public.lesson_resources (id, lesson_id, title, title_en, url, kind, position)
values
  ('00000000-0000-4000-8000-000000003101', '00000000-0000-4000-8000-000000001102', 'شرائح المحاضرة — Module 1', 'Lecture slides — Module 1', 'https://drive.google.com/file/d/1DH1yaX9P93hO8Wm25THU-t5qGGT5r2JP/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003102', '00000000-0000-4000-8000-000000001103', 'شرائح المحاضرة — Module 2', 'Lecture slides — Module 2', 'https://drive.google.com/file/d/14Kqlw0DnTe24_zQSKY4Q1GeeAmojaUYj/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003103', '00000000-0000-4000-8000-000000001104', 'شرائح المحاضرة — Module 3', 'Lecture slides — Module 3', 'https://drive.google.com/file/d/1PTk4qHQw4PXfQe6pmKUMAWPE-WIKSO5I/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003104', '00000000-0000-4000-8000-000000001105', 'شرائح المحاضرة — Module 4', 'Lecture slides — Module 4', 'https://drive.google.com/file/d/1_BrbhCywWYH4cKIdEn9neP_owYKukjwa/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003105', '00000000-0000-4000-8000-000000001106', 'شرائح المحاضرة — Module 5', 'Lecture slides — Module 5', 'https://drive.google.com/file/d/1l7P3GLrc2CA1YT-_3BS9rXyiC6uqfNN-/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003106', '00000000-0000-4000-8000-000000001107', 'شرائح المحاضرة — Module 6', 'Lecture slides — Module 6', 'https://drive.google.com/file/d/1gguT8FfpOvgdE--qlQTIg3p8hAdW5bau/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003107', '00000000-0000-4000-8000-000000001108', 'شرائح المحاضرة — Module 7', 'Lecture slides — Module 7', 'https://drive.google.com/file/d/1ZBduSKxwoc8cPqrobtzpKgWBX44KDFHj/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003108', '00000000-0000-4000-8000-000000001109', 'شرائح المحاضرة — Module 8', 'Lecture slides — Module 8', 'https://drive.google.com/file/d/1n9VppLz7SD8s5Ydq1VMyDj_GSbkPCPdj/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003109', '00000000-0000-4000-8000-000000001110', 'شرائح المحاضرة — Module 9', 'Lecture slides — Module 9', 'https://drive.google.com/file/d/19GJqSF-8j4ReSG6Mbc3mhON5PhfoyLtT/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003110', '00000000-0000-4000-8000-000000001111', 'شرائح المحاضرة — Module 10', 'Lecture slides — Module 10', 'https://drive.google.com/file/d/19xCL4bdCUHf4LH7PiTXs2B_wTZ3CQ6dk/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003111', '00000000-0000-4000-8000-000000001112', 'شرائح المحاضرة — Module 11', 'Lecture slides — Module 11', 'https://drive.google.com/file/d/18urVTxRwV6okmYnQ7N0fmKoZP9e5Xzo6/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003112', '00000000-0000-4000-8000-000000001113', 'شرائح المحاضرة — Module 12', 'Lecture slides — Module 12', 'https://drive.google.com/file/d/1lNVXFbsFO32J5WU6P9Z34i3mJ8pk5kj8/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003113', '00000000-0000-4000-8000-000000001114', 'شرائح المحاضرة — Module 13', 'Lecture slides — Module 13', 'https://drive.google.com/file/d/1eft6vaIAengRrLtbX69FrbzPi2ncB4ck/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003114', '00000000-0000-4000-8000-000000001115', 'شرائح المحاضرة — Module 14', 'Lecture slides — Module 14', 'https://drive.google.com/file/d/1gFyU6AvRJpi9hQxSgeClZHYqU34_z52w/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003115', '00000000-0000-4000-8000-000000001116', 'شرائح المحاضرة — Module 15', 'Lecture slides — Module 15', 'https://drive.google.com/file/d/1rPhbZm9gQ8uSmkSZWNSdGg1rJDP4XAjA/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003116', '00000000-0000-4000-8000-000000001117', 'شرائح المحاضرة — Module 16', 'Lecture slides — Module 16', 'https://drive.google.com/file/d/1_22N0UpL1MJh2fPq6Zb4Ch0H2W5nZofF/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003117', '00000000-0000-4000-8000-000000001118', 'شرائح المحاضرة — Module 17', 'Lecture slides — Module 17', 'https://drive.google.com/file/d/1G5ctvtlO0HbsC6AqGBm7Q7abaBQDP9oq/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003201', '00000000-0000-4000-8000-000000001201', 'شرائح المحاضرة — Module 1', 'Lecture slides — Module 1', 'https://drive.google.com/file/d/1nAXFVvflhrnLhSkzu9yZCD-LkXTKjhJP/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003202', '00000000-0000-4000-8000-000000001202', 'شرائح المحاضرة — Module 2', 'Lecture slides — Module 2', 'https://drive.google.com/file/d/1wnUHosrx_8DkxjisN6LIqA8pFun4dHJ_/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003203', '00000000-0000-4000-8000-000000001203', 'شرائح المحاضرة — Module 3', 'Lecture slides — Module 3', 'https://drive.google.com/file/d/1KAspwgR1P7kIlRb7jEgSISqIlu2uQtlS/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003204', '00000000-0000-4000-8000-000000001204', 'شرائح المحاضرة — Module 4', 'Lecture slides — Module 4', 'https://drive.google.com/file/d/1pGqlvTdcCGxkBkcfw4feNpfpCGHgA-MB/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003205', '00000000-0000-4000-8000-000000001205', 'شرائح المحاضرة — Module 5', 'Lecture slides — Module 5', 'https://drive.google.com/file/d/1BtUi8DxJIpevsxrh7uOnJYOcWaFrSA2L/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003206', '00000000-0000-4000-8000-000000001206', 'شرائح المحاضرة — Module 6', 'Lecture slides — Module 6', 'https://drive.google.com/file/d/1x9_jLQLIAg6ACPoFf06lcYqAZVsQJ7fN/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003207', '00000000-0000-4000-8000-000000001207', 'شرائح المحاضرة — Module 7', 'Lecture slides — Module 7', 'https://drive.google.com/file/d/1V23SVvd0vh_D3SfK6uXdR59cgncM4h8E/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003208', '00000000-0000-4000-8000-000000001208', 'شرائح المحاضرة — Module 8', 'Lecture slides — Module 8', 'https://drive.google.com/file/d/13y8OLTyELTXQOOT-oVgj_feHO1mlqqhk/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003209', '00000000-0000-4000-8000-000000001209', 'شرائح المحاضرة — Module 9', 'Lecture slides — Module 9', 'https://drive.google.com/file/d/1q1imDibZR03hwcb2gsDDP7fGqv5vCANM/view', 'slides', 1),
  ('00000000-0000-4000-8000-000000003210', '00000000-0000-4000-8000-000000001210', 'شرائح المحاضرة — Module 10', 'Lecture slides — Module 10', 'https://drive.google.com/file/d/1WRWHimwvmj7SWUHeVYqShecbDHT9hM1t/view', 'slides', 1)
on conflict (id) do update set
  lesson_id = excluded.lesson_id,
  title = excluded.title,
  title_en = excluded.title_en,
  url = excluded.url,
  kind = excluded.kind,
  position = excluded.position;

-- CCNA 4 now has all of its videos, so it leaves the "coming soon" state.
update public.courses
set availability_status = 'available'
where slug = 'ccna4-connecting-networks';

-- Real lesson durations read from the uploaded video files, plus course totals.

update public.lessons as l
set duration_seconds = d.seconds
from (values
  ('00000000-0000-4000-8000-000000001101'::uuid, 611), -- CCNA1 Introduction to Networks
  ('00000000-0000-4000-8000-000000001102'::uuid, 4915), -- Module-1 Networking Today
  ('00000000-0000-4000-8000-000000001103'::uuid, 2485), -- Module-2 Basic Switch and End Device Configuration
  ('00000000-0000-4000-8000-000000001104'::uuid, 7755), -- Module-3 Protocols and Models
  ('00000000-0000-4000-8000-000000001105'::uuid, 7202), -- Module-4 Physical Layer
  ('00000000-0000-4000-8000-000000001106'::uuid, 992), -- Module-5 Numbering Systems
  ('00000000-0000-4000-8000-000000001107'::uuid, 1718), -- Module-6  Data Link Layer
  ('00000000-0000-4000-8000-000000001108'::uuid, 3782), -- Module-7 Ethernet Switching
  ('00000000-0000-4000-8000-000000001109'::uuid, 5392), -- Module-8 Network Layer
  ('00000000-0000-4000-8000-000000001110'::uuid, 1781), -- Module-9 Address Resolution
  ('00000000-0000-4000-8000-000000001111'::uuid, 1830), -- Module-10 Basic Router Configuration
  ('00000000-0000-4000-8000-000000001112'::uuid, 6016), -- Module-11 IPv4 Addressing
  ('00000000-0000-4000-8000-000000001113'::uuid, 4711), -- Module-12 IPv6 Addressing
  ('00000000-0000-4000-8000-000000001114'::uuid, 2152), -- Module-13  ICMP
  ('00000000-0000-4000-8000-000000001115'::uuid, 4870), -- Module-14 Transport Layer
  ('00000000-0000-4000-8000-000000001116'::uuid, 4682), -- Module-15 Application Layer
  ('00000000-0000-4000-8000-000000001117'::uuid, 4508), -- Module-16 Network Security Fundamentals
  ('00000000-0000-4000-8000-000000001118'::uuid, 3574), -- Module-17 Build a Small Network
  ('00000000-0000-4000-8000-000000001201'::uuid, 6723), -- Module-1 WAN Concepts
  ('00000000-0000-4000-8000-000000001202'::uuid, 5092), -- Module-2 VPN and IPsec Concepts
  ('00000000-0000-4000-8000-000000001203'::uuid, 2202), -- Module-3 Branch Connections
  ('00000000-0000-4000-8000-000000001204'::uuid, 4059), -- Module-4 Extended ACLs
  ('00000000-0000-4000-8000-000000001205'::uuid, 5639), -- Module-5 QoS Concepts
  ('00000000-0000-4000-8000-000000001206'::uuid, 4799), -- Module-6 Network Management
  ('00000000-0000-4000-8000-000000001207'::uuid, 3489), -- Module-7 Network Design
  ('00000000-0000-4000-8000-000000001208'::uuid, 4158), -- Module-8 Network Troubleshooting
  ('00000000-0000-4000-8000-000000001209'::uuid, 4475), -- Module-9 Network Vertualization
  ('00000000-0000-4000-8000-000000001210'::uuid, 5067) -- Module-10 Network Automation
) as d(id, seconds)
where l.id = d.id;

update public.courses set duration_minutes = 1150 where slug = 'ccna1-introduction-to-networks';
update public.courses set duration_minutes = 762 where slug = 'ccna4-connecting-networks';
