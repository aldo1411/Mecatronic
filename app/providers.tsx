'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { ToastContainer } from '@/components/shared/Toast'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
      mutations: {
        onError: (error: unknown) => {
          import('@/components/shared/Toast').then(({ toast }) => {
            const msg = error instanceof Error
              ? error.message
              : (typeof error === 'object' && error !== null && 'message' in error)
                ? String((error as { message: unknown }).message)
                : 'Error inesperado'
            toast.error('Error', msg)
          })
        },
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastContainer />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
