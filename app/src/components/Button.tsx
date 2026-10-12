import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Variant = 'primary' | 'outline' | 'ghost'

interface Common {
  variant?: Variant
  small?: boolean
  children: ReactNode
  className?: string
}

type ButtonProps = Common & ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined }
type LinkProps = Common & { to: string; onClick?: () => void; id?: string }

const classes = (v: Variant, small?: boolean, extra?: string) =>
  ['btn', `btn--${v}`, small ? 'btn--sm' : '', extra ?? ''].filter(Boolean).join(' ')

export default function Button(props: ButtonProps | LinkProps) {
  const { variant = 'primary', small, children, className } = props
  if (props.to !== undefined) {
    return (
      <Link to={props.to} id={props.id} onClick={props.onClick} className={classes(variant, small, className)}>
        {children}
      </Link>
    )
  }
  const { variant: _v, small: _s, children: _c, className: _cn, to: _t, ...rest } = props
  void _v; void _s; void _c; void _cn; void _t
  return (
    <button type="button" className={classes(variant, small, className)} {...rest}>
      {children}
    </button>
  )
}
