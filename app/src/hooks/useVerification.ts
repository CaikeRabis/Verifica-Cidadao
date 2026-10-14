import { useCallback, useRef, useState } from 'react'
import {
  verifyInformation,
  SourceUnavailableError,
  UnsupportedFormatError,
} from '../services/verificationService'
import type { Classification, VerificationResult, VerifyStatus } from '../types'

export function useVerification() {
  const [status, setStatus] = useState<VerifyStatus>('idle')
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [lastQuery, setLastQuery] = useState('')
  const [unavailableSourceName, setUnavailableSourceName] = useState('Portal da Transparência')
  const runId = useRef(0)

  const verify = useCallback(async (query: string, forced?: Classification, inputType: 'text' | 'url' = 'text') => {
    const text = query.trim()
    if (!text) {
      setStatus('empty')
      setResult(null)
      return
    }
    const id = ++runId.current
    setLastQuery(text)
    setStatus('loading')
    setResult(null)
    try {
      const res = await verifyInformation(text, forced, inputType)
      if (id !== runId.current) return
      setResult(res)
      setStatus('success')
    } catch (err) {
      if (id !== runId.current) return
      if (err instanceof SourceUnavailableError) {
        setUnavailableSourceName(err.sourceName)
        setStatus('source-unavailable')
      } else if (err instanceof UnsupportedFormatError) {
        setStatus('unsupported-format')
      } else {
        setStatus('error')
      }
    }
  }, [])

  const reset = useCallback(() => {
    runId.current++
    setStatus('idle')
    setResult(null)
  }, [])

  return { status, result, lastQuery, unavailableSourceName, verify, reset }
}
