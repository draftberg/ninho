const EGG_POSITIONS = [
  { cx: 100, cy: 118, rx: 22, ry: 27, rotate: -8 },
  { cx: 145, cy: 128, rx: 24, ry: 29, rotate: 4 },
  { cx: 190, cy: 120, rx: 21, ry: 26, rotate: 10 },
];

function eggFillLevel(eggIndex: number, progress: number): number {
  // cada ovo "enche" em sequência: ovo 0 vai de 0-33%, ovo 1 de 33-66%, ovo 2 de 66-100%
  const start = eggIndex / EGG_POSITIONS.length;
  const end = (eggIndex + 1) / EGG_POSITIONS.length;
  if (progress <= start) return 0;
  if (progress >= end) return 1;
  return (progress - start) / (end - start);
}

export function NestIllustration({
  progress,
  size = 160,
}: {
  progress: number;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  const clipId = "nest-clip";

  return (
    <svg
      viewBox="0 0 290 200"
      width={size}
      height={(size * 200) / 290}
      role="img"
      aria-label={`Ninho com progresso de ${Math.round(clamped * 100)}%`}
    >
      <defs>
        {EGG_POSITIONS.map((egg, i) => {
          const fill = eggFillLevel(i, clamped);
          const top = egg.cy - egg.ry;
          const height = egg.ry * 2;
          return (
            <clipPath key={i} id={`${clipId}-${i}`}>
              <rect
                x={egg.cx - egg.rx - 2}
                y={top + height * (1 - fill)}
                width={egg.rx * 2 + 4}
                height={height * fill + 2}
              />
            </clipPath>
          );
        })}
      </defs>

      {/* galhos do ninho */}
      <g stroke="#8a6a3f" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.55">
        <path d="M20 165 Q90 150 145 168 Q210 150 270 165" />
        <path d="M35 178 Q100 160 150 180 Q205 160 260 178" />
        <path d="M50 190 Q100 172 148 190 Q195 172 245 190" />
      </g>

      {/* ovos */}
      {EGG_POSITIONS.map((egg, i) => (
        <g key={i} transform={`rotate(${egg.rotate} ${egg.cx} ${egg.cy})`}>
          <ellipse
            cx={egg.cx}
            cy={egg.cy}
            rx={egg.rx}
            ry={egg.ry}
            fill="#F1EFE3"
            stroke="#C9BFA0"
            strokeWidth="1.5"
          />
          <ellipse
            cx={egg.cx}
            cy={egg.cy}
            rx={egg.rx}
            ry={egg.ry}
            fill="url(#egg-gradient)"
            clipPath={`url(#${clipId}-${i})`}
          />
        </g>
      ))}

      <defs>
        <linearGradient id="egg-gradient" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#C99A3E" />
          <stop offset="100%" stopColor="#E4C578" />
        </linearGradient>
      </defs>
    </svg>
  );
}
