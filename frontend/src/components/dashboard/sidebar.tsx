'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Bot,
  Settings,
  Mic2,
  LayoutDashboard,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Store,
  BarChart3,
} from 'lucide-react'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    tourId: 'sidebar-dashboard',
  },
  {
    name: 'Savants',
    href: '/savants',
    icon: Bot,
    tourId: 'sidebar-savants',
  },
  {
    name: 'Official Savants',
    href: '/store',
    icon: Store,
    tourId: 'sidebar-store',
  },
  {
    name: 'Creator',
    href: '/creator-dashboard',
    icon: BarChart3,
    tourId: 'sidebar-creator',
  },
  {
    name: 'Your Voice',
    href: '/prompts',
    icon: Mic2,
    tourId: 'sidebar-voice',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    tourId: 'sidebar-settings',
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div
      className={cn(
        'relative flex h-full flex-col bg-background transition-all duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex h-16 items-center',
        collapsed ? 'justify-center px-2' : 'px-5'
      )}>
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Savant
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 py-4', collapsed ? 'px-2' : 'px-3')}>
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                title={collapsed ? item.name : undefined}
                data-tour={item.tourId}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
                {!collapsed && item.name}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className={cn(
          'absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md hover:bg-muted',
          'border border-border/50 text-muted-foreground hover:text-foreground transition-colors'
        )}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-4">
          <div className="rounded-xl bg-muted/50 px-3 py-2.5">
            <p className="text-xs font-medium text-foreground">Savant AI</p>
            <p className="text-xs text-muted-foreground">
              Built for developers
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
