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
  const timerRef = useRef<NodeJS.Timeout>()
  const mountedRef = useRef(true)

  const fetch = useCallback(async () => {
    try {
      const result = await fetcher()
      if (mountedRef.current) {
        setData(result)
        setError(null)
        setLoading(false)
      }
    } catch (e: any) {
      if (mountedRef.current) {
        setError(e.message)
        setLoading(false)
      }
    }
  }, [fetcher])

  useEffect(() => {
    mountedRef.current = true
    if (immediate) fetch()
    timerRef.current = setInterval(fetch, intervalMs)
    return () => {
      mountedRef.current = false
      clearInterval(timerRef.current)
    }
  }, [fetch, intervalMs, immediate])

  return { data, loading, error, refetch: fetch }
}
