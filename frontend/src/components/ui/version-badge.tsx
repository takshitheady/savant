import { cn } from '@/lib/utils'

interface VersionBadgeProps {
  version: number
  variant?: 'default' | 'update-available'
  className?: string
}

export function VersionBadge({ version, variant = 'default', className }: VersionBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variant === 'default' && 'bg-primary/10 text-primary',
        variant === 'update-available' && 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
        className
      )}
    >
      v{version}
    </span>
  )
}
