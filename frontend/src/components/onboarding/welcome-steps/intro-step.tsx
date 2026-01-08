'use client'

import { Sparkles } from 'lucide-react'

export function IntroStep() {
  return (
    <div className="flex flex-col items-center text-center py-8">
      {/* Animated Logo */}
      <div className="relative mb-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary animate-pulse">
          <Sparkles className="h-10 w-10 text-primary-foreground" />
        </div>
        {/* Decorative rings */}
        <div className="absolute inset-0 -m-2 rounded-3xl border-2 border-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute inset-0 -m-4 rounded-3xl border border-primary/10" />
      </div>

      {/* Welcome Text */}
      <h2 className="text-3xl font-bold tracking-tight mb-3">
        Welcome to Savant
      </h2>
      <p className="text-lg text-muted-foreground max-w-md">
        Build powerful AI assistants trained on your documents in minutes, not months.
      </p>

      {/* Value Props */}
      <div className="mt-8 flex gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span>No coding required</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span>Multiple AI models</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span>Your data stays private</span>
        </div>
      </div>
    </div>
  )
}
