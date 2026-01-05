'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StoreSearchProps {
  defaultValue?: string
  className?: string
}

export function StoreSearch({ defaultValue = '', className }: StoreSearchProps) {
  const [query, setQuery] = useState(defaultValue)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSearch = (value: string) => {
    setQuery(value)
    startTransition(() => {
      if (value.trim()) {
        router.push(`/store/search?q=${encodeURIComponent(value.trim())}`)
      } else {
        router.push('/store')
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(query)
  }

  const handleClear = () => {
    setQuery('')
    router.push('/store')
  }

  return (
    <form onSubmit={handleSubmit} className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search savants..."
        className={cn(
          'w-full rounded-full border border-border bg-background py-2.5 pl-10 pr-10 text-sm',
          'placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
          isPending && 'opacity-70'
        )}
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  )
}
