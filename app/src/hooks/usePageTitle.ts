import { useEffect } from 'react'

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title
      ? `${title} — Verifica Cidadão`
      : 'Verifica Cidadão — Antes de acreditar. Antes de compartilhar. Verifique.'
  }, [title])
}
