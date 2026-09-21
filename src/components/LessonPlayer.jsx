import { useCallback, useEffect, useState } from 'react';
import { Loader2, Lock, Radio, ShieldCheck, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { config } from '../lib/config';
import { useI18n } from '../i18n/I18nContext';
import { requestLessonPlayback } from '../lib/supabase';
import VideoPlayer from './VideoPlayer';

function PlayerMessage({ icon: Icon, title, text, children }) {
  return (
    <div className="relative grid aspect-video place-items-center overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#041f14] via-[#06402a] to-[#008548] p-6 text-center text-white shadow-2xl shadow-black/10 sm:p-8">
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#8ff0bd_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="relative max-w-md">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-white/15 bg-white/10 shadow-xl backdrop-blur sm:h-20 sm:w-20">
          <Icon className="h-8 w-8 sm:h-9 sm:w-9" />
        </span>
        <h2 dir="auto" className="mt-5 text-xl font-black sm:text-2xl">{title}</h2>
        {text && <p className="mt-3 text-sm font-medium leading-7 text-white/70">{text}</p>}
        {children}
      </div>
    </div>
  );
}

export default function LessonPlayer({ lesson, course, startAt = 0, onProgress }) {
  const { user, isDemo } = useAuth();
  const { t, pick } = useI18n();
  const [playback, setPlayback] = useState({ status: 'loading' });
  const channel = config.telegramChannel;
  const messageId = lesson?.telegramMessageId;
  const title = pick(lesson, 'title');

  const loadPlayback = useCallback(async () => {
    if (!lesson?.id || isDemo) {
      setPlayback({ status: 'no_media' });
      return;
    }
    setPlayback((current) => (current.status === 'ready' ? current : { status: 'loading' }));
    const result = await requestLessonPlayback(lesson.id);
    // A fresh query string makes the <video> element reload even if the signed URL is unchanged.
    setPlayback(result.status === 'ready' ? { ...result, url: `${result.url}?r=${Date.now()}` } : result);
  }, [lesson?.id, isDemo]);

  useEffect(() => {
    let active = true;
    if (!lesson?.id || isDemo) {
      setPlayback({ status: 'no_media' });
      return undefined;
    }
    setPlayback({ status: 'loading' });
    requestLessonPlayback(lesson.id).then((result) => { if (active) setPlayback(result); });
    return () => { active = false; };
  }, [lesson?.id, user?.id, isDemo]);

  if (playback.status === 'loading') {
    return (
      <div className="grid aspect-video place-items-center rounded-[1.75rem] bg-black shadow-2xl">
        <Loader2 className="h-12 w-12 animate-spin text-white/70" aria-label={t('common.loading')} />
      </div>
    );
  }

  if (playback.status === 'ready') {
    return <VideoPlayer key={lesson.id} src={playback.url} title={title} onRetry={loadPlayback} startAt={startAt} onProgress={onProgress} />;
  }

  if (playback.status === 'not_enrolled') {
    return (
      <PlayerMessage icon={Lock} title={t('player.notEnrolledTitle')} text={t('player.notEnrolledText')}>
        {course && <Link to={`/courses/${course.slug}`} className="mt-6 inline-flex rounded-full bg-white px-6 py-2.5 text-sm font-black text-[#06402a]">{t('player.goToCourse')}</Link>}
      </PlayerMessage>
    );
  }

  if (playback.status === 'not_found') {
    return <PlayerMessage icon={Video} title={t('player.notFoundTitle')} text={t('player.notFoundText')} />;
  }

  if (playback.status === 'error' || playback.status === 'unauthorized') {
    return (
      <PlayerMessage icon={Video} title={t('player.errorTitle')} text={playback.status === 'unauthorized' ? t('player.sessionText') : t('player.errorText')}>
        <button type="button" onClick={loadPlayback} className="mt-6 rounded-full bg-white px-6 py-2.5 text-sm font-black text-[#06402a]">{t('common.retry')}</button>
      </PlayerMessage>
    );
  }

  if (channel && messageId) {
    return (
      <div className="aspect-video overflow-hidden rounded-[1.75rem] bg-black shadow-2xl">
        <iframe
          src={`https://t.me/${channel}/${messageId}?embed=1&mode=tme`}
          title={title}
          className="h-full w-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <PlayerMessage icon={Video} title={title} text={t('player.pendingText')}>
      <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs font-bold text-white/75">
        <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"><Radio className="h-4 w-4 text-glory-300" /> {t('player.watchInside')}</span>
        <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2"><ShieldCheck className="h-4 w-4 text-glory-300" /> {t('player.protected')}</span>
      </div>
    </PlayerMessage>
  );
}
