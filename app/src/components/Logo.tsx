import { Link } from 'react-router-dom'

interface Props {
  variant?: 'horizontal' | 'full' | 'symbol'
  height?: number
}

const files = {
  horizontal: '/brand/logo-horizontal.png',
  full: '/brand/logo-completo.png',
  symbol: '/brand/simbolo.png',
}

/** Logotipo oficial (extraído do Manual da Marca). Respeita proporção original. */
export default function Logo({ variant = 'horizontal' }: Props) {
  return (
    <Link to="/" className="logo" aria-label="Verifica Cidadão — página inicial">
      <img src={files[variant]} alt="Verifica Cidadão" />
    </Link>
  )
}
