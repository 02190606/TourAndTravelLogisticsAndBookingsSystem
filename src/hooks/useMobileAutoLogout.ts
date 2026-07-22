import { useEffect, useRef, useCallback } from 'react'

const INACTIVITY_TIMEOUT = 10 * 60 * 1000
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const

function isMobileDevice(): boolean {
  const hasSmallScreen = window.innerWidth < 768
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const ua = navigator.userAgent.toLowerCase()
  const mobileUA = /android|iphone|ipad|ipod|mobile|webos|blackberry|opera mini|iemobile/i.test(ua)
  return (hasSmallScreen && hasTouch) || mobileUA
}

export function useMobileAutoLogout(onLogout: () => void) {
  const lastActivityRef = useRef<number>(Date.now())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isVisibleRef = useRef<boolean>(document.visibilityState === 'visible')
  const bgTimeRef = useRef<number>(0)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    clearTimer()
    timerRef.current = setTimeout(() => {
      onLogout()
    }, INACTIVITY_TIMEOUT)
  }, [clearTimer, onLogout])

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
    if (isVisibleRef.current) {
      startTimer()
    }
  }, [startTimer])

  useEffect(() => {
    if (!isMobileDevice()) return

    startTimer()

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true })
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        isVisibleRef.current = true
        const elapsed = Date.now() - bgTimeRef.current
        if (bgTimeRef.current > 0 && elapsed >= INACTIVITY_TIMEOUT) {
          onLogout()
          return
        }
        startTimer()
      } else {
        isVisibleRef.current = false
        bgTimeRef.current = Date.now()
        clearTimer()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearTimer()
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer)
      }
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [onLogout, resetTimer, startTimer, clearTimer])
}
