'use client'

import Link from 'next/link'
import { Download, Bot, ArrowUpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StoreListingSearchResult } from '@/types/database'
import { VersionBadge } from '@/components/ui/version-badge'

interface SavantCardProps {
  listing: StoreListingSearchResult & {
    template_version?: number
    user_current_version?: number
    has_update?: boolean
  }
  className?: string
}

export function SavantCard({ listing, className }: SavantCardProps) {
  return (
    <Link
      href={`/store/savant/${listing.savant_id}`}
      className={cn(
        'group flex flex-col rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-lg',
        className
      )}
    >
      {/* Icon and Category */}
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Bot className="h-6 w-6" />
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {listing.category_name}
          </span>
          {listing.template_version && (
            <VersionBadge version={listing.template_version} />
          )}
        </div>
      </div>

      {/* Update Available Badge */}
      {listing.has_update && listing.template_version && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-orange-500/10 px-3 py-2 text-sm">
          <ArrowUpCircle className="h-4 w-4 text-orange-600" />
          <span className="font-medium text-orange-600">
            New version available: v{listing.template_version}
          </span>
        </div>
      )}

      {/* Name and Description */}
      <div className="mt-4 flex-1">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
          {listing.savant_name}
        </h3>
        {listing.tagline && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {listing.tagline}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="mt-4 flex items-center justify-end text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Download className="h-4 w-4" />
          <span>{listing.import_count || 0} imports</span>
        </div>
      </div>

      {/* Creator */}
      {listing.creator_display_name && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            by <span className="font-medium">{listing.creator_display_name}</span>
          </p>
        </div>
      )}
    </Link>
  )
}
