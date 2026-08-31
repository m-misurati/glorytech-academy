import { Link } from 'react-router-dom';

export default function Brand({ compact = false, light = false }) {
  return (
    <Link to="/" className="inline-flex items-center gap-3" aria-label="GloryTech Academy — الرئيسية">
      <img src="/assets/glorytech-logo.jpg" alt="" className={`${compact ? 'h-10 w-10' : 'h-12 w-12'} rounded-xl bg-white object-cover`} />
      <span className="leading-none">
        <strong className={`block font-inter ${compact ? 'text-sm' : 'text-base'} font-black tracking-tight ${light ? 'text-white' : 'text-slate-950'}`}>GLORYTECH</strong>
        <small className={`font-inter text-[9px] font-bold tracking-[0.25em] ${light ? 'text-[#77e3d1]' : 'text-[#1bb89d]'}`}>ACADEMY</small>
      </span>
    </Link>
  );
}
