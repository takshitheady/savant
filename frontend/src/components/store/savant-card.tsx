'use client'

import Link from 'next/link'
import { Star, Download, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StoreListingSearchResult } from '@/types/database'

interface SavantCardProps {
  listing: StoreListingSearchResult
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
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {listing.category_name}
        </span>
      </div>

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
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span>{listing.average_rating?.toFixed(1) || '0.0'}</span>
          {listing.review_count > 0 && (
            <span className="text-xs">({listing.review_count})</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Download className="h-4 w-4" />
          <span>{listing.import_count || 0}</span>
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
