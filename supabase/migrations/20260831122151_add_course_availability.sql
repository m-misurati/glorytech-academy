alter table public.courses
  add column availability_status text not null default 'available'
    check (availability_status in ('available', 'coming_soon')),
  add column cover_url text;

update public.courses
set cover_url = case slug
  when 'networking-foundations-ccna' then '/assets/courses/ccna-foundations.jpg'
  when 'enterprise-networking' then '/assets/courses/enterprise-networking.jpg'
  else cover_url
end;

insert into public.courses (
  id,
  slug,
  title,
  short_title,
  description,
  level,
  accent,
  outcomes,
  duration_minutes,
  is_published,
  is_free,
  availability_status,
  cover_url,
  position
)
values
  (
    '00000000-0000-4000-8000-000000000103',
    'devops-bootcamp',
    'DevOps Bootcamp',
    'DevOps Bootcamp',
    'مسار عملي مكثّف يربط Linux وGit وCI/CD والحاويات والمراقبة لبناء دورة تسليم حديثة من الكود إلى التشغيل.',
    'متوسط إلى متقدم',
    'teal',
    array['بناء خط CI/CD عملي','إدارة الحاويات وبيئات التشغيل','أتمتة الاختبارات والنشر','مراقبة الخدمات ومعالجة الأعطال'],
    0,
    true,
    false,
    'coming_soon',
    '/assets/courses/devops-bootcamp.jpg',
    3
  ),
  (
    '00000000-0000-4000-8000-000000000104',
    'ccnp-enterprise',
    'CCNP Enterprise',
    'CCNP Enterprise',
    'تعمّق في تصميم وتشغيل شبكات المؤسسات، التوجيه المتقدم، الاعتمادية، اللاسلكي والأتمتة ضمن مسار تحضيري عملي.',
    'متقدم',
    'orange',
    array['تصميم شبكات مؤسسات قابلة للتوسع','إتقان بروتوكولات التوجيه المتقدمة','رفع الاعتمادية وتحسين الأداء','الاستعداد العملي لمسار CCNP Enterprise'],
    0,
    true,
    false,
    'coming_soon',
    '/assets/courses/ccnp-enterprise.jpg',
    4
  )
on conflict (id) do nothing;

drop policy if exists "published course modules are readable" on public.modules;
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

drop policy if exists "users enroll themselves in published free courses" on public.enrollments;
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
