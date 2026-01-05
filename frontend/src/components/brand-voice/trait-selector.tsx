'use client'

import { PERSONALITY_TRAITS, type PersonalityTraitId } from '@/types/brand-voice'
import { cn } from '@/lib/utils'

interface TraitSelectorProps {
  selectedTraits: PersonalityTraitId[]
  onTraitsChange: (traits: PersonalityTraitId[]) => void
  disabled?: boolean
}

export function TraitSelector({ selectedTraits, onTraitsChange, disabled }: TraitSelectorProps) {
  const toggleTrait = (traitId: PersonalityTraitId) => {
    if (disabled) return

    if (selectedTraits.includes(traitId)) {
      onTraitsChange(selectedTraits.filter(t => t !== traitId))
    } else {
      onTraitsChange([...selectedTraits, traitId])
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {PERSONALITY_TRAITS.map((trait) => {
        const isSelected = selectedTraits.includes(trait.id)
        return (
          <button
            key={trait.id}
            type="button"
            onClick={() => toggleTrait(trait.id)}
            disabled={disabled}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
              "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary",
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className="font-medium text-sm">{trait.label}</span>
            <span className="text-xs mt-1 text-center opacity-70">{trait.description}</span>
          </button>
        )
      })}
    </div>
  )
}
