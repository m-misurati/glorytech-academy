import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase');
const db = new PGlite();

// Minimal Supabase stand-ins.
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email varchar(255),
    raw_user_meta_data jsonb default '{}'::jsonb,
    created_at timestamptz default now()
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`);

process.on("unhandledRejection", (e) => { console.error("ERROR:", e.message, e.where || "", e.position ? "pos " + e.position : ""); process.exit(1); });
const mode = process.argv[2] || 'migrations';
if (mode === 'schema') {
  await db.exec(readFileSync(join(root, 'schema.sql'), 'utf8'));
  await db.exec(readFileSync(join(root, 'schema.sql'), 'utf8'));
  console.log('schema.sql applied twice');
} else {
  const files = readdirSync(join(root, 'migrations')).sort();
  for (const file of files) {
    await db.exec(readFileSync(join(root, 'migrations', file), 'utf8'));
    console.log('applied', file);
  }
  await db.exec(readFileSync(join(root, 'migrations', files.at(-1)), 'utf8'));
  console.log('re-applied', files.at(-1));
}

const q = async (sql, params) => (await db.query(sql, params)).rows;
const as = async (role, userId, fn) => {
  await db.exec(`set role ${role}`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId || '']);
  try { return await fn(); } finally { await db.exec('reset role'); }
};
const expectError = async (label, fn) => {
  try { await fn(); console.log('  FAIL (no error):', label); }
  catch (error) { console.log('  ok, rejected:', label, '->', error.message); }
};

const meta = (name, phone) => JSON.stringify({ display_name: name, phone });
const [owner] = await q(`insert into auth.users (email, raw_user_meta_data) values ('M.Misurati@outlook.com', $1) returning id`, [meta('محمد المصراتي', '+218917310458')]);
const [student] = await q(`insert into auth.users (email, raw_user_meta_data) values ('student@example.com', $1) returning id`, [meta('Student One', '+218911111111')]);
const [teacher2User] = await q(`insert into auth.users (email, raw_user_meta_data) values ('teacher2@example.com', $1) returning id`, [meta('Teacher Two', '+218922222222')]);

await db.exec(readFileSync(join(root, 'snippets', 'grant-owner-roles.sql'), 'utf8'));
console.log('owner roles:', await q(`select (select count(*) from private.admins) admins, (select user_id from public.instructors where slug = 'mohamed-al-misurati') = '${owner.id}' linked`));

// Second instructor with their own course, to check scoping.
await q(`insert into public.instructors (id, slug, name, name_en, user_id, position) values ('00000000-0000-4000-8000-000000000502', 'teacher-two', 'مدرب ثاني', 'Teacher Two', $1, 2)`, [teacher2User.id]);
await q(`insert into public.courses (id, slug, code, title, short_title, description, level, is_published, is_free, price, instructor_id, position)
         values ('00000000-0000-4000-8000-000000000105', 'paid-course', 'PAID', 'Paid course', 'Paid', 'd', 'l', true, false, 150, '00000000-0000-4000-8000-000000000502', 5)`);

console.log('\ncatalog');
console.log(await q(`select code, slug, title, duration_minutes, is_published from public.courses order by position`));
console.log(await q(`select c.code, count(l.*) lessons, sum(l.duration_seconds) seconds from public.lessons l join public.courses c on c.id = l.course_id group by c.code`));

console.log('\nanon');
await as('anon', null, async () => {
  console.log('  instructors:', await q(`select slug, name_en from public.instructors`));
  console.log('  lessons visible:', (await q(`select count(*) from public.lessons`))[0].count);
  await expectError('anon reads instructors.user_id', () => q(`select user_id from public.instructors`));
  await expectError('anon calls get_dashboard', () => q(`select public.get_dashboard()`));
});

console.log('\nstudent');
await as('authenticated', student.id, async () => {
  console.log('  roles:', (await q(`select public.get_my_roles() r`))[0].r);
  await q(`insert into public.enrollments (user_id, course_id) values ($1, '00000000-0000-4000-8000-000000000101')`, [student.id]);
  await q(`insert into public.lesson_progress (user_id, lesson_id, completed_at) values ($1, '00000000-0000-4000-8000-000000001101', now()), ($1, '00000000-0000-4000-8000-000000001102', now())`, [student.id]);
  console.log('  enrolled + 2 lessons completed');
  await expectError('student self-enrolls in paid course', () => q(`insert into public.enrollments (user_id, course_id) values ($1, '00000000-0000-4000-8000-000000000105')`, [student.id]));
  await expectError('student records a payment', () => q(`insert into public.payments (course_id, user_id, amount) values ('00000000-0000-4000-8000-000000000105', $1, 150)`, [student.id]));
  await expectError('student calls get_dashboard', () => q(`select public.get_dashboard()`));
  await expectError('student searches learners', () => q(`select * from public.admin_search_learners('a')`));
  const updated = await q(`update public.courses set price = 1, is_free = false where id = '00000000-0000-4000-8000-000000000101' returning id`);
  console.log('  student course update rows:', updated.length);
  const touched = await q(`update public.courses set title = 'x' returning id`);
  console.log('  rows a student can retitle:', touched.length);
  console.log('  title intact:', (await q(`select title from public.courses where id = '00000000-0000-4000-8000-000000000101'`))[0].title);
  console.log('  own payments:', (await q(`select count(*) from public.payments`))[0].count);
});

console.log('\nadmin (owner)');
await as('authenticated', owner.id, async () => {
  console.log('  roles:', (await q(`select public.get_my_roles() r`))[0].r);
  console.log('  search:', await q(`select display_name, email from public.admin_search_learners('student')`));
  await q(`insert into public.payments (course_id, user_id, amount, method, reference) values ('00000000-0000-4000-8000-000000000105', $1, 150, 'bank_transfer', 'TRX-1')`, [student.id]);
  await q(`insert into public.payments (course_id, user_id, amount, status) values ('00000000-0000-4000-8000-000000000105', $1, 99, 'pending')`, [student.id]);
  await q(`insert into public.payouts (instructor_id, amount, reference) values ('00000000-0000-4000-8000-000000000502', 40, 'PO-1')`);
  console.log('  payment snapshot:', await q(`select amount, status, instructor_share_percent, instructor_id from public.payments order by amount desc`));
  const updated = await q(`update public.courses set instructor_share_percent = 60 where id = '00000000-0000-4000-8000-000000000105' returning id`);
  console.log('  admin course update rows:', updated.length);
  const d = (await q(`select public.get_dashboard() d`))[0].d;
  console.log('  platform totals:', d.totals);
  console.log('  instructors:', d.instructors.map((i) => [i.slug, i.email, i.gross_revenue, i.instructor_earnings, i.platform_earnings, i.paid_out]));
  console.log('  courses:', d.courses.map((c) => [c.code, c.lessons, c.enrollments, c.avg_progress, c.gross_revenue, c.instructor_earnings]));
  console.log('  learners:', d.learners.map((l) => [l.name, l.email, l.course_code, l.progress]));
  console.log('  monthly:', d.monthly);
  console.log('  payments:', d.payments.map((p) => [p.amount, p.status, p.instructor_amount, p.learner_email]));
  const one = (await q(`select public.get_dashboard('00000000-0000-4000-8000-000000000501') d`))[0].d;
  console.log('  owner-instructor scope:', one.scope, one.instructor.slug, one.totals.courses, one.totals.students);
});

console.log('\nsecond instructor');
await as('authenticated', teacher2User.id, async () => {
  console.log('  roles:', (await q(`select public.get_my_roles() r`))[0].r);
  const d = (await q(`select public.get_dashboard() d`))[0].d;
  console.log('  scope:', d.scope, 'courses:', d.courses.map((c) => c.code), 'instructors:', d.instructors);
  console.log('  totals:', d.totals);
  console.log('  learner email hidden:', d.learners.map((l) => [l.name, l.email, l.phone]));
  console.log('  payouts:', d.payouts.map((p) => [p.amount, p.reference]));
  console.log('  payouts via table:', (await q(`select count(*) from public.payouts`))[0].count);
  await expectError('instructor views another instructor', () => q(`select public.get_dashboard('00000000-0000-4000-8000-000000000501')`));
  await expectError('instructor records payout', () => q(`insert into public.payouts (instructor_id, amount) values ('00000000-0000-4000-8000-000000000502', 10)`));
});

console.log('\nenrollment created by payment:', await q(`select course_id from public.enrollments where user_id = $1 order by course_id`, [student.id]));


// ---- Instructor portal ----
console.log('\ninstructor portal');
let newCourse;
await as('authenticated', teacher2User.id, async () => {
  newCourse = (await q(`select public.create_course('كورس تجريبي جديد', 'Brand New Course', 'NEW', 'وصف', 'desc', 'مبتدئ', 'Beginner') c`))[0].c;
  console.log('  created:', newCourse);
  const [{ id: moduleId }] = await q(`select id from public.modules where course_id = $1`, [newCourse.id]);
  const [lesson] = await q(`insert into public.lessons (course_id, module_id, title, title_en, duration_seconds, position, is_preview)
                            values ($1, $2, 'الدرس الأول', 'First lesson', 900, 1, true) returning id`, [newCourse.id, moduleId]);
  console.log('  lesson added:', Boolean(lesson.id));
  console.log('  video set:', (await q(`select public.set_lesson_video($1, '1Oq6NmDs9AJq9-JH_wTkR_z3PyQc6Yft6') v`, [lesson.id]))[0].v);
  await q(`insert into public.lesson_resources (lesson_id, title, title_en, url, kind, position)
           values ($1, 'شرائح الدرس', 'Slides', 'https://docs.google.com/presentation/d/ABC/edit', 'slides', 1)`, [lesson.id]);
  const content = (await q(`select public.get_course_content($1) c`, [newCourse.id]))[0].c;
  console.log('  content:', content.course.title, '| lessons:', content.lessons.length, '| video:', content.lessons[0].drive_file_id, '| resources:', content.lessons[0].resources.length);
  await q(`update public.courses set title = 'كورس تجريبي محدّث', is_published = true where id = $1`, [newCourse.id]);
  console.log('  own course updated');
  await expectError('instructor changes the revenue split', () => q(`update public.courses set instructor_share_percent = 95 where id = $1`, [newCourse.id]));
  const foreign = await q(`update public.courses set title = 'x' where id = '00000000-0000-4000-8000-000000000101' returning id`);
  console.log('  rows changed in another instructor course:', foreign.length);
  await expectError('instructor adds a lesson to another course', () => q(`insert into public.lessons (course_id, module_id, title, position) values ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000211', 'x', 99)`));
  await expectError('instructor sets video on another course lesson', () => q(`select public.set_lesson_video('00000000-0000-4000-8000-000000001101', 'zzz')`));
});

await as('authenticated', student.id, async () => {
  await expectError('student creates a course', () => q(`select public.create_course('كورس طالب', 'Student course')`));
  await expectError('student reads course content', () => q(`select public.get_course_content($1)`, [newCourse.id]));
  console.log('  resources visible to student:', (await q(`select title from public.lesson_resources`)).map((r) => r.title));
});
await as('anon', null, async () => {
  console.log('  resources visible to visitor:', (await q(`select title from public.lesson_resources`)).map((r) => r.title));
  await expectError('visitor reads lesson_media', () => q(`select * from private.lesson_media`));
});

console.log('\nworker lookup');
await as('service_role', null, async () => {
  const [row] = await q(`select lesson_id from private.lesson_media limit 1`);
  console.log('  service role reads video:', (await q(`select public.get_lesson_video($1) v`, [row.lesson_id]))[0].v);
});
await as('authenticated', student.id, async () => {
  await expectError('student calls get_lesson_video', () => q(`select public.get_lesson_video('00000000-0000-4000-8000-000000001101')`));
});



