import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export async function getPublishedCatalog() {
  if (!supabase) return { data: null, error: null };

  const [coursesResult, modulesResult, lessonsResult] = await Promise.all([
    supabase.from('courses').select('id, slug, title, short_title, description, level, accent, outcomes, duration_minutes, is_free, availability_status, cover_url, position').eq('is_published', true).order('position'),
    supabase.from('modules').select('id, course_id, title, position').order('position'),
    supabase.from('lessons').select('id, course_id, module_id, title, duration_seconds, position, is_preview, telegram_message_id').order('position'),
  ]);

  const error = coursesResult.error || modulesResult.error || lessonsResult.error;
  if (error) return { data: null, error };

  const data = coursesResult.data.map((course) => {
    const courseModules = modulesResult.data
      .filter((module) => module.course_id === course.id)
      .map((module) => ({
        id: module.id,
        title: module.title,
        lessons: lessonsResult.data
          .filter((lesson) => lesson.module_id === module.id)
          .map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            duration: formatDuration(lesson.duration_seconds),
            isPreview: lesson.is_preview,
            telegramMessageId: lesson.telegram_message_id,
          })),
      }));
    const accent = course.accent === 'orange' ? 'orange' : 'teal';
    return {
      id: course.id,
      slug: course.slug,
      code: `المسار ${String(course.position).padStart(2, '0')}`,
      title: course.title,
      shortTitle: course.short_title,
      description: course.description,
      level: course.level,
      duration: course.availability_status === 'coming_soon' ? 'يُعلن قريباً' : `${Math.round(course.duration_minutes / 60)} ساعات`,
      lessonsCount: courseModules.reduce((total, module) => total + module.lessons.length, 0),
      availability: course.availability_status || 'available',
      isFree: course.is_free,
      coverImage: course.cover_url,
      coverAlt: `غلاف كورس ${course.title}`,
      accent,
      coverClass: accent === 'orange' ? 'from-[#fff0e9] via-[#fde1d4] to-[#dff8f2]' : 'from-[#dff8f2] via-[#c7f0e8] to-[#fff0e9]',
      outcomes: course.outcomes || [],
      modules: courseModules,
    };
  });

  return { data, error: null };
}
