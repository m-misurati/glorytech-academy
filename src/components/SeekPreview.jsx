import { useEffect, useRef, useState } from 'react';

const WIDTH = 176;
const HEIGHT = 99;
const SEEK_DELAY_MS = 90;

function formatTime(value) {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const total = Math.floor(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

// Thumbnail shown above the seek bar while hovering. A second, muted <video> on the
// same signed URL seeks to the hovered time and paints that frame onto a canvas.
// It mounts on first hover and then stays mounted (hidden) so later hovers reuse the
// loaded video; a learner who never hovers pays nothing.
export default function SeekPreview({ src, time, ratio, visible }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const timer = useRef(null);
  const [hasFrame, setHasFrame] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(time)) return undefined;
    clearTimeout(timer.current);
    // Waits for the pointer to settle so sweeping across the bar does not queue dozens of seeks.
    timer.current = setTimeout(() => {
      if (video.readyState < 1) return;
      if (typeof video.fastSeek === 'function') video.fastSeek(time);
      else video.currentTime = time;
    }, SEEK_DELAY_MS);
    return () => clearTimeout(timer.current);
  }, [time]);

  const paint = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;
    canvas.getContext('2d').drawImage(video, 0, 0, WIDTH, HEIGHT);
    setHasFrame(true);
  };

  const onLoaded = () => {
    const video = videoRef.current;
    if (video && Number.isFinite(time)) video.currentTime = time;
  };

  return (
    <div
      className={`${visible ? 'opacity-100' : 'opacity-0'} pointer-events-none absolute bottom-6 z-10 -translate-x-1/2 transition-opacity duration-150`}
      style={{ left: `clamp(${WIDTH / 2 + 4}px, ${ratio * 100}%, calc(100% - ${WIDTH / 2 + 4}px))` }}
    >
      <div className="overflow-hidden rounded-xl border-2 border-white/90 bg-black shadow-2xl" style={{ width: WIDTH, height: HEIGHT }}>
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className={`${hasFrame ? 'opacity-100' : 'opacity-0'} block h-full w-full transition-opacity`} />
      </div>
      <p className="mt-1.5 text-center text-xs font-black tabular-nums text-white drop-shadow">{formatTime(time)}</p>
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={onLoaded}
        onSeeked={paint}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}
