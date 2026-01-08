'use client'

import { Rocket, ArrowRight } from 'lucide-react'

export function ReadyStep() {
  return (
    <div className="flex flex-col items-center text-center py-8">
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 mb-6">
        <Rocket className="h-8 w-8 text-primary-foreground" />
      </div>

      {/* Ready Text */}
      <h2 className="text-2xl font-bold tracking-tight mb-3">
        You're all set!
      </h2>
      <p className="text-muted-foreground max-w-sm mb-6">
        Let's take a quick tour to show you around. It only takes a minute.
      </p>

      {/* Tour Preview */}
      <div className="w-full max-w-sm rounded-xl bg-muted/50 p-4 mb-4">
        <div className="flex items-center gap-3 text-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            7
          </div>
          <div className="text-left">
            <p className="font-medium">Quick 7-step tour</p>
            <p className="text-xs text-muted-foreground">
              Learn the essentials in under a minute
            </p>
          </div>
          <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        You can always restart the tour from Settings
      </p>
    </div>
  )
}
