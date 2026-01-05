'use client'

import Link from 'next/link'
import { Download, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImportedBadgeProps {
  originalSavantId: string
  creatorName?: string
  className?: string
}

export function ImportedBadge({ originalSavantId, creatorName, className }: ImportedBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs text-blue-700',
        className
      )}
    >
      <Download className="h-3 w-3" />
      <span>
        Imported from Store
        {creatorName && (
          <span className="text-blue-500"> by {creatorName}</span>
        )}
      </span>
      <Link
        href={`/store/savant/${originalSavantId}`}
        className="hover:text-blue-900"
        title="View original in store"
      >
        <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  )
}
