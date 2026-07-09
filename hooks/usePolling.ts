// hooks/usePolling.ts
// Polls a data-fetching function every N milliseconds and returns live data

import { useState, useEffect, useCallback, useRef } from 'react'

export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number = 5000,
  immediate: boolean = true,
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  const fetch = useCallback(async () => {
    try {
      const result = await fetcher()
      if (mountedRef.current) {
        setData(result)
        setError(null)
        setLoading(false)
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      }
    }
  }, [fetcher])

  useEffect(() => {
    mountedRef.current = true
    const initialTimer = immediate ? setTimeout(fetch, 0) : undefined
    timerRef.current = setInterval(fetch, intervalMs)
    return () => {
      mountedRef.current = false
      clearTimeout(initialTimer)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [fetch, intervalMs, immediate])

  return { data, loading, error, refetch: fetch }
}
