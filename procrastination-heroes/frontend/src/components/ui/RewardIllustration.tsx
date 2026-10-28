import type { ReactNode } from 'react'

type RewardIllustrationProps = {
  symbol?: string
  palette?: string
  className?: string
  compact?: boolean
  title?: string
}

type InkPalette = { accent: string; shade: string; light: string }
const ink = '#332e27'
const paper = '#f4e7c5'
const brass = '#d6a850'
const red = '#a84e3c'
const green = '#78805b'
const colors: Record<string, InkPalette> = {
  sage: { accent: '#8b9569', shade: '#566346', light: '#dce1bd' },
  gold: { accent: '#d6a850', shade: '#9b7039', light: '#f5d993' },
  lavender: { accent: '#a18baf', shade: '#735e80', light: '#e3d4e6' },
  rose: { accent: '#c17c65', shade: '#94523f', light: '#f0c9ae' },
  sky: { accent: '#80a8ad', shade: '#567d84', light: '#cfe4df' },
}

/** Shared, deterministic guild equipment art. AI chooses the motif and palette. */
export function RewardIllustration({
  symbol = 'star',
  palette = 'sage',
  className = 'h-full w-full',
  compact = false,
  title,
}: RewardIllustrationProps) {
  const tone = colors[palette] || colors.sage
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <ellipse cx="80" cy="145" rx="44" ry="6" fill={ink} opacity=".09" />
      <g stroke={ink} strokeWidth={compact ? 4.5 : 3} strokeLinecap="round" strokeLinejoin="round">
        <Drawing symbol={symbol} tone={tone} compact={compact} />
      </g>
      {!compact && (
        <g stroke={ink} strokeWidth="1.8" strokeLinecap="round" opacity=".55">
          <path d="M22 35l1-7m-4 4 8 1M134 113l3-5m-6 1 8 3" />
          <path d="m29 121-5 3m105-82 5-2" />
          <circle cx="131" cy="24" r="1.5" fill={brass} stroke="none" />
          <circle cx="21" cy="105" r="1.8" fill={red} stroke="none" />
        </g>
      )}
    </svg>
  )
}

