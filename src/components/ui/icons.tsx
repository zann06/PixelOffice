import type { SVGProps } from 'react'

/** Small original stroke icons (16px grid). Decorative: callers pass aria-hidden. */
function base(props: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> {
  return {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: false,
    ...props,
  }
}

export const IconHome = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M2.5 7.5 8 2.5l5.5 5" /><path d="M4 7v6.5h8V7" /></svg>
)
export const IconTasks = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M2.5 4.5h2M2.5 8h2M2.5 11.5h2" /><path d="M6.5 4.5h7M6.5 8h7M6.5 11.5h7" /></svg>
)
export const IconMeeting = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="2.5" y="3.5" width="11" height="10" rx="1" /><path d="M2.5 6.5h11M5.5 2v2M10.5 2v2" /></svg>
)
export const IconUsers = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="5.5" cy="5.5" r="2" /><path d="M2 13c.5-2.2 1.8-3.5 3.5-3.5S8.5 10.8 9 13" /><circle cx="11" cy="6" r="1.6" /><path d="M10.5 9.6c1.7.2 3 1.4 3.5 3.4" /></svg>
)
export const IconSettings = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="8" cy="8" r="2.2" /><path d="M8 1.8v2M8 12.2v2M1.8 8h2M12.2 8h2M3.6 3.6l1.4 1.4M11 11l1.4 1.4M12.4 3.6 11 5M5 11l-1.4 1.4" /></svg>
)
export const IconSearch = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="7" cy="7" r="4" /><path d="m10.5 10.5 3 3" /></svg>
)
export const IconPlus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M8 3v10M3 8h10" /></svg>
)
export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m4 4 8 8M12 4l-8 8" /></svg>
)
export const IconAlert = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M8 2.5 14.5 13H1.5L8 2.5Z" /><path d="M8 6.5v3M8 11.4v.2" /></svg>
)
export const IconClock = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3.2l2 1.3" /></svg>
)
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m3 8.5 3.5 3.5L13 5" /></svg>
)
export const IconDownload = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M8 2.5v7M5 6.5 8 9.5l3-3" /><path d="M2.5 12.5h11" /></svg>
)
export const IconPause = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5.5 3v10M10.5 3v10" /></svg>
)
export const IconPlay = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M5 3.5v9l7-4.5-7-4.5Z" /></svg>
)
export const IconMenu = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" /></svg>
)
export const IconLink = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6.5 9.5 9.5 6.5" /><path d="M7 4.5 8.6 2.9a2.6 2.6 0 0 1 3.7 3.7L10.7 8.2" /><path d="M9 11.5 7.4 13.1a2.6 2.6 0 0 1-3.7-3.7L5.3 7.8" /></svg>
)
export const IconSignOut = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 2.5H3.5v11H6" /><path d="M10 5.5 13 8l-3 2.5" /><path d="M13 8H6.5" /></svg>
)
export const IconExpand = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6.5 2.5h-4v4M9.5 2.5h4v4M6.5 13.5h-4v-4M9.5 13.5h4v-4" /><path d="M2.5 6.5 6 3M13.5 6.5 10 3M2.5 9.5 6 13M13.5 9.5 10 13" /></svg>
)
export const IconCollapse = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M2.5 6.5h4v-4M13.5 6.5h-4v-4M2.5 9.5h4v4M13.5 9.5h-4v4" /><path d="M6.5 6.5 3 3M9.5 6.5 13 3M6.5 9.5 3 13M9.5 9.5 13 13" /></svg>
)
export const IconSun = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="8" cy="8" r="3" /><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M12.6 3.4l-1 1M4.4 11.6l-1 1" /></svg>
)
export const IconMoon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12.8 9.6A5.2 5.2 0 0 1 6.4 3.2a5.4 5.4 0 1 0 6.4 6.4Z" /></svg>
)
export const IconGrid = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" /><rect x="9" y="2.5" width="4.5" height="4.5" rx="1" /><rect x="2.5" y="9" width="4.5" height="4.5" rx="1" /><rect x="9" y="9" width="4.5" height="4.5" rx="1" /></svg>
)
export const IconList = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M2.5 4.5h1M2.5 8h1M2.5 11.5h1" /><path d="M6 4.5h7.5M6 8h7.5M6 11.5h7.5" /></svg>
)
export const IconPin = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M8 2.5c2 0 3.5 1.5 3.5 3.4 0 2.6-3.5 7.6-3.5 7.6S4.5 8.5 4.5 5.9C4.5 4 6 2.5 8 2.5Z" /><circle cx="8" cy="6" r="1.2" /></svg>
)

/** PixelOffice logo — original pixel building mark (navy on light surfaces). */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden focusable={false}>
      <rect x="2" y="6" width="12" height="8" fill="#2e3a52" />
      <rect x="4" y="3" width="8" height="3" fill="#1f2940" />
      <rect x="6" y="1" width="4" height="2" fill="#7fc4ff" />
      <rect x="4" y="8" width="2" height="2" fill="#f4efe2" />
      <rect x="10" y="8" width="2" height="2" fill="#f4efe2" />
      <rect x="4" y="11" width="2" height="2" fill="#f4efe2" />
      <rect x="10" y="11" width="2" height="2" fill="#f4efe2" />
      <rect x="7" y="10" width="2" height="4" fill="#1d9e74" />
    </svg>
  )
}
