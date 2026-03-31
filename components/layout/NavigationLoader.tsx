'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useIsFetching } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

export function NavigationLoader() {
  const pathname        = usePathname()
  const [show, setShow] = useState(false)
  const isFetching      = useIsFetching()
  const didFetch        = useRef(false)
  const fallback        = useRef<ReturnType<typeof setTimeout> | null>(null)

  // On route change: show loader, reset state
  useEffect(() => {
    setShow(true)
    didFetch.current = false
    // If no queries fire within 500ms (e.g. cached data), hide anyway
    fallback.current = setTimeout(() => setShow(false), 500)
    return () => { if (fallback.current) clearTimeout(fallback.current) }
  }, [pathname])

  // Hide when fetching settles
  useEffect(() => {
    if (!show) return
    if (isFetching > 0) {
      didFetch.current = true
      if (fallback.current) clearTimeout(fallback.current)
    } else if (didFetch.current) {
      setShow(false)
    }
  }, [isFetching, show])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 bg-surface-1/60 backdrop-blur-sm flex items-center justify-center">
      <Loader2 size={22} className="animate-spin text-brand-300" />
    </div>
  )
}
