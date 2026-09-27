-- Course progress, measured from what was actually watched.
--
-- The dashboard read progress from lesson_progress.completed_at, but nothing sets that
-- any more: the courses are free and open, and the "mark complete" button is gone. Every
-- learner therefore showed 0%. Progress is now the share of a course's running time the
-- learner has watched, from the positions the player saves as it plays, and a lesson
-- counts as finished at nine tenths watched.
--
-- Everything else in the function is unchanged.

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
      -- Nothing marks a lesson complete any more, so how far a learner got is measured
      -- from the positions the player saves while they watch. Capped per lesson, so a
      -- stale position can never push a course past 100%. A lesson counts as finished
      -- once nine tenths of it has been watched.
      count(p.lesson_id) filter (
        where coalesce(l.duration_seconds, 0) > 0
          and coalesce(p.progress_seconds, 0) >= l.duration_seconds * 0.9
      )::int as completed_lessons,
      sum(least(coalesce(p.progress_seconds, 0), coalesce(l.duration_seconds, 0)))::bigint as watched_seconds,
      sum(coalesce(l.duration_seconds, 0))::bigint as course_seconds,
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
      'course_completions', (select count(*) from learner_rows lr where coalesce(lr.course_seconds, 0) > 0 and lr.watched_seconds >= lr.course_seconds * 0.9),
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
            'completions', (select count(*) from learner_rows lr where lr.course_id = c.id and coalesce(lr.course_seconds, 0) > 0 and lr.watched_seconds >= lr.course_seconds * 0.9),
            'avg_progress', (
              select coalesce(round(avg(case when coalesce(lr.course_seconds, 0) > 0 then least(100, lr.watched_seconds * 100.0 / lr.course_seconds) else 0 end)), 0)
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
            'watched_seconds', lr.watched_seconds,
            'course_seconds', lr.course_seconds,
            'progress', case when coalesce(lr.course_seconds, 0) > 0
              then least(100, round(lr.watched_seconds * 100.0 / lr.course_seconds))
              else 0 end,
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