function Drawing({
  symbol,
  tone: c,
  compact,
}: {
  symbol: string
  tone: InkPalette
  compact: boolean
}): ReactNode {
  switch (symbol) {
    case 'sword':
      return (
        <g transform="rotate(9 80 80)">
          <path d="m79 10 20 25-3 58-31 1-4-59Z" fill={paper} />
          <path d="m79 10 3 77 14 6 3-58Z" fill={c.light} />
          <path d="m79 10 3 77M65 94l17-7" />
          <path d="m73 112-2 26 10 9 10-9-2-26" fill={red} />
          <path d="m70 118 19 5m-19 4 19 5m-18 4 17 4" stroke={paper} strokeWidth="2" />
          <path d="m43 91 75-2-3 21-69 2Z" fill={brass} />
          <path
            d="m48 94 15-1 1 12-15 1Zm19-1 15-1 1 12-15 1Zm19-1 15-1 1 12-15 1Z"
            fill={paper}
            strokeWidth="2"
          />
          {!compact && (
            <g strokeWidth="1.7">
              <path d="m68 38 9 2m-8 8 7 2m-6 8 6 1m-5 9 6 1m12-31 6-2M52 99h6m15-1 3 2 3-3m13 0h4" />
              <path d="m96 52-6 4 5 6" fill={paper} />
              <path d="m74 18 4 8m-13 52 5 2" />
            </g>
          )}
          <circle cx="81" cy="140" r="4" fill={brass} strokeWidth="2" />
        </g>
      )
    case 'shield':
      return (
        <>
          <path d="M53 34Q33 23 34 46l4 30m69-44q22-11 21 12l-5 30" stroke={red} strokeWidth="10" />
          <path
            d="M78 21C112 18 137 43 136 79c-1 37-26 64-57 64-34 1-56-28-55-62 0-33 22-58 54-60Z"
            fill={c.accent}
          />
          <path
            d="M79 31c27-2 47 20 46 49-1 30-20 53-45 53-27 1-46-23-45-51 0-27 18-49 44-51Z"
            fill={c.light}
          />
          <path d="M62 74c-1-25 36-25 35-1l-1 22H63Z" fill={brass} />
          <path d="M72 74c0-13 15-14 15-1l-1 14H73Z" fill={c.shade} />
          <circle cx="80" cy="42" r="3" fill={ink} />
          <circle cx="80" cy="122" r="3" fill={ink} />
          {!compact && (
            <g strokeWidth="1.7">
              <path d="m45 53 9-4m-12 14 10-5m58 39 8-6m-12 14 10-6M42 92l6 4-5 7m66-48 8 4-6 5" />
              <path d="m45 112 18-6 7 20-18 6Z" fill={paper} />
              <path d="m49 115 12 7m-9-10 5 15" stroke={red} />
              <path d="m62 64 6 3m26-3-5 4" />
            </g>
          )}
        </>
      )
    case 'scroll':
      return (
        <g transform="rotate(-7 80 80)">
          <path d="m43 28 72 2 1 93-68 7Z" fill={paper} />
          <path d="M40 28c-16 0-18 24-1 25h15V39h61c12 0 13-11 1-11Z" fill={c.light} />
          <path d="M40 28c11 0 12 22-1 22m16-10v86" />
          <path d="M49 119c-18-1-20 23-2 25h66c17-1 19-24 2-25Z" fill={c.light} />
          <path d="M49 120c12 1 12 22-2 24m64-23c-9 3-8 20 1 21" />
          <path d="m85 103-7 36 13-7 9 9 5-36" fill={red} />
          <path d="m94 83 11 6 3 12-8 10-12 1-9-9 2-12Z" fill={red} />
          <circle cx="94" cy="98" r="8" fill={brass} strokeWidth="2" />
          {!compact && (
            <g strokeWidth="2">
              <path d="M66 55h35m-35 8h27m-27 9h31m-31 8h16m-16 9h8" opacity=".65" />
              <path d="m94 93 1 3 3 1-3 2-1 3-2-3-3-1 3-2Z" fill={paper} />
              <path d="m40 131 5 1m65 0 6 1" />
            </g>
          )}
        </g>
      )
    case 'lamp':
      return (
        <>
          <path d="m47 62 51 56-72-2Z" fill="#f7d995" stroke="none" opacity=".58" />
          <path d="m60 69 18 16 24-37-18-10-23 30" fill={c.accent} />
          <path d="m79 84-9 37 15 5 9-39" fill={c.shade} />
          <circle cx="84" cy="84" r="10" fill={brass} />
          <circle cx="96" cy="43" r="9" fill={brass} />
          <path d="M64 123c-12 1-18 8-17 17l61 1c2-10-6-17-17-18Z" fill={c.accent} />
          <path d="m48 133 58 1" />
          <path d="M42 37c12-14 28-10 36 1l9 26-55 12Z" fill={brass} />
          <path d="m32 76 55-12-2 10-49 11Z" fill={c.light} />
          <path d="m49 29-3-9 9-3 4 10" fill={c.shade} />
          {!compact && (
            <g strokeWidth="1.8">
              <path d="m45 44-6 20m14-24-6 22m30 28 8-6m-32 52h13m9 0h12m-62-36-5 7m14-3-1 8" />
              <path d="m78 109 9 2-2 10-9-2Z" fill={paper} />
              <circle cx="84" cy="84" r="3" fill={paper} />
            </g>
          )}
        </>
      )
    case 'leaf':
      return (
        <>
          <path d="M80 99c2-25-3-44 10-68m-9 54L58 63m25 6 24-20" stroke={green} strokeWidth="5" />
          <path d="M73 76C48 79 34 59 38 38c25 0 38 12 35 38Z" fill={c.accent} />
          <path d="M86 58C76 34 88 19 111 17c10 24 0 40-25 41Z" fill={green} />
          <path d="M86 82c1-23 18-37 39-33-1 24-13 38-39 33Z" fill={c.light} />
          <path d="m50 99 61-1-8 41-41 3Z" fill="#bd795a" />
          <path d="m45 92 72-2 1 14-72 3Z" fill={brass} />
          <path d="m62 123 22-3 2 15-21 3Z" fill={paper} />
          {!compact && (
            <g strokeWidth="1.8">
              <path d="M47 48q18 15 24 25m25-46-9 28m27 6L89 79m5 26-5 10 8 7-5 15m-23-9 9-1m-7 5 8-1" />
              <path d="M64 112q5 1 8-2m26 20h3" opacity=".55" />
            </g>
          )}
        </>
      )
    case 'book':
      return (
        <g transform="rotate(-8 80 80)">
          <path d="m41 26 73 3 7 107-74 5-13-13Z" fill={paper} />
          <path d="m34 24 75-3 7 107-77 7Z" fill={c.accent} />
          <path d="m34 24 13-1 7 109-15 3Z" fill={c.shade} />
          <path d="m109 22 7 107 5 7-74 5-8-6" />
          <path d="m38 66 75-4 2 16-76 4Z" fill={red} />
          <rect x="79" y="64" width="19" height="17" rx="2" fill={brass} />
          <path d="m85 69 7-1 1 7-7 1Z" fill={c.shade} strokeWidth="2" />
          <path d="m66 28 16-1 2 27-9-7-7 9Z" fill={paper} />
          <path d="m53 103 10 1-1 12-10-1Zm42-64 10-1 1 11-10 1Z" fill={brass} />
          {!compact && (
            <g strokeWidth="1.7">
              <path d="m46 35 2 21m-7-20 1 13m15 88 47-3m-43 7 31-2m-36-94 3 4 3-4m8-4h16" />
              <path d="m61 92 16 3m-16 6 24 3m-22 6 17 2" stroke={paper} opacity=".7" />
            </g>
          )}
        </g>
      )
    case 'camera':
      return (
        <>
          <path
            d="M36 66C12 72 11 122 40 129m82-62c28 9 23 51-2 60"
            stroke={c.shade}
            strokeWidth="7"
          />
          <path d="m30 48 96 1 5 65-104 2Z" fill={c.accent} />
          <path d="m31 48 18-14 37 1 12 14" fill={c.shade} />
          <path d="m29 62 99 1 2 40-102 3Z" fill="#9b775c" />
          <rect x="101" y="39" width="16" height="10" rx="3" fill={brass} />
          <path d="m41 43 25-1 1 13-26 1Z" fill={paper} />
          <circle cx="80" cy="82" r="30" fill={brass} />
          <circle cx="80" cy="82" r="23" fill={c.shade} />
          <circle cx="80" cy="82" r="15" fill={c.light} />
          <path d="m56 119 43-5 4 29-43 5Z" fill={paper} />
          {!compact && (
            <g strokeWidth="1.8">
              <path d="m64 123 26-3 3 15-27 3Z" fill={c.light} />
              <path d="m68 133 7-8 7 6 4-5 5 6m-15-52 6-6m-14 9 3-3M37 72v23m83-23v23" />
              <circle cx="114" cy="56" r="2" fill={red} />
              <path d="m40 108 4-1m71 0 5-1" />
            </g>
          )}
        </>
      )
    case 'mountain':
      return (
        <>
          <path d="M33 115c-20-45 0-91 47-93 45-1 66 49 45 92Z" fill={c.light} />
          <path d="m39 107 24-43 16 24 17-39 28 58Z" fill={c.accent} />
          <path d="m86 72 10-23 13 28-10-6-7 7Z" fill={paper} />
          <path d="m54 80 9-16 10 16-8-3-5 6Z" fill={paper} />
          <path d="m38 110 89-1 4 25-101 1Z" fill="#a6794b" />
          <path d="m35 133 93 1 4 9-102 1Z" fill={brass} />
          <path d="m64 118 33-1 1 14-33 1Z" fill={paper} />
          {!compact && (
            <g strokeWidth="1.8">
              <path d="M41 61c1-13 13-25 23-27m-24 38-1 8m69-46 5 5m-71 83 13-1m50 6 14-1M96 49V36l13 5-13 4" />
              <path d="m49 111 6-13 6 13m48-1 5-13 6 13" fill={green} />
              <path d="m72 124 6 1 3-4 5 6 5-4" />
            </g>
          )}
        </>
      )
    case 'moon':
      return (
        <>
          <path d="M97 20c-43-3-65 48-41 78 16 20 46 22 68 2-42 5-66-40-27-80Z" fill={brass} />
          <path d="m78 113-6 15 25 1-7-17" fill={c.shade} />
          <path d="M64 128q-14 0-17 16l64-1q-2-15-15-15Z" fill={c.accent} />
          <path d="M107 30v35m-5-32-9 3m29 43 6 10" stroke={c.shade} strokeWidth="2" />
          <path d="m106 59 4 9 10 1-8 7 3 10-9-5-8 6 1-11-8-7 11-2Z" fill={c.light} />
          {!compact && (
            <g strokeWidth="1.8">
              <path d="m65 43-6 9m-4 8-2 5m4 20 4 6m-6 46 11 1m31-2 7 1" />
              <circle cx="76" cy="29" r="3" />
              <circle cx="70" cy="99" r="4" />
              <path d="m123 91 6-3 7 14-7 3Z" fill={paper} />
            </g>
          )}
        </>
      )
    case 'flower':
      return (
        <>
          <path
            d="M84 105c-1-23 17-48 5-66m-8 44L56 68m28 9 25-12"
            stroke={green}
            strokeWidth="5"
          />
          <path d="M77 86c-24 2-40-9-40-26 19-4 38 8 40 26Z" fill={c.accent} />
          <path d="M89 78c5-22 20-31 37-26-4 21-17 29-37 26Z" fill={green} />
          <path
            d="M89 30c-8-25-29-16-23 3-25-10-31 15-10 19-18 17 4 31 17 14 7 25 29 13 23-5 23 2 31-22 9-25 10-20-11-28-16-6Z"
            fill={c.light}
          />
          <circle cx="81" cy="47" r="15" fill={brass} />
          <path
            d="m64 100 35 1c-7 15 20 25 13 38-14 12-47 12-61 0-7-14 20-25 13-39Z"
            fill={paper}
          />
          <path d="m58 122 30-5 4 15-29 6Z" fill={c.accent} />
          {!compact && (
            <g strokeWidth="1.8">
              <path d="m74 43 2 1m10-3 2 1m-11 10 8-1M45 67l26 16m44-23-19 14m-30 51 13 3m-8-7 3 11m24 1 4 3" />
              <path d="m60 139 7 2m24-1 9-2" />
            </g>
          )}
        </>
      )
    case 'cloud':
      return (
        <>
          <path
            d="m57 33 47 1-1 15c20 10 24 71 12 88-11 12-64 12-74 0-12-19-5-77 15-88Z"
            fill={c.light}
          />
          <path d="m56 22 49 1-1 18-49-1Z" fill="#a6794b" />
          <path d="m51 41 58 1-1 10-57-1Z" fill={brass} />
          <path
            d="M56 84c-16-2-13-22 0-23 1-18 23-21 29-8 15-10 33 4 24 18 13 12 2 23-13 21l-37-1Z"
            fill={paper}
          />
          <path d="m80 91-14 20 12-1-3 17 18-25-12 2 7-13" fill={brass} />
          <path d="m99 46 16 15m-9-4 12 4" stroke={red} strokeWidth="2" />
          <path d="m107 63 14 7-9 21-13-6Z" fill={red} />
          {!compact && (
            <g strokeWidth="1.8">
              <path d="m61 74 7 1m18-1 7 1m-20 7 6 1M46 105l-1 14m4 11 2 4m16 4 26 1m-31-109 11 1m8 0 10 1" />
              <path d="m106 76 6 2" stroke={paper} />
            </g>
          )}
        </>
      )
    case 'dumbbell':
      return (
        <g transform="rotate(-10 80 80)">
          <path d="M46 82h68" stroke={c.shade} strokeWidth="10" />
          <path d="M38 58h14v49H38Zm70 0h14v49h-14Z" fill={c.accent} />
          <path d="M27 49h16v67H27Zm90 0h16v67h-16Z" fill={brass} />
          <path d="M30 62h10m-10 42h10m81-42h10m-10 42h10" />
          {!compact && <path d="m57 76 7-7m9 4 7-7m9 4 7-7" stroke={paper} strokeWidth="2" />}
        </g>
      )
    case 'microscope':
      return (
        <g transform="rotate(-6 80 80)">
          <path d="M69 25h18l8 54-18 4Z" fill={c.accent} />
          <path d="m77 36 22-10 9 15-24 12Z" fill={brass} />
          <circle cx="103" cy="34" r="9" fill={c.light} />
          <path d="m72 78-22 35m35-30-9 31m-30 0h63v12H44Z" fill={c.shade} />
          <path d="M60 113c1-25 38-27 40 0" stroke={red} strokeWidth="6" />
          <circle cx="80" cy="90" r="6" fill={brass} />
          {!compact && (
            <path d="m56 128 14-1m13 0 18-1m-3-83-7 7m-8-1-6 6" stroke={paper} strokeWidth="2" />
          )}
        </g>
      )
    default:
      return (
        <>
          <path d="m51 80-9 66 26-14 15 15 11-64m1-1 24 56-24-7-14 16-5-56" fill={red} />
          <path d="m79 16 18 31 36 5-23 28 5 36-35-13-32 15 3-37-25-26 36-7Z" fill={brass} />
          <path d="m79 31 13 25 26 3-18 20 3 25-23-10-22 11 2-26-19-19 27-5Z" fill={c.light} />
          <path d="m80 51 9 17 18 3-14 13 2 19-16-8-16 9 3-20-14-12 19-4Z" fill={c.accent} />
          {!compact && (
            <g strokeWidth="1.8">
              <path d="m79 40 1 6m-37 15 6 1m61-1 6-2m-61 44 4-5m44 1 4 5M55 110l-6 23m54-21 8 16" />
              <path d="m76 76 2 1m8-2 2 1m-12 9 8-1" />
            </g>
          )}
        </>
      )
  }
}
