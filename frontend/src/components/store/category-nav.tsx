'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { StoreCategory } from '@/types/database'
import {
  Pencil,
  Code,
  Search,
  Briefcase,
  GraduationCap,
  Palette,
  Timer,
  Headphones,
  Megaphone,
  MoreHorizontal,
} from 'lucide-react'

// Map category slugs to icons
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  writing: Pencil,
  coding: Code,
  research: Search,
  business: Briefcase,
  education: GraduationCap,
  creative: Palette,
  productivity: Timer,
  'customer-support': Headphones,
  marketing: Megaphone,
  other: MoreHorizontal,
}

interface CategoryNavProps {
  categories: StoreCategory[]
  activeCategory?: string
}

export function CategoryNav({ categories, activeCategory }: CategoryNavProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/store"
        className={cn(
          'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
          !activeCategory
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
        )}
      >
        All
      </Link>
      {categories.map((category) => {
        const Icon = categoryIcons[category.slug] || MoreHorizontal
        const isActive = activeCategory === category.slug
        return (
          <Link
            key={category.id}
            href={`/store/category/${category.slug}`}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {category.name}
          </Link>
        )
      })}
    </div>
  )
}
