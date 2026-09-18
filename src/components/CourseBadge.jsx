// Course logo tile in the Cisco certification style: bridge bars and wordmark above a code band.
const BAR_HEIGHTS = [10, 18, 28, 18, 10, 18, 28, 18, 10];

export default function CourseBadge({ code, className = 'h-24 w-24' }) {
  if (!code) return null;

  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={code} className={`shrink-0 drop-shadow-sm ${className}`}>
      <rect x="3" y="3" width="114" height="114" rx="16" fill="#ffffff" stroke="#0b5e73" strokeWidth="6" />
      <path d="M6 76h108v25a13 13 0 0 1-13 13H19A13 13 0 0 1 6 101Z" fill="#0b5e73" />
      {BAR_HEIGHTS.map((height, index) => (
        <rect key={index} x={20.1 + index * 9.4} y={40 - height} width="4.6" height={height} rx="2.3" fill="#0b5e73" />
      ))}
      <text x="60" y="63" textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontSize="17" fontWeight="800" letterSpacing="1.5" fill="#c8102e">CISCO</text>
      <text x="60" y="103" textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontSize="19" fontWeight="800" fill="#ffffff">{code}</text>
    </svg>
  );
}
