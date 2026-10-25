import { useEffect, useState } from 'react'

type AtlasSheet = 'hero' | 'slime'
type GuildAsset = AtlasSheet | 'room'

/** The public manifest enables only images whose generation actually succeeded. */
export function useGuildAsset(name: GuildAsset) {
  const [source, setSource] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    setSource(null)
    void fetch('/assets/guild-v2/manifest.json', { cache: 'no-store' })
      .then((response) => (response.ok ? (response.json() as Promise<unknown>) : null))
      .then((value: unknown) => {
        if (
          !active ||
          !value ||
          typeof value !== 'object' ||
          !('assets' in value) ||
          !Array.isArray(value.assets)
        )
          return
        const available = value.assets.some(
          (asset: unknown) =>
            asset !== null &&
            typeof asset === 'object' &&
            'file' in asset &&
            asset.file === `${name}.png` &&
            'status' in asset &&
            asset.status === 'succeeded',
        )
        setSource(available ? `/assets/guild-v2/${name}.png` : null)
      })
      .catch(() => {
        if (active) setSource(null)
      })
    return () => {
      active = false
    }
  }, [name])
  return source
}

function SketchHero({ frame }: { frame: number }) {
  const celebrating = frame === 3
  const reading = frame === 5
  return (
    <svg
      viewBox="0 0 300 200"
      className="h-full w-full"
      aria-hidden="true"
      fill="none"
      stroke="#332820"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g
        transform={
          frame === 4
            ? 'rotate(82 150 111) translate(0 4)'
            : celebrating
              ? 'translate(0 -5)'
              : undefined
        }
      >
        <path
          d="M116 98 Q88 119 75 169 L130 159 152 177 182 161 214 171 Q198 125 179 101Z"
          fill="#a94732"
        />
        <path d="m117 116-17 40m82-38 17 38m-67-27-9 22m35-11 8 18" opacity=".42" />
        <path d="m125 129-3 43 18 2 11-27 9 27 19-2-5-44" fill="#626341" />
        <path d="m121 170-4 12 27 1-4-12m20 0-2 12 29-2-7-11" fill="#8c694b" />
        <path d="M124 98 115 134 Q151 148 183 134 L174 98" fill="#8b946a" />
        <path d="m126 102 25 14 23-14" fill="#d2b07b" />
        <path
          d="M120 73 Q114 36 146 34 Q185 31 187 71 Q188 103 154 106 Q122 103 120 73Z"
          fill="#e9cba5"
        />
        <path
          d="M119 63 Q117 39 139 37 Q124 18 143 20 Q158 25 150 39 Q174 29 187 56"
          fill="#564331"
        />
        <path d={frame === 4 ? 'm131 76 12 2m18 0 12-2' : 'm130 73 14 2m16 0 14-2'} />
        {frame !== 4 && <path d="m138 76v3m28-3v3" strokeWidth="4" />}
        <path d={celebrating ? 'M146 90q9 10 17-1' : 'm149 90 12 1'} />
        <path
          d={
            frame === 1 ? 'M176 113q26-1 10-37' : celebrating ? 'M122 111 98 84' : 'M120 116 92 137'
          }
          strokeWidth="12"
        />
        <path
          d={
            frame === 1 ? 'M176 113q26-1 10-37' : celebrating ? 'M122 111 98 84' : 'M120 116 92 137'
          }
          stroke="#e9cba5"
          strokeWidth="6"
        />
        <g transform={celebrating ? 'translate(5 -56)' : undefined}>
          <path
            d="M62 137 Q59 108 87 109 Q116 109 114 138 Q113 162 85 166 Q60 158 62 137Z"
            fill="#b8b4a0"
          />
          <path d="M68 135q-1-19 19-20 23 2 21 23-1 17-21 21-22-8-19-24Z" opacity=".55" />
          <path d="m79 130 7-6 8 8-6 11-7-4Zm-12-7 9 2m22 22 8 3" />
        </g>
        {!reading && (
          <g transform={frame === 2 || celebrating ? 'rotate(-25 186 126)' : undefined}>
            <path d="m179 121 32-61 8 27-29 42Z" fill="#fff8e7" />
            <path d="m211 60-24 63m-14 1 23 11m-12-6-9 18" />
            <path d="m197 95 7 4m-12 4 7 4" opacity=".5" />
          </g>
        )}
        {reading && (
          <g>
            <path d="M165 111q10-8 17 1h41q11 1 10 10l-3 37h-47l-3-38q-1-10-15-4Z" fill="#fff8e7" />
            <path d="M183 159q-5 9 6 10h36q10-1 5-10m-41-34 25 2m-24 9 20 1m-19 9 24 1" />
          </g>
        )}
      </g>
      {celebrating && (
        <path d="m58 38 1 15m-8-7 15-1m162-15 1 13m-7-6 13-1m-22-23 3 6" stroke="#c69a42" />
      )}
      {frame === 1 && <path d="m205 36 6-8m3 20 9-1" stroke="#a94732" />}
    </svg>
  )
}

