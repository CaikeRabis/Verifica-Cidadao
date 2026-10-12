import { useCallback, useRef, useState } from 'react'
import { verifyInformation } from '../services/verificationService'
import type { Classification, VerificationResult, VerifyStatus } from '../types'

export function useVerification() {
  const [status, setStatus] = useState<VerifyStatus>('idle')
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [lastQuery, setLastQuery] = useState('')
  const runId = useRef(0)

  const verify = useCallback(async (query: string, forced?: Classification) => {
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
      const res = await verifyInformation(text, forced)
      if (id !== runId.current) return
      setResult(res)
      setStatus('success')
    } catch {
      if (id !== runId.current) return
      setStatus('error')
    }
  }, [])

  const reset = useCallback(() => {
    runId.current++
    setStatus('idle')
    setResult(null)
  }, [])

  return { status, result, lastQuery, verify, reset }
}
