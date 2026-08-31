create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
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
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.modules (
  id uuid primary key,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.lessons (
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

create table public.enrollments (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  progress_seconds integer not null default 0 check (progress_seconds >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table private.lesson_media (
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

create index modules_course_position_idx on public.modules(course_id, position);
create index lessons_course_position_idx on public.lessons(course_id, position);
create index lessons_module_position_idx on public.lessons(module_id, position);
create index enrollments_user_idx on public.enrollments(user_id);
create index enrollments_course_idx on public.enrollments(course_id);
create index lesson_progress_user_idx on public.lesson_progress(user_id);
create index lesson_progress_lesson_idx on public.lesson_progress(lesson_id);

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

create policy "published courses are readable"
on public.courses for select
to anon, authenticated
using (is_published);

create policy "published course modules are readable"
on public.modules for select
to anon, authenticated
using (
  exists (
    select 1 from public.courses c
    where c.id = modules.course_id and c.is_published
  )
);

create policy "published course lessons are readable"
on public.lessons for select
to anon, authenticated
using (
  exists (
    select 1 from public.courses c
    where c.id = lessons.course_id and c.is_published
  )
);

create policy "users read own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "users create own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "users update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "users read own enrollments"
on public.enrollments for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users enroll themselves in published free courses"
on public.enrollments for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.courses c
    where c.id = course_id and c.is_published and c.is_free
  )
);

create policy "users read own progress"
on public.lesson_progress for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users create own progress"
on public.lesson_progress for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.lessons l
    join public.enrollments e on e.course_id = l.course_id
    where l.id = lesson_id and e.user_id = (select auth.uid())
  )
);

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
    where l.id = lesson_id and e.user_id = (select auth.uid())
  )
);

insert into public.courses (id, slug, title, short_title, description, level, accent, outcomes, duration_minutes, is_published, is_free, position)
values
  ('00000000-0000-4000-8000-000000000101', 'networking-foundations-ccna', 'أساسيات الشبكات — CCNA', 'أساسيات الشبكات', 'ابدأ من الصفر: افهم مكوّنات الشبكة، نموذج OSI، العنونة، التحويل والتوجيه، ثم طبّق ما تعلّمته خطوة بخطوة.', 'مبتدئ', 'teal', array['فهم طريقة انتقال البيانات داخل الشبكات','تقسيم عناوين IPv4 وقراءة الـ Subnet','إعداد أساسيات Switching وRouting','بناء مختبر شبكات صغير واختباره'], 360, true, true, 1),
  ('00000000-0000-4000-8000-000000000102', 'enterprise-networking', 'الشبكات المؤسسية — من الفهم إلى التطبيق', 'الشبكات المؤسسية', 'انتقل من الأساسيات إلى تصميم شبكات مؤسسية أكثر اعتمادية، مع VLANs والتوجيه الديناميكي والأمن والمراقبة.', 'متوسط', 'orange', array['تصميم شبكات VLAN وفهم Trunking','تطبيق مبادئ التوجيه الديناميكي','تقوية الشبكة ضد الأخطاء الشائعة','قراءة مؤشرات الشبكة وتشخيص المشاكل'], 480, true, true, 2)
on conflict (id) do nothing;

insert into public.modules (id, course_id, title, position)
values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'مدخل إلى عالم الشبكات', 1),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101', 'العنونة والربط', 2),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000102', 'تصميم شبكة المؤسسة', 1),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000102', 'التشغيل والحماية', 2)
on conflict (id) do nothing;

insert into public.lessons (id, course_id, module_id, title, duration_seconds, position, is_preview)
values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', 'كيف تعمل الشبكات؟', 760, 1, true),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', 'أجهزة الشبكة ووظيفة كل جهاز', 1100, 2, false),
  ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', 'نموذج OSI ببساطة', 1335, 3, false),
  ('00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', 'مختبرك الأول', 965, 4, false),
  ('00000000-0000-4000-8000-000000000305', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000202', 'فهم IPv4', 1510, 5, false),
  ('00000000-0000-4000-8000-000000000306', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000202', 'Subnetting بطريقة عملية', 2065, 6, false),
  ('00000000-0000-4000-8000-000000000307', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000202', 'أساسيات Switching', 1680, 7, false),
  ('00000000-0000-4000-8000-000000000308', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000202', 'الاختبار العملي للمسار', 1230, 8, false),
  ('00000000-0000-4000-8000-000000000309', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000203', 'مبادئ التصميم القابل للتوسع', 1290, 1, true),
  ('00000000-0000-4000-8000-000000000310', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000203', 'VLAN وTrunking', 1870, 2, false),
  ('00000000-0000-4000-8000-000000000311', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000203', 'Inter-VLAN Routing', 1665, 3, false),
  ('00000000-0000-4000-8000-000000000312', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000203', 'Redundancy والاعتمادية', 1460, 4, false),
  ('00000000-0000-4000-8000-000000000313', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000204', 'مقدمة في OSPF', 2100, 5, false),
  ('00000000-0000-4000-8000-000000000314', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000204', 'أمن المنافذ وACL', 1780, 6, false),
  ('00000000-0000-4000-8000-000000000315', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000204', 'المراقبة واستكشاف الأعطال', 1935, 7, false),
  ('00000000-0000-4000-8000-000000000316', '00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000204', 'مشروع الشبكة النهائي', 2520, 8, false)
on conflict (id) do nothing;
