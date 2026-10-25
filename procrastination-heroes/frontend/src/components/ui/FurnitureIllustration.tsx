import type { ReactNode } from 'react'

const ink = '#332e27'
const oak = '#bc8b52'
const honey = '#d8ae68'
const paper = '#f2e7cd'
const green = '#7e8a60'
const red = '#aa5e49'

/** Real furniture silhouettes for owned shop items, independent of reward motifs. */
export function FurnitureIllustration({
  itemId,
  className = 'h-full w-full',
}: {
  itemId: string
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="80" cy="144" rx="51" ry="6" fill={ink} opacity=".1" />
      <g stroke={ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <Furniture itemId={itemId} />
      </g>
    </svg>
  )
}

function Furniture({ itemId }: { itemId: string }): ReactNode {
  switch (itemId) {
    case 'lamp':
      return (
        <>
          <path d="m52 70 44 49-71-2Z" fill="#f5d99c" stroke="none" opacity=".65" />
          <path d="m65 68 17 17 23-37-16-10Z" fill={green} />
          <path d="m78 83-8 40 16 3 9-40" fill={green} />
          <circle cx="96" cy="44" r="9" fill={honey} />
          <circle cx="84" cy="84" r="10" fill={honey} />
          <path d="M61 124c-10 1-17 7-17 17h66c-1-10-7-16-19-17Z" fill={green} />
          <path d="m46 134 61 1" />
          <path d="M44 38c11-11 26-7 31 4l11 26-55 11Z" fill={honey} />
          <path d="m31 79 55-11-1 9-51 11Z" fill={paper} />
          <path d="m49 31-2-10 10-2 3 12" fill={green} />
          <path d="m45 45-6 23m15-25-6 22m32 19 7-1M71 130h13m-28 7h8" strokeWidth="1.7" />
        </>
      )
    case 'lamp2':
      return (
        <>
          <path d="M40 129V45c0-34 64-36 68-6" stroke={oak} strokeWidth="9" />
          <path d="M105 31v14" />
          <path d="M104 45c-34-6-53 32-38 53 11 16 35 16 49 2-32 1-44-31-11-55Z" fill={honey} />
          <path d="m62 128 41 1c13 1 19 6 19 14H27c1-10 9-14 20-15Z" fill={oak} />
          <path d="m31 138 87 1M77 58l-6 7m-3 9-2 6m38 28 3 5" strokeWidth="1.7" />
          <path d="m122 68 3 7 8 1-6 5 1 8-7-4-7 4 2-8-5-6 8-1Z" fill={paper} strokeWidth="2" />
          <path d="m105 41 17 26" strokeWidth="1.6" />
          <circle cx="77" cy="95" r="3" strokeWidth="1.7" />
        </>
      )
    case 'plant':
      return (
        <>
          <path d="M79 105c-1-30 7-57-2-80m4 57L54 62m28 2 25-23" stroke={green} strokeWidth="5" />
          <path d="M76 76c-26 1-40-18-37-38 24 1 39 14 37 38Z" fill={green} />
          <path d="M85 58C68 40 76 18 97 14c14 19 12 36-12 44Z" fill="#a4ae7b" />
          <path d="M84 89c-1-29 17-43 40-37 1 24-15 39-40 37Z" fill={green} />
          <path d="m48 102 64-1-9 40-44 2Z" fill={red} />
          <path d="m44 93 73-2 1 15-73 3Z" fill={honey} />
          <path
            d="m49 48 22 24m19-45-5 27m28 10L88 85m6 22-5 11 7 8-5 14m-23-22-2 15"
            strokeWidth="1.7"
          />
          <path d="m63 120 18-2 2 15-18 2Z" fill={paper} strokeWidth="2" />
          <path d="m68 125 9 1m-8 4 7 1" strokeWidth="1.6" />
        </>
      )
    case 'plant2':
      return (
        <>
          <path
            d="M80 110c-2-30-2-59 15-87m-18 76C58 72 45 50 48 28"
            stroke={green}
            strokeWidth="4"
          />
          <path d="M74 104C37 100 31 83 35 57c26 3 42 20 39 47Z" fill={green} />
          <path d="M85 101c0-27 15-44 38-42 1 21-9 38-38 42Z" fill="#a4ae7b" />
          <path d="m96 25 15 7m-21 3 13 13m-21-1 11 16M47 30 33 38m17 4-10 13" strokeWidth="2" />
          <path d="M104 33c0-11 15-11 16 0l3 10q-11-3-22 1Z" fill={paper} />
          <path d="M99 49c-1-10 13-13 15-3l5 9q-11 0-19 7Z" fill={paper} />
          <path d="M89 66c-2-10 12-13 15-4l6 9q-10 2-18 7Z" fill={paper} />
          <path d="M26 39c0-10 13-12 16-3l4 9q-10-1-19 5Z" fill={paper} />
          <path d="M35 56c-1-9 11-12 14-3l5 9q-9 1-17 6Z" fill={paper} />
          <path
            d="m64 102 33 1c-3 18 17 24 12 37-13 10-43 10-57-1-3-12 17-21 12-37Z"
            fill="#d4b88a"
          />
          <path d="m59 131 43 1m-39 7 34 1m-44-64 16 23m43-28-22 27" strokeWidth="1.7" />
        </>
      )
    case 'desk':
      return (
        <>
          <path d="m29 70 4 72 12-1 2-65m64-10 6 73 12-2-1-78" fill={oak} />
          <path d="m51 77 3 60 10-2 1-61m75-12-3 63-9 2-1-62" fill="#956943" />
          <path d="m22 62 93-17 29 20-94 23-28-17Z" fill={honey} />
          <path d="m22 62 28 17 94-23v10L50 89 22 73Z" fill={oak} />
          <path d="m53 89 39-9 1 29-39 10Z" fill={oak} />
          <path d="m58 94 28-6 1 16-28 7Z" fill={honey} />
          <path
            d="m72 97 5-1m-35-29 48-9m-35 16 18-4m28-10 12-2M35 106l2 21m84-42 3 27"
            strokeWidth="1.7"
          />
          <path d="m76 56 23-5 9 5-24 6Z" fill={paper} strokeWidth="2" />
          <path d="m88 53 7-2" stroke={red} strokeWidth="2" />
        </>
      )
    case 'desk2':
      return (
        <>
          <path d="m26 67 6 75 13-1 1-71m69-17 6 87 13-2-3-83" fill="#8f6843" />
          <path d="m48 76 3 60 12-2-1-60m74-10-1 57-10 3-1-58" fill={oak} />
          <path d="m19 54 94-14 32 19-96 23-30-17Z" fill={honey} />
          <path d="m19 54 30 18 96-23v13L49 85 19 68Z" fill={oak} />
          <path d="m43 114 77-15 11 10-81 19-11-6Z" fill={honey} />
          <path d="m42 91 13 13 58-25m-66 30 58-19" stroke="#8f6843" strokeWidth="6" />
          <path d="m63 77 37-9 2 25-38 9Z" fill={oak} />
          <path d="m68 81 28-7 1 14-28 7Z" fill={honey} strokeWidth="2" />
          <path
            d="m79 83 7-1m-51-26 49-7m-30 16 45-9M39 117l54-10m-58 21 3 8m88-60 2 24"
            strokeWidth="1.7"
          />
          <path d="m108 52 12-3 5 16-13 4Z" fill={green} />
          <path d="m117 66 3 20 11-2m-5-6v13" strokeWidth="3" />
        </>
      )
    case 'rug':
      return (
        <>
          <path d="m17 82 71-34 57 51-72 42Z" fill={red} />
          <path d="m30 83 57-25 44 39-57 33Z" fill={honey} />
          <path d="m41 85 44-20 35 31-45 26Z" fill={paper} />
          <path
            d="m80 73 6 12 17 4-14 8 1 15-15-9-14 5 6-13-8-12 15 1Z"
            fill={green}
            strokeWidth="2"
          />
          <path
            d="m21 89-9 6m17 2-10 7m18 0-10 7m17 1-10 7m18 0-10 8m18 0-9 7m18 0-8 7m70-44 10 5m-16 0 10 5m-18 0 10 5m-18 0 9 6m-17 0 9 6m-17-1 9 6m-17-1 9 6"
            stroke={oak}
            strokeWidth="2"
          />
          <path d="m24 82 6 1m54-29 5 2m49 40 1 5m-65 33-5-2" strokeWidth="1.6" />
        </>
      )
    case 'rug2':
      return (
        <>
          <ellipse cx="80" cy="100" rx="67" ry="39" fill={green} />
          <ellipse cx="80" cy="98" rx="58" ry="31" fill={paper} />
          <ellipse cx="80" cy="98" rx="48" ry="24" fill="#a7b181" />
          <path
            d="m80 75-17 14 8-1-13 12 16-2v14h11V98l17 4-13-13 8 1Z"
            fill={green}
            strokeWidth="2"
          />
          <path
            d="m51 92-11 10 7-1-8 9 15-3m53-16 12 11-7-1 9 9-16-3"
            stroke={green}
            strokeWidth="3"
          />
          <path
            d="m15 101-5 1m8 9-5 3m13 5-4 4m15 2-3 5m16 0-2 5m19-1-1 5m21-4 1 6m18-9 3 5m14-11 4 4m9-13 5 3m3-15 5 1m-5-12 5-1"
            stroke={oak}
            strokeWidth="2"
          />
          <path d="m46 82 8-3m60 11 6 3m-54 23 10 1" strokeWidth="1.6" />
        </>
      )
    case 'chair':
      return (
        <>
          <path d="m43 123 2 20 12-1 3-21m41-2 3 23 11-1 2-22" fill={oak} />
          <path d="M39 85V43c0-23 82-23 82 0v43" fill={red} />
          <path d="M49 80V47c0-16 62-16 62 0v34" fill="#d9a082" />
          <path d="m40 88 80-1 1 41-82 1Z" fill={red} />
          <path d="M44 88c10-10 63-10 73 0l-4 23-65 1Z" fill={paper} />
          <path d="M31 76c-14 0-13 19-7 29l8 23 20 1-9-45c-2-6-6-8-12-8Z" fill="#c4876e" />
          <path d="M128 75c15 0 14 19 8 30l-7 22-21 1 9-44c2-6 6-9 11-9Z" fill="#c4876e" />
          <path d="m50 117 59-1M30 85l5 24m91-25-5 24m-58-65v22m33-22v22" strokeWidth="1.8" />
          <circle cx="65" cy="51" r="3" fill={red} strokeWidth="1.5" />
          <circle cx="95" cy="51" r="3" fill={red} strokeWidth="1.5" />
          <path d="m54 91 9-1m36-1 9 1" strokeWidth="1.6" />
        </>
      )
    case 'chair2':
      return (
        <>
          <path d="m45 122-3 20 12 1 9-20m37-1 8 21 11-2-4-21" fill={oak} />
          <path
            d="M36 85c-15-10-9-31 7-32-3-22 23-32 37-17 12-23 43-11 40 9 21-3 31 24 12 39Z"
            fill="#ccd9d3"
          />
          <path
            d="M45 84c-12-10-5-25 8-24-4-16 15-22 27-10 12-15 33-9 30 9 17-3 25 15 12 25Z"
            fill={paper}
          />
          <path d="m39 86 82-1 2 40-83 2Z" fill="#9cb2a9" />
          <path d="M43 86c10-9 65-9 75 0l-6 23-64 1Z" fill={paper} />
          <path d="M27 79c-15-1-15 21-8 27l14 20h22l-9-33C43 83 37 79 27 79Z" fill="#ccd9d3" />
          <path d="M132 78c16-1 17 19 8 27l-12 21-23 1 10-34c3-10 8-15 17-15Z" fill="#ccd9d3" />
          <path
            d="m53 117 55-1m-78-30 8 25m91-26-7 26m-58-45 4 2m22-2 4-1m-20 9 9 1"
            strokeWidth="1.8"
          />
        </>
      )
    case 'painting2':
      return (
        <g transform="rotate(4 80 80)">
          <path d="m33 18 89 2 5 121-91-2Z" fill={oak} />
          <path d="m33 18 7 8 82 2m0-8v115l5 6m-91-2 7-7 72 2" fill={honey} />
          <path d="m45 32 65 1 4 94-67-2Z" fill={paper} />
          <path d="m51 39 53 1 3 78-54-2Z" fill="#c6d3c4" strokeWidth="2" />
          <path d="m53 94 52 2 2 22-54-2Z" fill="#81a0a2" strokeWidth="1.6" />
          <path d="m54 116 21-22 31 24Z" fill={green} strokeWidth="1.6" />
          <path d="m76 99 4-39 15 1 5 42Z" fill={paper} strokeWidth="2" />
          <path d="m78 78 19 1-1-8-17-1Z" fill={red} strokeWidth="1.5" />
          <path d="m76 61 23 1-3-12-17-1Z" fill={red} strokeWidth="2" />
          <path d="m79 50 8-8 9 9m-9 2v7m-4 39v-8h8v10" strokeWidth="1.7" />
          <path d="m54 50 9 3m-8 52 11 1m-28-65 1 24m81 43v18" strokeWidth="1.5" />
        </g>
      )
    case 'painting':
      return (
        <g transform="rotate(-4 80 80)">
          <path d="m23 32 112 2 3 97-114-2Z" fill={oak} />
          <path d="m23 32 8 8 98 2m6-8v90l3 7m-114-2 8-7 97 2" fill={honey} />
          <path d="m36 47 86 1 2 67-87-2Z" fill={paper} />
          <path d="m42 53 74 1 2 55-75-2Z" fill="#cbd4ba" strokeWidth="2" />
          <circle cx="100" cy="66" r="8" fill={honey} strokeWidth="1.5" />
          <path d="m43 99 23-37 19 32 11-19 22 29v5l-75-2Z" fill={green} strokeWidth="2" />
          <path d="m58 75 8-13 10 17-10-5-5 4Z" fill={paper} strokeWidth="1.5" />
          <path d="m43 102 75 4m-88-55 1 18m97 25v15m-83 12 32 1" strokeWidth="1.6" />
        </g>
      )
    default:
      return (
        <>
          <path d="m34 52 76-9 23 19-1 72-75 11-24-20Z" fill={oak} />
          <path d="m34 52 23 22 76-12M57 74v71m-18-36 18 18 69-11M59 81l65 46m-64 5 63-56" />
          <path d="m75 86 24-4v18l-24 4Z" fill={paper} strokeWidth="2" />
        </>
      )
  }
}
