import { createClient } from '@supabase/supabase-js';
import { config } from './config';

const supabaseUrl = config.supabaseUrl;
const supabasePublishableKey = config.supabasePublishableKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export async function enrollInCourse(userId, courseId) {
  if (!supabase || !userId) return { data: null, error: null };

  return supabase
    .from('enrollments')
    .upsert(
      { user_id: userId, course_id: courseId },
      { onConflict: 'user_id,course_id', ignoreDuplicates: true },
    );
}

export async function saveLessonProgress({ userId, lessonId, progressSeconds = 0, completed = false }) {
  if (!supabase || !userId) return { data: null, error: null };

  return supabase
    .from('lesson_progress')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        progress_seconds: Math.max(0, Math.round(progressSeconds)),
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' },
    )
    .select()
    .single();
}

export async function getUserProgress(userId) {
  if (!supabase || !userId) return { data: [], error: null };

  return supabase
    .from('lesson_progress')
    .select('lesson_id, progress_seconds, completed_at, updated_at')
    .eq('user_id', userId);
}

// Where the Worker lives. Empty when the Worker also serves the site (Cloudflare);
// set to e.g. https://glorytech-academy.<account>.workers.dev when the site is
// hosted elsewhere (Render container, cPanel).
const API_BASE = config.apiBase;

// Asks the Worker for a short-lived stream URL. status: ready | no_media | not_found | not_enrolled | unauthorized | error
export async function requestLessonPlayback(lessonId) {
  if (!supabase) return { status: 'unauthorized' };

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) return { status: 'unauthorized' };

  try {
    const response = await fetch(`${API_BASE}/api/lessons/${encodeURIComponent(lessonId)}/playback`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await response.json().catch(() => ({}));
    // The Worker answers with a path; it must point back at the Worker, not at the site.
    if (response.ok) return { status: 'ready', url: `${API_BASE}${body.url}`, expiresAt: body.expiresAt };
    if (['no_media', 'not_found', 'not_enrolled', 'unauthorized'].includes(body.error)) return { status: body.error };
    return { status: 'error' };
  } catch {
    return { status: 'error' };
  }
}

const COURSE_COLUMNS = 'id, slug, code, title, title_en, short_title, short_title_en, description, description_en, level, level_en, outcomes, outcomes_en, duration_minutes, is_free, price, availability_status, cover_url, instructor_id, position';
const INSTRUCTOR_COLUMNS = 'id, slug, name, name_en, title, title_en, bio, bio_en, photo_url, expertise, expertise_en, certifications, position';

function mapInstructor(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameEn: row.name_en,
    title: row.title,
    titleEn: row.title_en,
    bio: row.bio,
    bioEn: row.bio_en,
    photo: row.photo_url,
    expertise: row.expertise || [],
    expertiseEn: row.expertise_en || [],
    certifications: row.certifications || [],
    position: row.position,
  };
}

// Loads published courses (with modules and lessons) and active instructors.
export async function getPublishedCatalog() {
  if (!supabase) return { data: null, error: null };

  const [coursesResult, modulesResult, lessonsResult, instructorsResult] = await Promise.all([
    supabase.from('courses').select(COURSE_COLUMNS).eq('is_published', true).order('position'),
    supabase.from('modules').select('id, course_id, title, title_en, position').order('position'),
    supabase.from('lessons').select('id, course_id, module_id, title, title_en, duration_seconds, position, is_preview, telegram_message_id').order('position'),
    supabase.from('instructors').select(INSTRUCTOR_COLUMNS).eq('is_active', true).order('position'),
  ]);

  const error = coursesResult.error || modulesResult.error || lessonsResult.error || instructorsResult.error;
  if (error) return { data: null, error };

  const courses = coursesResult.data.map((course) => {
    const modules = modulesResult.data
      .filter((module) => module.course_id === course.id)
      .map((module) => ({
        id: module.id,
        title: module.title,
        titleEn: module.title_en,
        lessons: lessonsResult.data
          .filter((lesson) => lesson.module_id === module.id)
          .map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            titleEn: lesson.title_en,
            durationSeconds: lesson.duration_seconds,
            isPreview: lesson.is_preview,
            telegramMessageId: lesson.telegram_message_id,
          })),
      }));

    return {
      id: course.id,
      slug: course.slug,
      code: course.code,
      title: course.title,
      titleEn: course.title_en,
      shortTitle: course.short_title,
      shortTitleEn: course.short_title_en,
      description: course.description,
      descriptionEn: course.description_en,
      level: course.level,
      levelEn: course.level_en,
      outcomes: course.outcomes || [],
      outcomesEn: course.outcomes_en || [],
      durationMinutes: course.duration_minutes,
      isFree: course.is_free,
      price: Number(course.price) || 0,
      availability: course.availability_status || 'available',
      coverImage: course.cover_url,
      instructorId: course.instructor_id,
      position: course.position,
      modules,
      lessonsCount: modules.reduce((total, module) => total + module.lessons.length, 0),
    };
  });

  return { data: { courses, instructors: instructorsResult.data.map(mapInstructor) }, error: null };
}

// ---------------------------------------------------------------------------
// Roles and dashboards (see supabase/migrations/20260917090000_*.sql)
// ---------------------------------------------------------------------------

export async function getMyRoles() {
  if (!supabase) return { isAdmin: false, instructor: null };
  const { data, error } = await supabase.rpc('get_my_roles');
  if (error || !data) return { isAdmin: false, instructor: null };
  return { isAdmin: Boolean(data.is_admin), instructor: data.instructor || null };
}

