/** Gauge setengah lingkaran untuk rasio persentase (0–100). */
export function Gauge({
  percent,
  caption,
}: {
  percent: number;
  caption: string;
}) {
  const p = Math.max(0, Math.min(100, percent));
  const R = 76;
  const len = Math.PI * R;

  return (
    <svg
      viewBox="0 0 200 126"
      className="w-full h-auto"
      role="img"
      aria-label={`${caption} ${Math.round(p)}%`}
    >
      <defs>
        <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#407bff" />
          <stop offset="100%" stopColor="#2463ff" />
        </linearGradient>
      </defs>

      <path
        d={`M24,100 A${R},${R} 0 0 1 176,100`}
        fill="none"
        stroke="#eef0f5"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <path
        d={`M24,100 A${R},${R} 0 0 1 176,100`}
        fill="none"
        stroke="url(#gauge-grad)"
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray={`${(len * p) / 100} ${len}`}
      />

      <text
        x="100"
        y="88"
        textAnchor="middle"
        fontSize="30"
        fontWeight="800"
        fill="#111111"
        letterSpacing="-1"
      >
        {Math.round(p)}%
      </text>
      <text x="100" y="107" textAnchor="middle" fontSize="11" fill="#71717a">
        {caption}
      </text>
    </svg>
  );
}
