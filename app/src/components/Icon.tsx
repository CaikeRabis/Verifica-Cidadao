import type { SVGProps } from 'react'

export type IconName =
  | 'search'
  | 'check'
  | 'alert'
  | 'question'
  | 'x'
  | 'doc'
  | 'shield'
  | 'arrow'
  | 'external'
  | 'menu'
  | 'close'
  | 'book'
  | 'share'
  | 'calendar'
  | 'bulb'
  | 'users'
  | 'clock'
  | 'youtube'
  | 'instagram'
  | 'twitter'
  | 'flask'
  | 'info'

const paths: Record<IconName, React.ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.8-3.8" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  alert: (
    <>
      <path d="M12 6v7" />
      <circle cx="12" cy="17.5" r="0.6" fill="currentColor" />
    </>
  ),
  question: (
    <>
      <path d="M9.2 9.2a3 3 0 1 1 4.3 2.7c-.9.5-1.5 1.1-1.5 2.1" />
      <circle cx="12" cy="17.5" r="0.6" fill="currentColor" />
    </>
  ),
  x: <path d="m6.5 6.5 11 11m0-11-11 11" />,
  doc: (
    <>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4M10 12h5M10 15.5h5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5.5c0 4.3 2.8 7.8 7 9.5 4.2-1.700 7-5.200 7-9.500V6z" />
      <path d="m9 12 2.200 2.200L15.200 10" />
    </>
  ),
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  external: (
    <>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 14v5H5V6h5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12m0-12L6 18" />,
  book: (
    <>
      <path d="M4 5.500C6.500 4.500 9.500 4.500 12 6c2.500-1.500 5.500-1.500 8-.5V19c-2.500-1-5.500-1-8 .5-2.500-1.500-5.500-1.500-8-.5z" />
      <path d="M12 6v13.500" />
    </>
  ),
  share: (
    <>
      <circle cx="6" cy="12" r="2.500" />
      <circle cx="17" cy="6" r="2.500" />
      <circle cx="17" cy="18" r="2.500" />
      <path d="m8.200 10.800 6.600-3.600m-6.600 5.600 6.600 3.600" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.500" width="16" height="14.500" rx="3" />
      <path d="M4 10h16M8.500 3.500v4M15.500 3.500v4" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.500 10.900c.6.5 1 1.200 1 2.100h5c0-.9.4-1.600 1-2.100A6 6 0 0 0 12 3z" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.500 19c.5-3 2.700-4.500 5.500-4.500s5 1.500 5.500 4.500" />
      <circle cx="17" cy="9.500" r="2.300" />
      <path d="M16.500 14.500c2.300 0 3.600 1.300 4 3.500" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.500" />
      <path d="M12 7.500V12l3 2" />
    </>
  ),
  youtube: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="4" />
      <path d="m10.500 9.500 4 2.500-4 2.500z" fill="currentColor" />
    </>
  ),
  instagram: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="5" />
      <circle cx="12" cy="12" r="3.600" />
      <circle cx="16.800" cy="7.200" r="0.700" fill="currentColor" />
    </>
  ),
  twitter: <path d="m5 4 14 16M19 4 5 20" />,
  flask: (
    <>
      <path d="M9.500 3.500h5M10.500 3.500v6L5 19a1.500 1.500 0 0 0 1.300 2.200h11.400A1.500 1.500 0 0 0 19 19l-5.500-9.500v-6" />
      <path d="M7.500 15h9" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.500" />
      <path d="M12 11v5.500" />
      <circle cx="12" cy="7.800" r="0.600" fill="currentColor" />
    </>
  ),
}

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
}

/** Ícones simples de traço, no estilo limpo da marca. Decorativos por padrão. */
export default function Icon({ name, size = 22, ...rest }: IconProps) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  )
}