function SketchSlime({ frame }: { frame: number }) {
  const resting = frame === 2
  const happy = frame === 3
  return (
    <svg
      viewBox="0 0 240 240"
      className="h-full w-full"
      aria-hidden="true"
      fill="none"
      stroke="#332820"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g
        transform={
          resting ? 'translate(0 75) scale(1 .58)' : happy ? 'translate(0 -10)' : undefined
        }
      >
        <path
          d="M39 178Q24 164 43 136q2-52 39-57 8-27 36-17 18-34 35-9-23-2-17 15 35-1 48 36 30 12 25 49 21 32-6 39-28 12-51 1-25 11-51 0-42 12-62-15Z"
          fill="#8d956b"
        />
        <path
          d="M57 144q-4-35 25-43m-28 56 7-3m17 27 8-3m102-30-6-17"
          stroke="#fff8e7"
          opacity=".65"
          strokeWidth="6"
        />
        {resting ? (
          <path d="m84 139q9 6 18 0m37 0q9 6 18 0" />
        ) : frame === 1 ? (
          <g fill="#332820">
            <ellipse cx="94" cy="135" rx="4" ry="8" />
            <ellipse cx="150" cy="135" rx="4" ry="8" />
          </g>
        ) : happy ? (
          <path d="m84 139q9-14 19 0m37 0q9-14 19 0" />
        ) : (
          <path d="m83 131 23 1m33 0 23-1m-67 4v6m55-6v6" />
        )}
        <path d={happy ? 'M112 153q9 12 21 0' : 'm113 155 20 1'} />
        <path d="m67 155 7-4m-3 13 7-4m88-4 7 4m-11 4 7 4" opacity=".5" strokeWidth="2" />
      </g>
      {frame === 1 && <path d="m176 61 5 11m9-23 2 14" stroke="#a94732" />}
      {happy && (
        <path d="m36 64 1 18m-8-9 17-1m152-18 1 18m-8-9 17-1m-31-28 4 8" stroke="#c69a42" />
      )}
    </svg>
  )
}

/** An original guild character; optional generated atlas cells can be enabled by a verified manifest. */
export function AtlasSprite({
  sheet,
  frame = 0,
  label,
  className = '',
}: {
  sheet: AtlasSheet
  frame?: number
  label?: string
  className?: string
}) {
  const source = useGuildAsset(sheet)
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    setFailed(false)
    setLoaded(false)
  }, [source])
  const columns = 2
  const rows = sheet === 'hero' ? 3 : 2
  const index = Math.max(0, Math.min(columns * rows - 1, Math.floor(frame)))
  const fallback = !source || failed || !loaded
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label ? `${label}${fallback ? '（公会原创手绘）' : ''}` : undefined}
      aria-hidden={label ? undefined : true}
      data-art-status={fallback ? 'sketch' : 'generated'}
      className={`relative block shrink-0 overflow-hidden ${className}`}
      style={{ aspectRatio: `${rows} / ${columns}` }}
    >
      {fallback && (
        <span className="absolute inset-0">
          {sheet === 'hero' ? <SketchHero frame={index} /> : <SketchSlime frame={index} />}
        </span>
      )}
      {source && !failed && (
        <img
          src={source}
          alt=""
          aria-hidden="true"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setFailed(true)
            setLoaded(false)
          }}
          className={`pointer-events-none absolute max-w-none ${loaded ? 'opacity-100' : 'opacity-0'}`}
          style={{
            width: `${columns * 100}%`,
            height: `${rows * 100}%`,
            left: `${-(index % columns) * 100}%`,
            top: `${-Math.floor(index / columns) * 100}%`,
          }}
        />
      )}
      {fallback && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 right-1 text-[8px] tracking-wider text-[#8b775c]"
        >
          公会手绘
        </span>
      )}
    </span>
  )
}
