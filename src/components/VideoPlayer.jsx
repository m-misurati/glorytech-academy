import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Gauge, Loader2, Maximize, Minimize, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX, X } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import SeekPreview from './SeekPreview';

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];
const HIDE_CONTROLS_AFTER_MS = 2500;
const MAX_AUTO_RETRIES = 3;

function formatTime(value) {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const total = Math.floor(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

export default function VideoPlayer({ src, title, onEnded, onRetry, startAt = 0, onProgress }) {
  const { t, dir } = useI18n();
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hideTimer = useRef(null);
  const resumeAt = useRef(startAt || 0);
  const lastReported = useRef(0);
  const supportsHevc = useRef(true);
  const hoverPointer = useRef(false);
  const autoRetries = useRef(0);
  const retryTimer = useRef(null);
  const resumePlaying = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [hover, setHover] = useState(null);
  const [previewArmed, setPreviewArmed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [noVideoTrack, setNoVideoTrack] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  useEffect(() => {
    setFailed(false);
    setWaiting(true);
    setNoVideoTrack(false);
    setWarningDismissed(false);
    setHover(null);
    setPreviewArmed(false);
  }, [src]);

  // Safari plays H.265, so a black picture there is never a codec problem and the
  // warning would only mislead. Chrome and Firefox on Windows are the real case.
  useEffect(() => {
    const probe = document.createElement('video');
    supportsHevc.current = probe.canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"') !== '';
    // The seek preview is a second <video> on the same file. An iPhone decodes one
    // video at a time, so arming it there blanks the lesson and leaves only sound.
    // Safari fires mousemove on a tap, so the pointer type decides, not the event.
    hoverPointer.current = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? true;
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => () => {
    clearTimeout(hideTimer.current);
    clearTimeout(retryTimer.current);
  }, []);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setControlsVisible(false);
        setSpeedMenuOpen(false);
      }
    }, HIDE_CONTROLS_AFTER_MS);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || failed) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const seekTo = (value) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.min(Math.max(value, 0), video.duration);
    setCurrentTime(video.currentTime);
  };

  const skip = (seconds) => seekTo((videoRef.current?.currentTime || 0) + seconds);

  const changeVolume = (value) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    video.muted = value === 0;
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) video.volume = 1;
  };

  const changeSpeed = (value) => {
    if (videoRef.current) videoRef.current.playbackRate = value;
    setSpeed(value);
    setSpeedMenuOpen(false);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }
    // iPhone Safari has no Fullscreen API on elements; only the video itself can go
    // fullscreen, and it does so with the native iOS controls.
    if (containerRef.current?.requestFullscreen) containerRef.current.requestFullscreen().catch(() => {});
    else if (videoRef.current?.webkitEnterFullscreen) videoRef.current.webkitEnterFullscreen();
    else containerRef.current?.webkitRequestFullscreen?.();
  };

  const handleKeyDown = (event) => {
    const actions = {
      ' ': togglePlay,
      k: togglePlay,
      ArrowRight: () => skip(5),
      ArrowLeft: () => skip(-5),
      m: toggleMute,
      f: toggleFullscreen,
    };
    const action = actions[event.key];
    if (!action || event.target.tagName === 'INPUT') return;
    event.preventDefault();
    action();
    revealControls();
  };

  const updateBuffered = () => {
    const video = videoRef.current;
    if (!video?.duration || !video.buffered.length) return;
    for (let i = 0; i < video.buffered.length; i += 1) {
      if (video.buffered.start(i) <= video.currentTime && video.currentTime <= video.buffered.end(i)) {
        setBuffered(video.buffered.end(i) / video.duration);
        return;
      }
    }
  };

  const handleError = () => {
    resumeAt.current = videoRef.current?.currentTime || resumeAt.current;
    resumePlaying.current = resumePlaying.current || playing;
    setPlaying(false);
    // On a slow or flaky link the stream drops now and then. Fetch a fresh URL and
    // resume at the same second, backing off 1s, 2s, 4s, before asking the learner.
    if (onRetry && autoRetries.current < MAX_AUTO_RETRIES) {
      const delay = 1000 * 2 ** autoRetries.current;
      autoRetries.current += 1;
      setWaiting(true);
      clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(onRetry, delay);
      return;
    }
    setFailed(true);
    setWaiting(false);
  };

  const retryNow = () => {
    autoRetries.current = 0;
    onRetry?.();
  };

  const played = duration ? currentTime / duration : 0;
  const showControls = controlsVisible || !playing;

  return (
    <div
      ref={containerRef}
      dir="ltr"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseMove={revealControls}
      onTouchStart={revealControls}
      onContextMenu={(event) => event.preventDefault()}
      className={`${fullscreen ? '' : 'aspect-video rounded-[1.75rem] shadow-2xl'} group relative overflow-hidden bg-black outline-none focus-visible:ring-2 focus-visible:ring-glory-500 ${showControls ? '' : 'cursor-none'}`}
    >
      <video
        ref={videoRef}
        src={src}
        title={title}
        preload="metadata"
        playsInline
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        onClick={togglePlay}
        onPlay={() => { setPlaying(true); revealControls(); }}
        onPause={(event) => { setPlaying(false); setControlsVisible(true); onProgress?.(event.currentTarget.currentTime); }}
        onWaiting={() => setWaiting(true)}
        onCanPlay={() => setWaiting(false)}
        onPlaying={() => { setWaiting(false); autoRetries.current = 0; }}
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          setDuration(video.duration);
          setWaiting(false);
          video.playbackRate = speed;
          if (resumeAt.current > 0) {
            video.currentTime = resumeAt.current;
            resumeAt.current = 0;
          }
          // Recovering from a dropped stream: carry on playing if the learner was watching.
          if (resumePlaying.current) {
            resumePlaying.current = false;
            video.play().catch(() => {});
          }
        }}
        onTimeUpdate={(event) => {
          const video = event.currentTarget;
          const seconds = video.currentTime;
          setCurrentTime(seconds);
          updateBuffered();
          // Audio running with no picture size means the browser cannot decode the
          // video track (H.265/HEVC does this in Chrome and Firefox on Windows).
          // Re-read it every tick so the notice clears itself once a frame arrives.
          if (seconds > 3 && !supportsHevc.current) {
            setNoVideoTrack(video.readyState >= 2 && video.videoWidth === 0);
          }
          // Report roughly every 15s so the lesson can be resumed later.
          if (onProgress && Math.abs(seconds - lastReported.current) > 15) {
            lastReported.current = seconds;
            onProgress(seconds);
          }
        }}
        onProgress={updateBuffered}
        onVolumeChange={(event) => { setVolume(event.currentTarget.volume); setMuted(event.currentTarget.muted); }}
        onEnded={() => { setPlaying(false); onEnded?.(); }}
        onError={handleError}
        className="h-full w-full bg-black object-contain"
      />

      {waiting && !failed && (
        <div dir={dir} className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-white/80" />
            {/* Until metadata arrives there is nothing to play; say so instead of a bare black box. */}
            {!duration && <p className="mt-4 text-sm font-bold text-white/70">{t('player.preparing')}</p>}
          </div>
        </div>
      )}

      {!playing && !waiting && !failed && (
        <button type="button" onClick={togglePlay} aria-label={t('player.play')} className="absolute inset-0 m-auto grid h-20 w-20 place-items-center rounded-full bg-glory-600 text-white shadow-2xl shadow-black/40 transition hover:scale-105">
          <Play className="h-9 w-9 translate-x-0.5 fill-current" />
        </button>
      )}

      {noVideoTrack && !warningDismissed && !failed && (
        <div dir={dir} className="absolute inset-x-0 top-0 p-4">
          <div className="mx-auto flex max-w-xl items-start gap-3 rounded-2xl bg-amber-500/95 p-4 text-start text-sm font-bold text-[#3a2600] shadow-xl">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span className="flex-1">{t('player.codecWarning')}</span>
            <button
              type="button"
              onClick={() => setWarningDismissed(true)}
              aria-label={t('common.close')}
              className="-m-1 grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-black/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {failed && (
        <div dir={dir} className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center text-white">
          <div>
            <AlertTriangle className="mx-auto h-10 w-10 text-amber-400" />
            <p className="mt-4 font-black">{t('player.failTitle')}</p>
            <p className="mt-2 text-sm text-white/60">{t('player.failText')}</p>
            {onRetry && (
              <button type="button" onClick={retryNow} className="mt-5 rounded-full bg-glory-600 px-6 py-2.5 text-sm font-black">{t('common.retry')}</button>
            )}
          </div>
        </div>
      )}

      <div className={`${showControls && !failed ? 'opacity-100' : 'pointer-events-none opacity-0'} absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-3 pt-12 text-white transition-opacity duration-300`}>
        <div
          className="group/seek relative h-4"
          onMouseMove={(event) => {
            if (!duration) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
            setHover({ ratio, time: ratio * duration });
            if (hoverPointer.current) setPreviewArmed(true);
          }}
          onMouseLeave={() => setHover(null)}
        >
          {previewArmed && (
            <SeekPreview src={src} time={hover?.time ?? 0} ratio={hover?.ratio ?? 0} visible={Boolean(hover)} />
          )}
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/20 transition-[height] group-hover/seek:h-2.5">
            <div className="absolute inset-y-0 left-0 bg-white/30" style={{ width: `${buffered * 100}%` }} />
            <div className="absolute inset-y-0 left-0 bg-glory-500" style={{ width: `${played * 100}%` }} />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step="any"
            value={currentTime}
            onChange={(event) => seekTo(Number(event.target.value))}
            aria-label={t('player.seek')}
            className="absolute inset-0 w-full cursor-pointer opacity-0"
          />
        </div>

        <div className="mt-2 flex items-center gap-1 sm:gap-2">
          <button type="button" onClick={togglePlay} aria-label={playing ? t('player.pause') : t('player.play')} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
            {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
          </button>
          <button type="button" onClick={() => skip(-10)} aria-label={t('player.back10')} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
            <RotateCcw className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => skip(10)} aria-label={t('player.forward10')} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
            <RotateCw className="h-5 w-5" />
          </button>

          <div className="group/volume flex items-center">
            <button type="button" onClick={toggleMute} aria-label={muted ? t('player.unmute') : t('player.mute')} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
              {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(event) => changeVolume(Number(event.target.value))}
              aria-label={t('player.volume')}
              className="hidden w-0 cursor-pointer accent-glory-500 transition-all group-hover/volume:w-20 sm:block"
            />
          </div>

          <span className="ml-1 whitespace-nowrap text-xs font-bold tabular-nums text-white/80 sm:text-sm">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="relative ml-auto">
            <button type="button" onClick={() => setSpeedMenuOpen((open) => !open)} aria-label={t('player.speed')} aria-expanded={speedMenuOpen} className="flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-black hover:bg-white/10">
              <Gauge className="h-5 w-5" /> {speed}x
            </button>
            {speedMenuOpen && (
              <div className="absolute bottom-12 right-0 min-w-24 overflow-hidden rounded-xl border border-white/10 bg-[#141a1c] py-1 shadow-2xl">
                {SPEEDS.map((value) => (
                  <button key={value} type="button" onClick={() => changeSpeed(value)} className={`${value === speed ? 'text-glory-400' : 'text-white/80'} block w-full px-4 py-2 text-left text-sm font-bold hover:bg-white/10`}>
                    {value}x
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? t('player.exitFullscreen') : t('player.fullscreen')} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
            {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
