'use client'

import { useState } from 'react'
import { VOICE_DIMENSIONS, type VoiceDimensionValues, type VoiceDimensionChoice } from '@/types/brand-voice'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface VoiceDimensionsProps {
  values: VoiceDimensionValues
  onChange: (values: VoiceDimensionValues) => void
  disabled?: boolean
}

export function VoiceDimensions({ values, onChange, disabled }: VoiceDimensionsProps) {
  const [expandedNote, setExpandedNote] = useState<string | null>(null)

  const handleDimensionChange = (dimensionId: string, choice: VoiceDimensionChoice) => {
    const currentValue = values[dimensionId as keyof VoiceDimensionValues]
    // Toggle off if clicking the same choice
    const newChoice = currentValue === choice ? 'neither' : choice
    onChange({
      ...values,
      [dimensionId]: newChoice,
    })
  }

  const handleNoteChange = (dimensionId: string, note: string) => {
    onChange({
      ...values,
      dimensionNotes: {
        ...values.dimensionNotes,
        [dimensionId]: note,
      },
    })
  }

  return (
    <div className="space-y-4">
      {VOICE_DIMENSIONS.map((dimension) => {
        const currentValue = values[dimension.id as keyof VoiceDimensionValues] as VoiceDimensionChoice | undefined
        const note = values.dimensionNotes?.[dimension.id] || ''
        const isNoteExpanded = expandedNote === dimension.id

        return (
          <div key={dimension.id} className="space-y-2">
            <div className="flex items-center gap-3">
              {/* Option A */}
              <button
                type="button"
                onClick={() => handleDimensionChange(dimension.id, 'a')}
                disabled={disabled}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                  "hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary",
                  currentValue === 'a'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <div>{dimension.labelA}</div>
                <div className="text-xs opacity-70 font-normal">{dimension.descriptionA}</div>
              </button>

              {/* Divider / Neither indicator */}
              <div className="w-8 flex justify-center">
                <div className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  currentValue === 'neither' || !currentValue
                    ? "bg-muted-foreground/50"
                    : "bg-muted"
                )} />
              </div>

              {/* Option B */}
              <button
                type="button"
                onClick={() => handleDimensionChange(dimension.id, 'b')}
                disabled={disabled}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                  "hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary",
                  currentValue === 'b'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <div>{dimension.labelB}</div>
                <div className="text-xs opacity-70 font-normal">{dimension.descriptionB}</div>
              </button>

              {/* Note toggle */}
              <button
                type="button"
                onClick={() => setExpandedNote(isNoteExpanded ? null : dimension.id)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                title={isNoteExpanded ? "Hide note" : "Add note"}
              >
                {isNoteExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Note field */}
            {isNoteExpanded && (
              <input
                type="text"
                value={note}
                onChange={(e) => handleNoteChange(dimension.id, e.target.value)}
                placeholder="Add a note about this preference..."
                disabled={disabled}
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-lg",
                  "bg-muted/50 border border-border",
                  "placeholder:text-muted-foreground/50",
                  "focus:outline-none focus:ring-2 focus:ring-primary",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              />
            )}
          </div>
        )
      })}

      <p className="text-xs text-muted-foreground text-center pt-2">
        Select the style that best matches your brand, or leave neutral if neither applies
      </p>
    </div>
  )
}
