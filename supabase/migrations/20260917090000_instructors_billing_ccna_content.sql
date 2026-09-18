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
