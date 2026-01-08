'use client'

import { Bot, FileText, Store, Mic2 } from 'lucide-react'
import { FEATURE_CARDS } from '../tour-steps'

const iconMap = {
  Bot,
  FileText,
  Store,
  Mic2,
}

export function FeaturesStep() {
  return (
    <div className="py-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-2">
          Everything you need to build AI assistants
        </h2>
        <p className="text-muted-foreground">
          Powerful features to help you create, train, and deploy
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {FEATURE_CARDS.map((card) => {
          const Icon = iconMap[card.icon as keyof typeof iconMap]
          return (
            <div
              key={card.title}
              className="flex flex-col gap-3 rounded-xl bg-muted/50 p-5 transition-colors hover:bg-muted"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">{card.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {card.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