export async function getDashboard(instructorId = null) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured') };
  return supabase.rpc('get_dashboard', { p_instructor_id: instructorId });
}

export async function searchLearners(query) {
  if (!supabase) return { data: [], error: null };
  return supabase.rpc('admin_search_learners', { p_query: query });
}

export async function updateCourseSettings(courseId, settings) {
  if (!supabase) return { error: null };
  return supabase
    .from('courses')
    .update({
      is_published: settings.isPublished,
      is_free: settings.isFree,
      price: settings.isFree ? 0 : settings.price,
      instructor_share_percent: settings.sharePercent,
    })
    .eq('id', courseId);
}

export async function recordPayment(payment) {
  if (!supabase) return { error: null };
  return supabase.from('payments').insert({
    course_id: payment.courseId,
    user_id: payment.userId,
    amount: payment.amount,
    method: payment.method,
    status: payment.status,
    reference: payment.reference || null,
    note: payment.note || null,
    paid_at: payment.paidAt,
  });
}

export async function updatePaymentStatus(paymentId, status) {
  if (!supabase) return { error: null };
  return supabase.from('payments').update({ status }).eq('id', paymentId);
}

export async function recordPayout(payout) {
  if (!supabase) return { error: null };
  return supabase.from('payouts').insert({
    instructor_id: payout.instructorId,
    amount: payout.amount,
    method: payout.method,
    reference: payout.reference || null,
    note: payout.note || null,
    paid_at: payout.paidAt,
  });
}

// ---------------------------------------------------------------------------
// Instructor portal: courses, lessons, videos and resources
// ---------------------------------------------------------------------------

export async function getCourseContent(courseId) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured') };
  return supabase.rpc('get_course_content', { p_course_id: courseId });
}

export async function createCourse(course) {
  if (!supabase) return { data: null, error: new Error('Supabase is not configured') };
  return supabase.rpc('create_course', {
    p_title: course.title,
    p_title_en: course.titleEn || null,
    p_code: course.code || null,
    p_description: course.description || null,
    p_description_en: course.descriptionEn || null,
    p_level: course.level || null,
    p_level_en: course.levelEn || null,
    p_instructor_id: course.instructorId || null,
  });
}

export async function updateCourseDetails(courseId, fields) {
  if (!supabase) return { error: null };
  return supabase
    .from('courses')
    .update({
      code: fields.code || null,
      title: fields.title,
      title_en: fields.titleEn || null,
      short_title: fields.shortTitle || fields.title,
      short_title_en: fields.shortTitleEn || fields.titleEn || null,
      description: fields.description,
      description_en: fields.descriptionEn || null,
      level: fields.level,
      level_en: fields.levelEn || null,
      outcomes: fields.outcomes,
      outcomes_en: fields.outcomesEn,
      duration_minutes: fields.durationMinutes,
      cover_url: fields.coverUrl || null,
      is_published: fields.isPublished,
      is_free: fields.isFree,
      price: fields.isFree ? 0 : fields.price,
    })
    .eq('id', courseId);
}

export async function saveLesson(lesson) {
  if (!supabase) return { error: null };
  const row = {
    course_id: lesson.courseId,
    module_id: lesson.moduleId,
    title: lesson.title,
    title_en: lesson.titleEn || null,
    duration_seconds: Math.max(0, Math.round(lesson.durationSeconds || 0)),
    position: lesson.position,
    is_preview: Boolean(lesson.isPreview),
  };
  if (lesson.id) return supabase.from('lessons').update(row).eq('id', lesson.id);
  return supabase.from('lessons').insert(row).select('id').single();
}

export async function deleteLesson(lessonId) {
  if (!supabase) return { error: null };
  return supabase.from('lessons').delete().eq('id', lessonId);
}

export async function moveLesson(lessonId, position) {
  if (!supabase) return { error: null };
  return supabase.from('lessons').update({ position }).eq('id', lessonId);
}

export async function setLessonVideo(lessonId, driveFileId) {
  if (!supabase) return { error: null };
  return supabase.rpc('set_lesson_video', { p_lesson_id: lessonId, p_drive_file_id: driveFileId || null });
}

export async function saveLessonResource(resource) {
  if (!supabase) return { error: null };
  const row = {
    lesson_id: resource.lessonId,
    title: resource.title,
    title_en: resource.titleEn || null,
    url: resource.url,
    kind: resource.kind,
    position: resource.position,
  };
  if (resource.id) return supabase.from('lesson_resources').update(row).eq('id', resource.id);
  return supabase.from('lesson_resources').insert(row);
}

export async function deleteLessonResource(resourceId) {
  if (!supabase) return { error: null };
  return supabase.from('lesson_resources').delete().eq('id', resourceId);
}

// Resources the current viewer is allowed to see (preview lessons, or lessons of an enrolled course).
export async function getLessonResources(lessonIds) {
  if (!supabase || !lessonIds.length) return { data: [], error: null };
  return supabase
    .from('lesson_resources')
    .select('id, lesson_id, title, title_en, url, kind, position')
    .in('lesson_id', lessonIds)
    .order('position');
}

// Saves the playback position without touching the completion flag.
export async function saveLessonPosition(userId, lessonId, progressSeconds) {
  if (!supabase || !userId) return { error: null };
  return supabase
    .from('lesson_progress')
    .upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        progress_seconds: Math.max(0, Math.round(progressSeconds)),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' },
    );
}
